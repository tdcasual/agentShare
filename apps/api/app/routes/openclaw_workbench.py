from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.errors import BadRequestError, NotFoundError, ServiceUnavailableError
from app.orm.capability import CapabilityModel
from app.orm.openclaw_agent import OpenClawAgentModel
from app.orm.openclaw_workbench_message import OpenClawWorkbenchMessageModel
from app.orm.openclaw_workbench_session import OpenClawWorkbenchSessionModel
from app.repositories.capability_repo import CapabilityRepository
from app.repositories.openclaw_agent_file_repo import OpenClawAgentFileRepository
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.repositories.openclaw_workbench_message_repo import OpenClawWorkbenchMessageRepository
from app.repositories.openclaw_workbench_session_repo import OpenClawWorkbenchSessionRepository
from app.repositories.secret_repo import SecretRepository
from app.schemas.openclaw_workbench import (
    OpenClawWorkbenchMessageCreate,
    OpenClawWorkbenchMessageCreateResponse,
    OpenClawWorkbenchMessageListResponse,
    OpenClawWorkbenchMessageSummary,
    OpenClawWorkbenchSessionCreate,
    OpenClawWorkbenchSessionListResponse,
    OpenClawWorkbenchSessionSummary,
)
from app.services.adapters.registry import get_adapter
from app.services.audit_service import write_audit_event
from app.services.identifiers import new_resource_id
from app.services.secret_backend import get_secret_backend_for_ref

router = APIRouter(prefix="/api/openclaw/workbench/sessions")
agent_workbench_router = APIRouter()

_DEFAULT_WORKBENCH_TITLE = "New conversation"


def _require_openclaw_agent(agent_id: str, session: Session) -> OpenClawAgentModel:
    model = OpenClawAgentRepository(session).get(agent_id)
    if model is None:
        raise NotFoundError("OpenClaw agent not found")
    return model


def _get_workbench_session(session_id: str, session: Session) -> OpenClawWorkbenchSessionModel:
    model = OpenClawWorkbenchSessionRepository(session).get(session_id)
    if model is None:
        raise NotFoundError("OpenClaw workbench session not found")
    return model


def _serialize_session(
    model: OpenClawWorkbenchSessionModel,
    capability: CapabilityModel | None = None,
) -> dict[str, Any]:
    return OpenClawWorkbenchSessionSummary(
        id=model.id,
        agent_id=model.agent_id,
        capability_id=model.capability_id,
        capability_name=capability.name if capability is not None else None,
        title=model.title,
        status=model.status,
        created_by_actor_id=model.created_by_actor_id,
        created_at=model.created_at,
        updated_at=model.updated_at,
        last_message_at=model.last_message_at,
    ).model_dump()


def _serialize_message(model: OpenClawWorkbenchMessageModel) -> dict[str, Any]:
    return OpenClawWorkbenchMessageSummary(
        id=model.id,
        session_id=model.session_id,
        role=model.role,
        content=model.content,
        message_metadata=model.message_metadata or {},
        created_at=model.created_at,
        updated_at=model.updated_at,
    ).model_dump()


def _resolve_workbench_capability(
    *,
    session: Session,
    agent: OpenClawAgentModel,
    capability_id: str,
) -> CapabilityModel:
    capability = CapabilityRepository(session).get(capability_id)
    if capability is None or capability.publication_status != "active":
        raise NotFoundError("Capability not found")
    if capability.adapter_type != "openai":
        raise BadRequestError("Workbench currently supports openai capabilities only")
    if agent.allowed_capability_ids and capability_id not in set(agent.allowed_capability_ids):
        raise BadRequestError("Capability is not allowed for this agent")

    secret = SecretRepository(session).get(capability.secret_id)
    if secret is None or secret.publication_status != "active":
        raise BadRequestError("Capability secret is not active")
    return capability


