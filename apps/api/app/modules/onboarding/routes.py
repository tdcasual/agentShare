from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.client_ip import get_client_ip
from app.db import get_async_db
from app.idempotency import commit_idempotent_response, replay_idempotent_response
from app.modules.admin_auth.service import (
    AdminPrincipal,
    generate_credential,
    get_admin_principal,
    hash_credential,
)
from app.modules.audit.service import add_admin_audit
from app.modules.onboarding.schemas import (
    AdminInviteCreate,
    AdminInviteResponse,
    AdminInviteSummary,
    AdminJoinRequestApprove,
    AdminJoinRequestReject,
    AdminJoinRequestSummary,
    AgentCredentialResponse,
    AgentJoinRequestCreate,
    AgentJoinRequestResponse,
    AgentJoinStatusResponse,
)
from app.orm import (
    Agent,
    AgentInvite,
    AgentInviteStatus,
    AgentJoinRequest,
    AgentJoinRequestStatus,
    AgentToken,
    AgentTokenStatus,
    AuditLog,
    SpaceTokenMembership,
    VaultSpace,
    VaultSpaceStatus,
)
from app.services.encryption import get_encryption_service
from app.time_utils import as_utc

admin_router = APIRouter(prefix="/api/admin", tags=["Admin Agent Onboarding"])
public_router = APIRouter(prefix="/api/onboarding/v1", tags=["Agent Onboarding"])

ONBOARDING_RATE_LIMIT_WINDOW_SECONDS = 300
ONBOARDING_RATE_LIMIT_MAX_ATTEMPTS = 20


def _expired(expires_at: datetime) -> bool:
    return as_utc(expires_at) <= datetime.now(UTC)


def _invite_summary(invite: AgentInvite) -> dict:
    return {
        "id": invite.id,
        "label": invite.label,
        "default_space_id": invite.default_space_id,
        "default_role": invite.default_role,
        "status": invite.status,
        "expires_at": invite.expires_at.isoformat(),
        "created_at": invite.created_at.isoformat(),
    }


def _request_summary(item: AgentJoinRequest) -> dict:
    return {
        "id": item.id,
        "invite_id": item.invite_id,
        "proposed_name": item.proposed_name,
        "description": item.description,
        "status": item.status,
        "agent_id": item.agent_id,
        "rejection_reason": item.rejection_reason,
        "created_at": item.created_at.isoformat(),
        "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
    }


async def _owned_invite(db: AsyncSession, user_id: str, invite_id: str) -> AgentInvite:
    invite = await db.scalar(select(AgentInvite).where(AgentInvite.id == invite_id, AgentInvite.user_id == user_id))
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found")
    return invite


