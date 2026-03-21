from pydantic import BaseModel, Field


class PlaybookCreate(BaseModel):
    title: str
    task_type: str
    body: str
    tags: list[str] = Field(default_factory=list)


class PlaybookResponse(BaseModel):
    id: str
    title: str
    task_type: str
    body: str
    tags: list[str] = Field(default_factory=list)


class PlaybookSearchMeta(BaseModel):
    total: int
    items_count: int
    applied_filters: dict[str, str] = Field(default_factory=dict)


class PlaybookSearchResponse(BaseModel):
    items: list[PlaybookResponse] = Field(default_factory=list)
    meta: PlaybookSearchMeta
