from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.catalog_release import CatalogReleaseModel


class CatalogReleaseRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: CatalogReleaseModel) -> CatalogReleaseModel:
        self.session.add(model)
        self.session.flush()
        return model

    def find_latest_by_resource(self, *, resource_kind: str, resource_id: str) -> CatalogReleaseModel | None:
        return (
            self.session.query(CatalogReleaseModel)
            .filter(
                CatalogReleaseModel.resource_kind == resource_kind,
                CatalogReleaseModel.resource_id == resource_id,
            )
            .order_by(CatalogReleaseModel.version.desc(), CatalogReleaseModel.released_at.desc())
            .first()
        )

    def list_all(self) -> list[CatalogReleaseModel]:
        return list(
            self.session.query(CatalogReleaseModel)
            .order_by(CatalogReleaseModel.released_at.desc(), CatalogReleaseModel.version.desc())
            .all()
        )

    def list_filtered(
        self,
        *,
        resource_kind: str | None = None,
        release_status: str | None = None,
    ) -> list[CatalogReleaseModel]:
        query = self.session.query(CatalogReleaseModel)
        if resource_kind is not None:
            query = query.filter(CatalogReleaseModel.resource_kind == resource_kind)
        if release_status is not None:
            query = query.filter(CatalogReleaseModel.release_status == release_status)
        return list(
            query.order_by(CatalogReleaseModel.released_at.desc(), CatalogReleaseModel.version.desc()).all()
        )

    def list_by_resource(self, *, resource_kind: str, resource_id: str) -> list[CatalogReleaseModel]:
        return list(
            self.session.query(CatalogReleaseModel)
            .filter(
                CatalogReleaseModel.resource_kind == resource_kind,
                CatalogReleaseModel.resource_id == resource_id,
            )
            .order_by(CatalogReleaseModel.version.desc(), CatalogReleaseModel.released_at.desc())
            .all()
        )
