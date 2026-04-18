from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_agent import OpenClawAgentModel
from app.orm.openclaw_agent_file import OpenClawAgentFileModel
from app.orm.openclaw_dream_run import OpenClawDreamRunModel
from app.orm.openclaw_dream_step import OpenClawDreamStepModel
from app.orm.openclaw_memory_note import OpenClawMemoryNoteModel
from app.orm.openclaw_session import OpenClawSessionModel
from app.orm.openclaw_tool_binding import OpenClawToolBindingModel


def delete_openclaw_agent_with_children(session: Session, agent_id: str) -> bool:
    agent = session.get(OpenClawAgentModel, agent_id)
    if agent is None:
        return False

    run_ids = [
        run_id
        for (run_id,) in session.query(OpenClawDreamRunModel.id)
        .filter(OpenClawDreamRunModel.agent_id == agent_id)
        .all()
    ]
    if run_ids:
        session.query(OpenClawDreamStepModel).filter(OpenClawDreamStepModel.run_id.in_(run_ids)).delete(
            synchronize_session=False
        )

    session.query(OpenClawDreamRunModel).filter(OpenClawDreamRunModel.agent_id == agent_id).delete(
        synchronize_session=False
    )
    session.query(OpenClawMemoryNoteModel).filter(OpenClawMemoryNoteModel.agent_id == agent_id).delete(
        synchronize_session=False
    )
    session.query(OpenClawSessionModel).filter(OpenClawSessionModel.agent_id == agent_id).delete(
        synchronize_session=False
    )
    session.query(OpenClawAgentFileModel).filter(OpenClawAgentFileModel.agent_id == agent_id).delete(
        synchronize_session=False
    )
    session.query(OpenClawToolBindingModel).filter(OpenClawToolBindingModel.agent_id == agent_id).delete(
        synchronize_session=False
    )
    session.delete(agent)
    session.flush()
    return True
