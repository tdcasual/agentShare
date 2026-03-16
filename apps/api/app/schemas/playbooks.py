from pydantic import BaseModel, Field


class PlaybookCreate(BaseModel):
    title: str
    task_type: str
    body: str
    tags: list[str] = Field(default_factory=list)
