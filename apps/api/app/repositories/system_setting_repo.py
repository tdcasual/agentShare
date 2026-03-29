from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.system_setting import SystemSettingModel


class SystemSettingRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, key: str) -> SystemSettingModel | None:
        return self.session.get(SystemSettingModel, key)

    def set_json(self, key: str, value_json: dict) -> SystemSettingModel:
        model = self.get(key)
        if model is None:
            model = SystemSettingModel(key=key, value_json=value_json)
            self.session.add(model)
        else:
            model.value_json = value_json
        self.session.flush()
        return model
