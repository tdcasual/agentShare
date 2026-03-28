from fastapi import APIRouter, Depends

from app.auth import ManagementIdentity, require_management_session
from app.schemas.intake_catalog import IntakeCatalogResponse
from app.services.intake_catalog import get_intake_catalog

router = APIRouter(prefix="/api/intake-catalog")


@router.get(
    "",
    response_model=IntakeCatalogResponse,
    tags=["Management"],
    summary="List intake catalog variants",
    description="Return the operator-facing intake resource kinds, default variants, sections, and field metadata used to scaffold management forms.",
)
def list_intake_catalog(
    manager: ManagementIdentity = Depends(require_management_session),
) -> IntakeCatalogResponse:
    _ = manager
    return get_intake_catalog()
