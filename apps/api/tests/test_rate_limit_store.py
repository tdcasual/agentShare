from app.rate_limit import _RateLimitStore


def test_rate_limit_store_enforces_key_bound():
    store = _RateLimitStore()
    store._MAX_TRACKED_IPS = 3

    for index in range(5):
        store.record_failure(f"key-{index}", window_seconds=300)

    assert len(store._failures) == 3
    assert "key-4" in store._failures