def _build_system_prompt(agent: OpenClawAgentModel, session: Session) -> str:
    file_repo = OpenClawAgentFileRepository(session)
    file_blocks = []
    for file_model in file_repo.list_for_agent(agent.id):
        file_blocks.append(
            "\n".join([
                f"File: {file_model.file_name}",
                file_model.content,
            ])
        )

    sections = [
        f'You are the internal agent "{agent.name}" operating inside a management workbench.',
        "Use the stored agent configuration as your operating context.",
        "Agent configuration:",
        f"- agent_id: {agent.id}",
        f"- workspace_root: {agent.workspace_root}",
        f"- agent_dir: {agent.agent_dir}",
        f"- auth_method: {agent.auth_method}",
        f"- risk_tier: {agent.risk_tier}",
        f"- default_model: {agent.model or ''}",
        f"- thinking_level: {agent.thinking_level}",
        f"- sandbox_mode: {agent.sandbox_mode}",
        f"- allowed_task_types: {json.dumps(agent.allowed_task_types or [], ensure_ascii=True, sort_keys=True)}",
        f"- allowed_capability_ids: {json.dumps(agent.allowed_capability_ids or [], ensure_ascii=True, sort_keys=True)}",
        f"- dream_policy: {json.dumps(agent.dream_policy or {}, ensure_ascii=True, sort_keys=True)}",
        f"- tools_policy: {json.dumps(agent.tools_policy or {}, ensure_ascii=True, sort_keys=True)}",
        f"- skills_policy: {json.dumps(agent.skills_policy or {}, ensure_ascii=True, sort_keys=True)}",
    ]
    if file_blocks:
        sections.append("Stored workspace bootstrap files:")
        sections.extend(file_blocks)
    return "\n\n".join(sections).strip()


def _title_from_content(content: str) -> str:
    collapsed = " ".join(content.split()).strip()
    if not collapsed:
        return _DEFAULT_WORKBENCH_TITLE
    return collapsed[:80]


def _extract_assistant_content(result: dict[str, Any]) -> str:
    body = result.get("body", {})
    choices = body.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(part for part in parts if part)
    if content is None:
        return ""
    return json.dumps(content, ensure_ascii=True, sort_keys=True)


def _invoke_workbench_capability(
    *,
    session: Session,
    capability: CapabilityModel,
    messages: list[OpenClawWorkbenchMessageModel],
    payload: OpenClawWorkbenchMessageCreate,
) -> dict[str, Any]:
    secret = SecretRepository(session).get(capability.secret_id)
    if secret is None or secret.publication_status != "active":
        raise BadRequestError("Capability secret is not active")

    try:
        backend = get_secret_backend_for_ref(secret.backend_ref)
        secret_value = backend.read_secret(secret.id, secret.backend_ref)
    except Exception as exc:
        raise ServiceUnavailableError("Workbench capability secret backend failed") from exc

    parameters: dict[str, Any] = {
        "messages": [
            {"role": message.role, "content": message.content}
            for message in messages
        ],
    }
    if payload.temperature is not None:
        parameters["temperature"] = payload.temperature
    if payload.max_tokens is not None:
        parameters["max_tokens"] = payload.max_tokens

    try:
        adapter = get_adapter(capability.adapter_type)
        return adapter.invoke(
            secret_value=secret_value,
            adapter_config=capability.adapter_config or {},
            parameters=parameters,
        )
    except Exception as exc:
        raise ServiceUnavailableError("Workbench capability invocation failed") from exc


