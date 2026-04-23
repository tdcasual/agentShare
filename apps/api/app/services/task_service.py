from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.auth import ensure_task_type_allowed
from app.config import Settings
from app.errors import AuthorizationError, BadRequestError, ConflictError, NotFoundError
from app.models.runtime_principal import RuntimePrincipal
from app.orm.approval_request import ApprovalRequestModel
from app.orm.run import RunModel
from app.orm.task import TaskModel
from app.orm.task_target import TaskTargetModel
from app.repositories.access_token_repo import AccessTokenRepository
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.repositories.playbook_repo import PlaybookRepository
from app.repositories.run_repo import RunRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.task_target_repo import TaskTargetRepository
from app.schemas.tasks import TaskCreate
from app.observability import record_task_claim, record_task_completion
from app.services.identifiers import new_resource_id
from app.services.redis_client import acquire_lock, release_lock
from app.services.review_service import publication_status_for_actor


def create_task(session: Session, payload: TaskCreate, *, actor=None) -> dict:
    if actor is None:
        actor = type("SystemActor", (), {"actor_type": "human", "id": "system", "token_id": None})()
    _ensure_actor_can_submit_task(session, payload, actor=actor)
    _ensure_playbooks_exist(session, payload.playbook_ids)
    repo = TaskRepository(session)
    task_id = new_resource_id("task")
    model = TaskModel(
        id=task_id,
        title=payload.title,
        task_type=payload.task_type,
        input=payload.input,
        required_capability_ids=payload.required_capability_ids,
        playbook_ids=payload.playbook_ids,
        lease_allowed=payload.lease_allowed,
        approval_mode=payload.approval_mode,
        approval_rules=[rule.model_dump() for rule in payload.approval_rules],
        priority=payload.priority,
        target_mode=payload.target_mode,
        target_access_token_ids=payload.target_access_token_ids,
        created_by=actor.actor_type,
        created_by_actor_type=actor.actor_type,
        created_by_actor_id=actor.id,
        created_via_token_id=getattr(actor, "token_id", None),
        publication_status=publication_status_for_actor(actor.actor_type),
    )
    repo.create(model)
    targets = _create_task_targets(session, model, payload) if model.publication_status == "active" else []
    return _task_to_dict(model, targets=targets)


def list_tasks(session: Session, *, actor=None, limit: int = 100, offset: int = 0) -> list[dict]:
    target_repo = TaskTargetRepository(session)
    if _uses_access_token_assignments(actor):
        items: list[dict] = []
        for target in target_repo.list_assigned(actor.token_id):
            if target.status == "completed":
                continue
            task = TaskRepository(session).get(target.task_id)
            if task is None or task.publication_status != "active":
                continue
            items.append(_task_to_dict(task, targets=[target]))
        return items[offset: offset + limit]

    return [
        _task_to_dict(model, targets=target_repo.list_by_task(model.id))
        for model in TaskRepository(session).list_active(limit=limit, offset=offset)
    ]


def list_assigned_task_targets(session: Session, agent: RuntimePrincipal) -> list[dict]:
    if not agent.token_id or not _uses_access_token_assignments(agent):
        return []
    task_repo = TaskRepository(session)
    target_repo = TaskTargetRepository(session)
    items: list[dict] = []
    for target in target_repo.list_assigned(agent.token_id):
        task = task_repo.get(target.task_id)
        if task is None or task.publication_status != "active" or target.status == "completed":
            continue
        items.append(_task_target_to_dict(target, task))
    return items


def claim_task(
    session: Session,
    task_id: str,
    agent: RuntimePrincipal,
    settings: Settings | None = None,
) -> dict:
    if _uses_access_token_assignments(agent):
        target_repo = TaskTargetRepository(session)
        target = target_repo.find_by_task_and_access_token(task_id, agent.token_id)
        if target is not None:
            claimed = claim_task_target(session, target.id, agent, settings=settings)
            task = TaskRepository(session).get(task_id)
            return _task_response_for_target_transition(task, claimed)
        if target_repo.list_by_task(task_id):
            raise AuthorizationError("Task is not assigned to this token")
        raise NotFoundError("Task not found")
    lock_key = f"task:{task_id}:claim"
    lock_token = acquire_lock(lock_key, ttl_seconds=10, settings=settings)
    if not lock_token:
        raise ConflictError("Task claim is being processed by another agent")
    try:
        repo = TaskRepository(session)
        task = repo.get(task_id)
        if task is None:
            raise NotFoundError("Task not found")
        if not _uses_access_token_assignments(agent) and task.target_mode == "explicit_access_tokens":
            raise AuthorizationError("Task is not assigned to this token")
        if task.publication_status != "active":
            raise ConflictError("Task is not claimable")
        if task.status != "pending":
            raise ConflictError("Task is not claimable")
        try:
            ensure_task_type_allowed(agent, task.task_type)
        except PermissionError as exc:
            raise AuthorizationError(str(exc)) from exc
        task.status = "claimed"
        task.claimed_by = agent.id
        repo.update(task)
        record_task_claim()
        return _task_to_dict(task)
    finally:
        release_lock(lock_key, lock_token, settings=settings)


