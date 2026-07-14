import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.config import Settings
from app.maintenance import cleanup_expired_records, should_update_last_used
from app.orm import AdminSession, AuditLog, User
from app.runtime import build_runtime


def test_last_used_updates_are_throttled() -> None:
    now = datetime.now(UTC)

    assert should_update_last_used(None, now, 300)
    assert not should_update_last_used(now - timedelta(seconds=299), now, 300)
    assert should_update_last_used(now - timedelta(seconds=300), now, 300)
    assert should_update_last_used(now.replace(tzinfo=None) - timedelta(seconds=600), now, 300)


def test_cleanup_removes_only_records_older_than_retention(test_database_url: str) -> None:
    async def exercise() -> None:
        settings = Settings(
            app_env="development",
            database_url=test_database_url,
            credential_retention_days=30,
            audit_retention_days=365,
        )
        runtime = build_runtime(settings)
        now = datetime.now(UTC)
        try:
            async with runtime.session_factory() as db:
                user = User(email="admin@example.com", password_hash="hash")
                db.add(user)
                await db.flush()
                db.add_all([
                    AdminSession(
                        user_id=user.id,
                        key_hash="old-session",
                        key_prefix="old",
                        expires_at=now - timedelta(days=31),
                    ),
                    AdminSession(
                        user_id=user.id,
                        key_hash="current-session",
                        key_prefix="current",
                        expires_at=now + timedelta(days=1),
                    ),
                    AuditLog(
                        actor_type="session",
                        actor_label="admin@example.com",
                        action="old.event",
                        created_at=now - timedelta(days=366),
                    ),
                    AuditLog(
                        actor_type="session",
                        actor_label="admin@example.com",
                        action="recent.event",
                        created_at=now - timedelta(days=1),
                    ),
                ])
                await db.commit()

                await cleanup_expired_records(db, settings)

                assert await db.scalar(select(func.count(AdminSession.id))) == 1
                assert await db.scalar(select(func.count(AuditLog.id))) == 1
                actions = set(await db.scalars(select(AuditLog.action)))
                assert actions == {"recent.event"}
        finally:
            await runtime.dispose()

    asyncio.run(exercise())
