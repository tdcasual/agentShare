from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import Settings
from app.orm.pending_secret_material import PendingSecretMaterialModel
from app.orm.secret import SecretModel
from app.repositories.pending_secret_material_repo import PendingSecretMaterialRepository
from app.services.identifiers import new_resource_id
from app.services.secret_backend import get_secret_backend

PENDING_SECRET_REF_PREFIX = "pending://"


def new_pending_secret_id() -> str:
    return new_resource_id("secret")


def build_pending_secret_ref(secret_id: str) -> str:
    return f"{PENDING_SECRET_REF_PREFIX}{secret_id}"


def is_pending_secret_ref(backend_ref: str | None) -> bool:
    return bool(backend_ref and backend_ref.startswith(PENDING_SECRET_REF_PREFIX))


def stage_secret_material(session: Session, *, secret_id: str, secret_value: str) -> None:
    PendingSecretMaterialRepository(session).create(
        PendingSecretMaterialModel(secret_id=secret_id, secret_value=secret_value)
    )


def promote_pending_secret_material(
    session: Session,
    *,
    secret: SecretModel,
    settings: Settings,
) -> str | None:
    staged = PendingSecretMaterialRepository(session).get(secret.id)
    if staged is None:
        if is_pending_secret_ref(secret.backend_ref):
            raise RuntimeError("Pending secret material is missing for review approval")
        return None

    backend = get_secret_backend(settings)
    written_secret_id, backend_ref = backend.write_secret(staged.secret_value, secret_id=secret.id)
    if written_secret_id != secret.id:
        raise RuntimeError("Secret backend returned an unexpected secret identifier")

    secret.backend_ref = backend_ref
    PendingSecretMaterialRepository(session).delete(secret.id)
    return backend_ref


def discard_pending_secret_material(session: Session, *, secret_id: str) -> None:
    PendingSecretMaterialRepository(session).delete(secret_id)
