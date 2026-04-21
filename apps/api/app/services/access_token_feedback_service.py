from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.orm.access_token_feedback import AccessTokenFeedbackModel
from app.repositories.access_token_feedback_repo import AccessTokenFeedbackRepository
from app.repositories.access_token_repo import AccessTokenRepository
from app.repositories.task_target_repo import TaskTargetRepository
from app.services.identifiers import new_resource_id


def create_access_token_feedback(
    session: Session,
    *,
    task_target_id: str,
    score: int,
    verdict: str,
    summary: str,
    created_by_actor_type: str,
    created_by_actor_id: str,
) -> dict:
    target = TaskTargetRepository(session).get(task_target_id)
    if target is None:
        raise NotFoundError("Task target not found")
    if target.status != "completed" or not target.last_run_id:
        raise ConflictError("Task target is not ready for feedback")
    if AccessTokenFeedbackRepository(session).get_by_task_target(task_target_id) is not None:
        raise ConflictError("Feedback already exists for this task target")

    token = AccessTokenRepository(session).get(target.target_access_token_id)
    if token is None:
        raise NotFoundError("Access token not found")

    model = AccessTokenFeedbackModel(
        id=new_resource_id("feedback"),
        access_token_id=target.target_access_token_id,
        task_target_id=task_target_id,
        run_id=target.last_run_id,
        source="human_review",
        score=score,
        verdict=verdict,
        summary=summary,
        created_by_actor_type=created_by_actor_type,
        created_by_actor_id=created_by_actor_id,
    )
    try:
        AccessTokenFeedbackRepository(session).create(model)
    except IntegrityError as exc:
        raise ConflictError("Feedback already exists for this task target") from exc
    _recompute_access_token_aggregates(session, token.id)
    return serialize_access_token_feedback(model)


def list_access_token_feedback(session: Session, token_id: str) -> list[dict]:
    return [
        serialize_access_token_feedback(model)
        for model in AccessTokenFeedbackRepository(session).list_by_access_token(token_id)
    ]


def list_access_token_feedback_bulk(session: Session, access_token_ids: list[str]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {access_token_id: [] for access_token_id in access_token_ids}
    for model in AccessTokenFeedbackRepository(session).list_by_access_tokens(access_token_ids):
        grouped.setdefault(model.access_token_id, []).append(serialize_access_token_feedback(model))
    return grouped


def serialize_access_token_feedback(model: AccessTokenFeedbackModel) -> dict:
    return {
        "id": model.id,
        "access_token_id": model.access_token_id,
        "task_target_id": model.task_target_id,
        "run_id": model.run_id,
        "source": model.source,
        "score": model.score,
        "verdict": model.verdict,
        "summary": model.summary,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_at": model.created_at,
    }


def _recompute_access_token_aggregates(session: Session, access_token_id: str) -> None:
    token_repo = AccessTokenRepository(session)
    feedback_repo = AccessTokenFeedbackRepository(session)
    target_repo = TaskTargetRepository(session)
    token = token_repo.get(access_token_id)
    if token is None:
        raise NotFoundError("Access token not found")

    feedback = feedback_repo.list_by_access_token(access_token_id)
    completed_targets = [
        target
        for target in target_repo.list_assigned(access_token_id)
        if target.status == "completed"
    ]

    token.completed_runs = len(completed_targets)
    token.successful_runs = sum(1 for item in feedback if _is_success(item.verdict, item.score))
    token.success_rate = (
        token.successful_runs / token.completed_runs
        if token.completed_runs
        else 0.0
    )
    token.last_feedback_at = max((item.created_at for item in feedback), default=None)
    token.trust_score = (
        sum(item.score for item in feedback) / (len(feedback) * 5)
        if feedback
        else 0.0
    )
    token_repo.update(token)


def _is_success(verdict: str, score: int) -> bool:
    return verdict.lower() in {"accepted", "success", "approved"} or score >= 4
