from fastapi import APIRouter

from app.store import store


router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("")
def list_runs() -> dict:
    return {"items": store.runs}
