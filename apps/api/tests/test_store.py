from app.store import reset_store, store


def test_reset_store_clears_existing_store_reference():
    store.secrets["secret-9"] = {"id": "secret-9"}
    store.runs.append({"id": "run-9"})

    reset_store()

    assert store.secrets == {}
    assert store.runs == []
