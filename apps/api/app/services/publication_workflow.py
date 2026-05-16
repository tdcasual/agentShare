from __future__ import annotations

from dataclasses import dataclass

from starlette import status

REVIEW_PENDING = "pending_review"
REVIEW_ACTIVE = "active"
REVIEW_REJECTED = "rejected"


@dataclass(frozen=True)
class PublicationWorkflowDecision:
    publication_status: str
    created_status_code: int

    @property
    def is_pending_review(self) -> bool:
        return self.publication_status == REVIEW_PENDING


def publication_workflow_for_actor(actor_type: str) -> PublicationWorkflowDecision:
    if actor_type == "human":
        return PublicationWorkflowDecision(
            publication_status=REVIEW_ACTIVE,
            created_status_code=status.HTTP_201_CREATED,
        )

    return PublicationWorkflowDecision(
        publication_status=REVIEW_PENDING,
        created_status_code=status.HTTP_202_ACCEPTED,
    )


def publication_status_for_actor(actor_type: str) -> str:
    return publication_workflow_for_actor(actor_type).publication_status