@agent_workbench_router.get(
    "/{agent_id}/workbench/sessions",
    response_model=OpenClawWorkbenchSessionListResponse,
    tags=["Management"],
    summary="List workbench sessions for one OpenClaw agent",
    description="Return management-side workbench conversations associated with one OpenClaw agent.",
)
def list_workbench_sessions_for_agent(
    agent_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    agent = _require_openclaw_agent(agent_id, session)
    repo = OpenClawWorkbenchSessionRepository(session)
    capability_repo = CapabilityRepository(session)
    items = [
        _serialize_session(model, capability_repo.get(model.capability_id))
        for model in repo.list_for_agent(agent.id)
    ]
    write_audit_event(
        session,
        "openclaw_workbench_sessions_listed",
        {"actor_id": manager.id, "agent_id": agent.id, "count": len(items)},
    )
    return {"items": items}


@agent_workbench_router.post(
    "/{agent_id}/workbench/sessions",
    status_code=status.HTTP_201_CREATED,
    response_model=OpenClawWorkbenchSessionSummary,
    tags=["Management"],
    summary="Create a workbench session for one OpenClaw agent",
    description="Open a management-side conversation channel backed by one active capability.",
)
def create_workbench_session(
    agent_id: str,
    payload: OpenClawWorkbenchSessionCreate,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    agent = _require_openclaw_agent(agent_id, session)
    capability = _resolve_workbench_capability(session=session, agent=agent, capability_id=payload.capability_id)

    now = datetime.now(timezone.utc)
    title = (payload.title or "").strip() or _DEFAULT_WORKBENCH_TITLE
    session_model = OpenClawWorkbenchSessionModel(
        id=new_resource_id("openclaw-workbench-session"),
        agent_id=agent.id,
        capability_id=capability.id,
        title=title,
        status="active",
        created_by_actor_id=manager.id,
        last_message_at=now,
    )
    session_repo = OpenClawWorkbenchSessionRepository(session)
    message_repo = OpenClawWorkbenchMessageRepository(session)
    session_repo.create(session_model)

    system_message = OpenClawWorkbenchMessageModel(
        id=new_resource_id("openclaw-workbench-message"),
        session_id=session_model.id,
        role="system",
        content=_build_system_prompt(agent, session),
        message_metadata={"kind": "system_prompt", "capability_id": capability.id},
    )
    message_repo.create(system_message)
    session_model.last_message_at = now
    session_repo.update(session_model)

    write_audit_event(
        session,
        "openclaw_workbench_session_created",
        {
            "actor_id": manager.id,
            "agent_id": agent.id,
            "session_id": session_model.id,
            "capability_id": capability.id,
        },
    )
    return _serialize_session(session_model, capability)


@router.get(
    "/{conversation_id}",
    response_model=OpenClawWorkbenchSessionSummary,
    tags=["Management"],
    summary="Get one OpenClaw workbench session",
    description="Read one management-side workbench session by id.",
)
def get_workbench_session(
    conversation_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    model = _get_workbench_session(conversation_id, session)
    capability = CapabilityRepository(session).get(model.capability_id)
    write_audit_event(
        session,
        "openclaw_workbench_session_read",
        {"actor_id": manager.id, "session_id": model.id, "agent_id": model.agent_id},
    )
    return _serialize_session(model, capability)


@router.get(
    "/{conversation_id}/messages",
    response_model=OpenClawWorkbenchMessageListResponse,
    tags=["Management"],
    summary="List messages for one OpenClaw workbench session",
    description="Return ordered workbench messages for one management-side conversation.",
)
def list_workbench_messages(
    conversation_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    workbench_session = _get_workbench_session(conversation_id, session)
    repo = OpenClawWorkbenchMessageRepository(session)
    items = [_serialize_message(model) for model in repo.list_for_session(workbench_session.id)]
    write_audit_event(
        session,
        "openclaw_workbench_messages_listed",
        {"actor_id": manager.id, "session_id": workbench_session.id, "count": len(items)},
    )
    return {"items": items}


@router.post(
    "/{conversation_id}/messages",
    response_model=OpenClawWorkbenchMessageCreateResponse,
    tags=["Management"],
    summary="Send one message in an OpenClaw workbench session",
    description="Persist an operator message, invoke the configured capability, and persist the assistant reply.",
)
def create_workbench_message(
    conversation_id: str,
    payload: OpenClawWorkbenchMessageCreate,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    content = payload.content.strip()
    if not content:
        raise BadRequestError("Message content is required")

    workbench_session = _get_workbench_session(conversation_id, session)
    agent = _require_openclaw_agent(workbench_session.agent_id, session)
    capability = _resolve_workbench_capability(
        session=session,
        agent=agent,
        capability_id=workbench_session.capability_id,
    )

    session_repo = OpenClawWorkbenchSessionRepository(session)
    message_repo = OpenClawWorkbenchMessageRepository(session)

    user_message = OpenClawWorkbenchMessageModel(
        id=new_resource_id("openclaw-workbench-message"),
        session_id=workbench_session.id,
        role="user",
        content=content,
        message_metadata={"actor_id": manager.id},
    )
    message_repo.create(user_message)

    history = message_repo.list_for_session(workbench_session.id)
    result = _invoke_workbench_capability(
        session=session,
        capability=capability,
        messages=history,
        payload=payload,
    )
    assistant_content = _extract_assistant_content(result).strip()
    body = result.get("body", {})
    usage = body.get("usage") or {}
    assistant_message = OpenClawWorkbenchMessageModel(
        id=new_resource_id("openclaw-workbench-message"),
        session_id=workbench_session.id,
        role="assistant",
        content=assistant_content,
        message_metadata={
            "usage": usage,
            "upstream_status": result.get("upstream_status"),
            "adapter_type": result.get("adapter_type", capability.adapter_type),
            "model": (capability.adapter_config or {}).get("model"),
        },
    )
    message_repo.create(assistant_message)

    workbench_session.last_message_at = datetime.now(timezone.utc)
    if workbench_session.title == _DEFAULT_WORKBENCH_TITLE:
        workbench_session.title = _title_from_content(content)
    session_repo.update(workbench_session)

    write_audit_event(
        session,
        "openclaw_workbench_message_created",
        {
            "actor_id": manager.id,
            "agent_id": agent.id,
            "session_id": workbench_session.id,
            "capability_id": capability.id,
        },
    )
    return OpenClawWorkbenchMessageCreateResponse(
        session=OpenClawWorkbenchSessionSummary(**_serialize_session(workbench_session, capability)),
        user_message=OpenClawWorkbenchMessageSummary(**_serialize_message(user_message)),
        assistant_message=OpenClawWorkbenchMessageSummary(**_serialize_message(assistant_message)),
    ).model_dump()
