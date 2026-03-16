from fastapi import FastAPI

from app.routes.agents import router as agents_router
from app.routes.capabilities import router as capabilities_router
from app.routes.invoke import router as invoke_router
from app.routes.leases import router as leases_router
from app.routes.playbooks import router as playbooks_router
from app.routes.runs import router as runs_router
from app.routes.secrets import router as secrets_router
from app.routes.tasks import router as tasks_router


app = FastAPI(title="Agent Control Plane")


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(agents_router)
app.include_router(secrets_router)
app.include_router(capabilities_router)
app.include_router(tasks_router)
app.include_router(invoke_router)
app.include_router(leases_router)
app.include_router(runs_router)
app.include_router(playbooks_router)