async def _owned_request(db: AsyncSession, user_id: str, request_id: str) -> AgentJoinRequest:
    item = await db.scalar(
        select(AgentJoinRequest).where(AgentJoinRequest.id == request_id, AgentJoinRequest.user_id == user_id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Join request not found")
    return item


async def _active_space(db: AsyncSession, user_id: str, space_id: str | None) -> VaultSpace | None:
    if space_id is None:
        return None
    space = await db.scalar(
        select(VaultSpace).where(
            VaultSpace.id == space_id,
            VaultSpace.user_id == user_id,
            VaultSpace.status == VaultSpaceStatus.ACTIVE,
        )
    )
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@admin_router.post("/agent-invites", response_model=AdminInviteResponse, status_code=201)
async def create_invite(
    body: AdminInviteCreate,
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    space = await _active_space(db, principal.user.id, body.space_id)
    payload_input = body.model_dump(mode="json")
    idempotency, replay = await replay_idempotent_response(db, request, principal.user.id, payload_input)
    if replay is not None:
        response.headers["Cache-Control"] = "no-store"
        return replay
    raw_code, code_hash, _ = generate_credential("vgi_")
    now = datetime.now(UTC)
    invite = AgentInvite(
        user_id=principal.user.id,
        code_hash=code_hash,
        label=body.label,
        default_space_id=space.id if space else None,
        default_role=body.role,
        expires_at=now + timedelta(seconds=body.ttl_seconds),
    )
    db.add(invite)
    try:
        await db.flush()
        add_admin_audit(
            db,
            request,
            principal,
            action="agent_invite.create",
            resource_type="agent_invite",
            resource_id=invite.id,
            resource_label=invite.label,
            metadata={"default_space_id": invite.default_space_id, "default_role": invite.default_role},
        )
        payload = {**_invite_summary(invite), "code": raw_code}
        concurrent = await commit_idempotent_response(db, principal.user.id, idempotency, payload, status_code=201)
        if concurrent is not None:
            response.headers["Cache-Control"] = "no-store"
            return concurrent
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Invite creation conflicted; retry the operation") from exc
    response.headers["Cache-Control"] = "no-store"
    return payload


@admin_router.get("/agent-invites", response_model=list[AdminInviteSummary])
async def list_invites(
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> list[dict]:
    invites = await db.scalars(select(AgentInvite).where(AgentInvite.user_id == principal.user.id).order_by(AgentInvite.created_at.desc()))
    result = []
    for invite in invites:
        if invite.status == AgentInviteStatus.ACTIVE and _expired(invite.expires_at):
            invite.status = AgentInviteStatus.EXPIRED
        result.append(_invite_summary(invite))
    await db.commit()
    return result


@admin_router.post("/agent-invites/{invite_id}/revoke", status_code=204)
async def revoke_invite(
    invite_id: str,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    invite = await _owned_invite(db, principal.user.id, invite_id)
    if invite.status == AgentInviteStatus.ACTIVE:
        invite.status = AgentInviteStatus.REVOKED
        invite.revoked_at = datetime.now(UTC)
        add_admin_audit(
            db,
            request,
            principal,
            action="agent_invite.revoke",
            resource_type="agent_invite",
            resource_id=invite.id,
            resource_label=invite.label,
        )
        await db.commit()


@admin_router.get("/agent-join-requests", response_model=list[AdminJoinRequestSummary])
async def list_join_requests(
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> list[dict]:
    rows = await db.scalars(
        select(AgentJoinRequest).where(AgentJoinRequest.user_id == principal.user.id).order_by(AgentJoinRequest.created_at.desc())
    )
    return [_request_summary(item) for item in rows]


@admin_router.get("/agent-join-requests/{request_id}", response_model=AdminJoinRequestSummary)
async def get_join_request(
    request_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    return _request_summary(await _owned_request(db, principal.user.id, request_id))


@admin_router.post("/agent-join-requests/{request_id}/approve", response_model=AdminJoinRequestSummary)
async def approve_join_request(
    request_id: str,
    body: AdminJoinRequestApprove,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    item = await db.scalar(
        select(AgentJoinRequest)
        .where(AgentJoinRequest.id == request_id, AgentJoinRequest.user_id == principal.user.id)
        .with_for_update()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Join request not found")
    if item.status != AgentJoinRequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="Join request is no longer pending")
    invite = await db.scalar(
        select(AgentInvite).where(AgentInvite.id == item.invite_id).with_for_update()
    )
    if invite is None or invite.status != AgentInviteStatus.CONSUMED or _expired(invite.expires_at):
        if invite is not None and _expired(invite.expires_at):
            invite.status = AgentInviteStatus.EXPIRED
        item.status = AgentJoinRequestStatus.EXPIRED
        item.reviewed_at = datetime.now(UTC)
        await db.commit()
        raise HTTPException(status_code=409, detail="Invite is no longer valid")
    space_id = body.space_id if body.space_id is not None else invite.default_space_id
    space = await _active_space(db, principal.user.id, space_id)
    role = body.role or invite.default_role
    raw_token, token_hash, token_prefix = generate_credential("vg_")
    agent = Agent(user_id=principal.user.id, name=item.proposed_name, description=item.description)
    token = AgentToken(
        user_id=principal.user.id,
        agent=agent,
        name=body.token_name,
        key_hash=token_hash,
        key_prefix=token_prefix,
        status=AgentTokenStatus.ACTIVE,
    )
    db.add_all([agent, token])
    await db.flush()
    if space is not None:
        db.add(
            SpaceTokenMembership(
                user_id=principal.user.id,
                space_id=space.id,
                token=token,
                role=role,
                status="active",
            )
        )
    item.status = AgentJoinRequestStatus.APPROVED
    item.agent_id = agent.id
    item.delivery_encrypted = get_encryption_service().encrypt(raw_token)
    item.delivery_expires_at = datetime.now(UTC) + timedelta(hours=1)
    item.reviewed_at = datetime.now(UTC)
    add_admin_audit(
        db,
        request,
        principal,
        action="agent_join.approve",
        resource_type="agent_join_request",
        resource_id=item.id,
        resource_label=item.proposed_name,
        metadata={"agent_id": agent.id, "space_id": space_id, "role": role},
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Agent approval conflicted; retry the operation") from exc
    await db.refresh(item)
    return _request_summary(item)


@admin_router.post("/agent-join-requests/{request_id}/reject", response_model=AdminJoinRequestSummary)
async def reject_join_request(
    request_id: str,
    body: AdminJoinRequestReject,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    item = await _owned_request(db, principal.user.id, request_id)
    if item.status != AgentJoinRequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="Join request is no longer pending")
    item.status = AgentJoinRequestStatus.REJECTED
    item.rejection_reason = body.reason
    item.reviewed_at = datetime.now(UTC)
    add_admin_audit(
        db,
        request,
        principal,
        action="agent_join.reject",
        resource_type="agent_join_request",
        resource_id=item.id,
        resource_label=item.proposed_name,
    )
    await db.commit()
    return _request_summary(item)


def _request_auth(request: Request) -> str:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Onboarding request credential required")
    raw = authorization.removeprefix("Bearer ")
    if not raw.startswith("vgi_"):
        raise HTTPException(status_code=401, detail="Invalid onboarding request credential")
    return raw


async def _public_request(db: AsyncSession, request: Request) -> AgentJoinRequest:
    raw = _request_auth(request)
    item = await db.scalar(select(AgentJoinRequest).where(AgentJoinRequest.request_secret_hash == hash_credential(raw)))
    if item is None:
        raise HTTPException(status_code=401, detail="Invalid onboarding request credential")
    return item


@public_router.post("/requests", response_model=AgentJoinRequestResponse, status_code=201)
async def submit_join_request(
    body: AgentJoinRequestCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    client_ip = get_client_ip(request)
    cutoff = datetime.now(UTC) - timedelta(seconds=ONBOARDING_RATE_LIMIT_WINDOW_SECONDS)
    attempts = await db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.action == "agent_join.attempt",
            AuditLog.ip_address == client_ip,
            AuditLog.created_at >= cutoff,
        )
    )
    if (attempts or 0) >= ONBOARDING_RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many onboarding attempts; try again later")
    db.add(
        AuditLog(
            actor_type="anonymous",
            actor_label="onboarding",
            action="agent_join.attempt",
            result="denied",
            request_id=getattr(request.state, "request_id", None),
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()
    invite = await db.scalar(select(AgentInvite).where(AgentInvite.code_hash == hash_credential(body.invite_code)))
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite is not available")
    idempotency, replay = await replay_idempotent_response(
        db,
        request,
        invite.user_id,
        body.model_dump(mode="json"),
        principal_type="onboarding_invite",
        principal_id=invite.id,
    )
    if idempotency is None:
        raise HTTPException(status_code=422, detail="Idempotency-Key header is required")
    if replay is not None:
        response.headers["Cache-Control"] = "no-store"
        return replay
    if invite.status != AgentInviteStatus.ACTIVE or _expired(invite.expires_at):
        raise HTTPException(status_code=404, detail="Invite is not available")
    raw_secret, secret_hash, _ = generate_credential("vgi_")
    item = AgentJoinRequest(
        user_id=invite.user_id,
        invite_id=invite.id,
        request_secret_hash=secret_hash,
        proposed_name=body.agent_name,
        description=body.description,
        status=AgentJoinRequestStatus.PENDING,
    )
    invite.status = AgentInviteStatus.CONSUMED
    invite.consumed_at = datetime.now(UTC)
    db.add(item)
    add_audit = AuditProxy(db, request)
    await db.flush()
    add_audit.write(item)
    payload = {
        "request_id": item.id,
        "request_secret": raw_secret,
        "status": "pending",
        "expires_at": invite.expires_at.isoformat(),
    }
    try:
        concurrent = await commit_idempotent_response(db, invite.user_id, idempotency, payload, status_code=201)
        if concurrent is not None:
            response.headers["Cache-Control"] = "no-store"
            return concurrent
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Invite has already been used") from exc
    response.headers["Cache-Control"] = "no-store"
    return payload


class AuditProxy:
    def __init__(self, db: AsyncSession, request: Request) -> None:
        self.db, self.request = db, request

    def write(self, item: AgentJoinRequest) -> None:
        # Public onboarding has no AdminPrincipal; use the invite owner as the
        # resource owner while keeping the actor anonymous.
        from app.orm import AuditLog

        self.db.add(
            AuditLog(
                actor_type="anonymous",
                actor_label="onboarding",
                resource_type="agent_join_request",
                resource_id=item.id,
                resource_label=item.proposed_name[:255],
                action="agent_join.request",
                result="success",
                request_id=getattr(self.request.state, "request_id", None),
                ip_address=get_client_ip(self.request),
                user_agent=self.request.headers.get("user-agent"),
            )
        )

    def write_credential_read(self, item: AgentJoinRequest) -> None:
        from app.orm import AuditLog

        self.db.add(
            AuditLog(
                actor_type="anonymous",
                actor_label="onboarding",
                resource_type="agent_join_request",
                resource_id=item.id,
                resource_label=item.proposed_name[:255],
                action="agent_join.credential.read",
                result="success",
                request_id=getattr(self.request.state, "request_id", None),
                ip_address=get_client_ip(self.request),
                user_agent=self.request.headers.get("user-agent"),
            )
        )


@public_router.get("/requests/{request_id}", response_model=AgentJoinStatusResponse)
async def get_join_status(request_id: str, request: Request, db: AsyncSession = Depends(get_async_db)) -> dict:
    item = await _public_request(db, request)
    if item.id != request_id:
        raise HTTPException(status_code=404, detail="Join request not found")
    invite = await db.get(AgentInvite, item.invite_id)
    if item.status == AgentJoinRequestStatus.PENDING and invite is not None and _expired(invite.expires_at):
        item.status = AgentJoinRequestStatus.EXPIRED
        await db.commit()
    if item.status == AgentJoinRequestStatus.PENDING:
        return {"status": "pending"}
    if item.status == AgentJoinRequestStatus.APPROVED:
        return {"status": "approved", "agent_id": item.agent_id}
    return {"status": item.status, "reason": item.rejection_reason}


@public_router.post("/requests/{request_id}/credential", response_model=AgentCredentialResponse)
async def claim_credential(
    request_id: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    authenticated = await _public_request(db, request)
    item = await db.scalar(
        select(AgentJoinRequest).where(AgentJoinRequest.id == authenticated.id).with_for_update()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Join request not found")
    if item.id != request_id:
        raise HTTPException(status_code=404, detail="Join request not found")
    idempotency, replay = await replay_idempotent_response(
        db,
        request,
        item.user_id,
        {"request_id": request_id, "action": "claim_credential"},
        principal_type="onboarding_request",
        principal_id=item.id,
    )
    if idempotency is None:
        raise HTTPException(status_code=422, detail="Idempotency-Key header is required")
    if replay is not None:
        response.headers["Cache-Control"] = "no-store"
        return replay
    if item.status != AgentJoinRequestStatus.APPROVED or not item.delivery_encrypted or not item.agent_id:
        raise HTTPException(status_code=409, detail="Credential is not ready")
    if item.delivery_claimed_at is not None:
        raise HTTPException(status_code=409, detail="Credential has already been claimed")
    if item.delivery_expires_at and _expired(item.delivery_expires_at):
        item.status = AgentJoinRequestStatus.EXPIRED
        await db.commit()
        raise HTTPException(status_code=410, detail="Credential delivery expired")
    raw_token = get_encryption_service().decrypt(item.delivery_encrypted)
    item.delivery_claimed_at = datetime.now(UTC)
    AuditProxy(db, request).write_credential_read(item)
    payload = {"status": "approved", "agent_id": item.agent_id, "token": raw_token}
    try:
        concurrent = await commit_idempotent_response(db, item.user_id, idempotency, payload, status_code=200)
        if concurrent is not None:
            response.headers["Cache-Control"] = "no-store"
            return concurrent
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Credential claim conflicted; retry with the same key") from exc
    response.headers["Cache-Control"] = "no-store"
    return payload