def complete_task(
    session: Session,
    task_id: str,
    agent: RuntimePrincipal,
    result_summary: str,
    output_payload: dict,
    settings: Settings | None = None,
) -> dict:
    if _uses_access_token_assignments(agent):
        target_repo = TaskTargetRepository(session)
        target = target_repo.find_by_task_and_access_token(task_id, agent.token_id)
        if target is not None:
            completed = complete_task_target(
                session,
                target.id,
                agent,
                result_summary,
                output_payload,
                settings=settings,
            )
            task = TaskRepository(session).get(task_id)
            return _task_response_for_target_transition(task, completed)
        if target_repo.list_by_task(task_id):
            raise AuthorizationError("Task is not assigned to this token")
        raise NotFoundError("Task not found")
    lock_key = f"task:{task_id}:complete"
    lock_token = acquire_lock(lock_key, ttl_seconds=10, settings=settings)
    if not lock_token:
        raise ConflictError("Task completion is being processed by another agent")
    task_repo = TaskRepository(session)
    run_repo = RunRepository(session)
    try:
        task = task_repo.get(task_id)
        if task is None:
            raise NotFoundError("Task not found")
        if task.target_mode == "explicit_access_tokens":
            raise AuthorizationError("Task is not assigned to this token")
        if task.status != "claimed":
            raise ConflictError("Task is not claimed")
        if task.claimed_by != agent.id:
            raise AuthorizationError("Task is not claimed by this agent")
        task.status = "completed"
        task_repo.update(task)
        _expire_task_approvals(
            session,
            task_id,
            agent_id=agent.id,
            token_id=agent.token_id,
            task_target_id=None,
        )
        run_id = new_resource_id("run")
        run = RunModel(
            id=run_id,
            task_id=task_id,
            agent_id=agent.id,
            access_token_id=agent.token_id,
            task_target_id=None,
            status="completed",
            result_summary=result_summary,
            output_payload=output_payload,
        )
        run_repo.create(run)
        record_task_completion()
        return _task_to_dict(task)
    finally:
        release_lock(lock_key, lock_token, settings=settings)


def claim_task_target(
    session: Session,
    target_id: str,
    agent: RuntimePrincipal,
    settings: Settings | None = None,
) -> dict:
    lock_key = f"task-target:{target_id}:claim"
    lock_token = acquire_lock(lock_key, ttl_seconds=10, settings=settings)
    if not lock_token:
        raise ConflictError("Task claim is being processed by another agent")
    try:
        if not agent.token_id:
            raise AuthorizationError("Remote access token is required")
        target_repo = TaskTargetRepository(session)
        target = target_repo.get(target_id)
        if target is None:
            raise NotFoundError("Task target not found")
        if target.target_access_token_id != agent.token_id:
            raise AuthorizationError("Task target is not assigned to this token")
        if target.status != "pending":
            raise ConflictError("Task target is not claimable")

        task_repo = TaskRepository(session)
        task = task_repo.get(target.task_id)
        if task is None:
            raise NotFoundError("Task not found")
        if task.publication_status != "active":
            raise ConflictError("Task target is not claimable")
        try:
            ensure_task_type_allowed(agent, task.task_type)
        except PermissionError as exc:
            raise AuthorizationError(str(exc)) from exc

        target.status = "claimed"
        target.claimed_by_access_token_id = agent.token_id
        target.claimed_by_agent_id = agent.id
        target.claimed_at = datetime.now(timezone.utc)
        target_repo.update(target)
        _sync_task_under_lock(task, target_repo, task_repo, settings)
        record_task_claim()
        return _task_target_to_dict(target, task)
    finally:
        release_lock(lock_key, lock_token, settings=settings)


