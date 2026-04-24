from __future__ import annotations

from sqlalchemy import case
from sqlalchemy.orm import Session

from app.orm.openclaw_workbench_message import OpenClawWorkbenchMessageModel


class OpenClawWorkbenchMessageRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawWorkbenchMessageModel) -> OpenClawWorkbenchMessageModel:
        self.session.add(model)
        self.session.flush()
        return model

    def list_for_session(self, session_id: str) -> list[OpenClawWorkbenchMessageModel]:
        return list(
            self.session.query(OpenClawWorkbenchMessageModel)
            .filter(OpenClawWorkbenchMessageModel.session_id == session_id)
            .order_by(
                OpenClawWorkbenchMessageModel.created_at.asc(),
                case(
                    (OpenClawWorkbenchMessageModel.role == "system", 0),
                    (OpenClawWorkbenchMessageModel.role == "user", 1),
                    else_=2,
                ).asc(),
                OpenClawWorkbenchMessageModel.id.asc(),
            )
            .all()
        )
