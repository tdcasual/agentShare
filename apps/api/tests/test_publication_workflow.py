from starlette import status

from app.services.publication_workflow import publication_workflow_for_actor


def test_publication_workflow_for_human_actor_is_active_and_created() -> None:
    decision = publication_workflow_for_actor("human")

    assert decision.publication_status == "active"
    assert decision.created_status_code == status.HTTP_201_CREATED
    assert decision.is_pending_review is False


def test_publication_workflow_for_runtime_actor_is_pending_review_and_accepted() -> None:
    decision = publication_workflow_for_actor("access_token")

    assert decision.publication_status == "pending_review"
    assert decision.created_status_code == status.HTTP_202_ACCEPTED
    assert decision.is_pending_review is True