def complete_task_target(
    session: Session,
    target_id: str,
    agent: RuntimePrincipal,
    result_summary: str,
    output_payload: dict,
    settings: Settings | None = None,
) -> dict:
    if not agent.token_id:
        raise AuthorizationError("Remote access token is required")

    lock_key = f"task-target:{target_id}:complete"
    lock_token = acquire_lock(lock_key, ttl_seconds=10, settings=settings)
    if not lock_token:
        raise ConflictError("Task completion is being processed by another agent")

    target_repo = TaskTargetRepository(session)
    task_repo = TaskRepository(session)
    run_repo = RunRepository(session)
    try:
        target = target_repo.get(target_id)
        if target is None:
            raise NotFoundError("Task target not found")
        if target.target_access_token_id != agent.token_id:
            raise AuthorizationError("Task target is not assigned to this token")
        if target.status != "claimed":
            raise ConflictError("Task target is not claimed")
        if target.claimed_by_access_token_id != agent.token_id:
            raise AuthorizationError("Task target is not claimed by this token")

        task = task_repo.get(target.task_id)
        if task is None:
            raise NotFoundError("Task not found")

        target.status = "completed"
        target.completed_at = datetime.now(timezone.utc)
        _expire_task_approvals(
            session,
            task.id,
            agent_id=agent.id,
            token_id=agent.token_id,
            task_target_id=target.id,
        )
        run_id = new_resource_id("run")
        run = RunModel(
            id=run_id,
            task_id=task.id,
            agent_id=agent.id,
            access_token_id=agent.token_id,
            task_target_id=target.id,
            status="completed",
            result_summary=result_summary,
            output_payload=output_payload,
        )
        run_repo.create(run)
        target.last_run_id = run.id
        target_repo.update(target)

        _sync_task_under_lock(task, target_repo, task_repo, settings)
        record_task_completion()
        return _task_target_to_dict(target, task)
    finally:
        release_lock(lock_key, lock_token, settings=settings)


def _task_to_dict(model: TaskModel, *, targets: list[TaskTargetModel] | None = None) -> dict:
    target_rows = targets or []
    return {
        "id": model.id,
        "title": model.title,
        "task_type": model.task_type,
        "input": model.input,
        "required_capability_ids": model.required_capability_ids,
        "playbook_ids": model.playbook_ids,
        "lease_allowed": model.lease_allowed,
        "approval_mode": model.approval_mode,
        "approval_rules": model.approval_rules,
        "priority": model.priority,
        "target_mode": model.target_mode,
        "status": model.status,
        "created_by": model.created_by,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "publication_status": model.publication_status,
        "claimed_by": model.claimed_by,
        "target_ids": [target.id for target in target_rows],
        "target_access_token_ids": [target.target_access_token_id for target in target_rows] or (model.target_access_token_ids or []),
    }


def _task_target_to_dict(target: TaskTargetModel, task: TaskModel) -> dict:
    return {
        "id": target.id,
        "task_id": task.id,
        "title": task.title,
        "task_type": task.task_type,
        "target_access_token_id": target.target_access_token_id,
        "status": target.status,
        "claimed_by_access_token_id": target.claimed_by_access_token_id,
        "claimed_by_agent_id": target.claimed_by_agent_id,
        "claimed_at": target.claimed_at,
        "completed_at": target.completed_at,
        "last_run_id": target.last_run_id,
    }


def _task_response_for_target_transition(task: TaskModel | None, target_payload: dict) -> dict:
    if task is None:
        return target_payload
    return {
        **_task_to_dict(task, targets=[]),
        "status": target_payload["status"],
        "claimed_by": target_payload.get("claimed_by_agent_id"),
    }


def _sync_task_under_lock(
    task: TaskModel,
    target_repo: TaskTargetRepository,
    task_repo: TaskRepository,
    settings: Settings | None,
) -> None:
    lock_key = f"task:{task.id}:sync"
    lock_token = acquire_lock(lock_key, ttl_seconds=5, settings=settings)
    if not lock_token:
        _sync_task_state_from_targets(task, target_repo.list_by_task(task.id))
        task_repo.update(task)
        return
    try:
        _sync_task_state_from_targets(task, target_repo.list_by_task(task.id))
        task_repo.update(task)
    finally:
        release_lock(lock_key, lock_token, settings=settings)


