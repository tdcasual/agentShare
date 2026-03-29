from __future__ import annotations


class DomainError(RuntimeError):
    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class BadRequestError(DomainError):
    status_code = 400


class AuthorizationError(DomainError):
    status_code = 403


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class ServiceUnavailableError(DomainError):
    status_code = 503
