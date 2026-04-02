from types import SimpleNamespace

from app.config import Settings
from app.services.operator_identity_provider import build_operator_identity_provider
from app.services.operator_identity_local import LocalOperatorIdentityProvider
from app.services.session_service import authenticate_management_operator


class RecordingProvider:
    def __init__(self, account):
        self.account = account
        self.calls: list[tuple[object, str, str]] = []

    def authenticate(self, session, *, email: str, password: str):
        self.calls.append((session, email, password))
        return self.account


def test_build_operator_identity_provider_defaults_to_local_provider() -> None:
    provider = build_operator_identity_provider(Settings())

    assert isinstance(provider, LocalOperatorIdentityProvider)


def test_authenticate_management_operator_delegates_to_provider() -> None:
    session = object()
    settings = Settings()
    account = SimpleNamespace(id="human-1")
    provider = RecordingProvider(account)

    result = authenticate_management_operator(
        session,
        settings,
        email="owner@example.com",
        password="correct horse battery staple",
        provider=provider,
    )

    assert result is account
    assert provider.calls == [(session, "owner@example.com", "correct horse battery staple")]