def _sync_task_state_from_targets(task: TaskModel, targets: list[TaskTargetModel]) -> None:
    if not targets:
        task.status = "pending"
        task.claimed_by = None
        return

    if all(target.status == "completed" for target in targets):
        task.status = "completed"
        task.claimed_by = None
        return

    if any(target.status in {"claimed", "completed"} for target in targets):
        task.status = "claimed"
    else:
        task.status = "pending"

    claimed_targets = [target for target in targets if target.status == "claimed" and target.claimed_by_agent_id]
    task.claimed_by = claimed_targets[0].claimed_by_agent_id if len(claimed_targets) == 1 else None


def _ensure_playbooks_exist(session: Session, playbook_ids: list[str]) -> None:
    if not playbook_ids:
        return

    repo = PlaybookRepository(session)
    missing = [playbook_id for playbook_id in playbook_ids if repo.get(playbook_id) is None]
    if missing:
        joined = ", ".join(missing)
        raise BadRequestError(f"Unknown playbook reference: {joined}")


def _expire_task_approvals(
    session: Session,
    task_id: str,
    *,
    agent_id: str,
    token_id: str | None,
    task_target_id: str | None,
) -> None:
    approvals = (
        session.query(ApprovalRequestModel)
        .filter(ApprovalRequestModel.task_id == task_id)
        .filter(ApprovalRequestModel.agent_id == agent_id)
        .filter(ApprovalRequestModel.token_id == (token_id or ""))
        .filter(ApprovalRequestModel.task_target_id == (task_target_id or ""))
        .filter(ApprovalRequestModel.status.in_(["pending", "approved"]))
        .all()
    )
    if not approvals:
        return

    current_time = datetime.now(timezone.utc)
    for approval in approvals:
        approval.status = "expired"
        approval.expires_at = current_time
    session.flush()


def _create_task_targets(
    session: Session,
    task: TaskModel,
    payload: TaskCreate,
) -> list[TaskTargetModel]:
    token_ids = _resolve_target_access_token_ids(session, payload)
    repo = TaskTargetRepository(session)
    created: list[TaskTargetModel] = []
    for token_id in token_ids:
        created.append(repo.create(TaskTargetModel(
            id=new_resource_id("target"),
            task_id=task.id,
            target_access_token_id=token_id,
            status="pending",
        )))
    return created


def _resolve_target_access_token_ids(session: Session, payload: TaskCreate) -> list[str]:
    if payload.target_mode == "explicit_access_tokens" or payload.target_access_token_ids:
        if payload.target_mode == "explicit_access_tokens" and not payload.target_access_token_ids:
            raise BadRequestError("Explicit access token targeting requires target_access_token_ids")
        repo = AccessTokenRepository(session)
        access_token_ids: list[str] = []
        for access_token_id in payload.target_access_token_ids:
            token = repo.get(access_token_id)
            if token is None or token.status != "active":
                raise BadRequestError(f"Unknown target access token: {access_token_id}")
            access_token_ids.append(access_token_id)
        return access_token_ids

    return [token.id for token in AccessTokenRepository(session).list_active()]


def _ensure_actor_can_submit_task(session: Session, payload: TaskCreate, *, actor) -> None:
    if getattr(actor, "actor_type", None) == "human":
        return

    if getattr(actor, "actor_type", None) == "openclaw_agent":
        agent_model = OpenClawAgentRepository(session).get(actor.id)
        if agent_model is None or agent_model.status != "active":
            raise AuthorizationError("Agent is not active")

        try:
            ensure_task_type_allowed(
                RuntimePrincipal(
                    id=agent_model.id,
                    name=agent_model.name,
                    issuer="openclaw",
                    auth_method=agent_model.auth_method,
                    status=agent_model.status,
                    token_id=getattr(actor, "token_id", None),
                    allowed_task_types=agent_model.allowed_task_types or [],
                    allowed_capability_ids=agent_model.allowed_capability_ids or [],
                    risk_tier=agent_model.risk_tier,
                ),
                payload.task_type,
            )
        except PermissionError as exc:
            raise AuthorizationError(str(exc)) from exc

    if payload.target_mode != "explicit_access_tokens":
        return

    token_repo = AccessTokenRepository(session)
    for access_token_id in payload.target_access_token_ids:
        token = token_repo.get(access_token_id)
        if token is None or token.status != "active":
            raise BadRequestError(f"Unknown target access token: {access_token_id}")
        if token.subject_id != actor.id:
            raise AuthorizationError("Runtime agents may only target their own active access tokens")


def _uses_access_token_assignments(actor) -> bool:
    return getattr(actor, "auth_method", None) == "access_token" and bool(getattr(actor, "token_id", None))
