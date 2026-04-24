from pathlib import Path


def test_resolve_docs_root_prefers_workdir_docs_when_module_is_installed_package(tmp_path, monkeypatch):
    docs_root = tmp_path / "docs" / "guides"
    docs_root.mkdir(parents=True)
    (docs_root / "agent-quickstart.md").write_text("# Agent Quickstart\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    from app.routes import public_docs

    resolved = public_docs._resolve_docs_root(
        Path("/usr/local/lib/python3.12/site-packages/app/routes/public_docs.py"),
        cwd=tmp_path,
    )

    assert resolved == (tmp_path / "docs").resolve()


def test_public_docs_only_lists_allowed_categories(client, tmp_path, monkeypatch):
    docs_root = tmp_path / "docs"
    guides_dir = docs_root / "guides"
    plans_dir = docs_root / "plans"
    guides_dir.mkdir(parents=True)
    plans_dir.mkdir(parents=True)
    (guides_dir / "agent-quickstart.md").write_text("# Agent Quickstart\n", encoding="utf-8")
    (plans_dir / "internal-rollout.md").write_text("# Internal Rollout\n", encoding="utf-8")

    from app.routes import public_docs

    monkeypatch.setattr(public_docs, "DOCS_ROOT", docs_root.resolve())
    monkeypatch.delenv("PUBLIC_DOCS_CATEGORIES", raising=False)

    response = client.get("/api/public/docs")

    assert response.status_code == 200, response.text
    assert response.json() == {
        "categories": ["guides"],
        "files": [
            {
                "category": "guides",
                "name": "agent-quickstart",
                "title": "Agent Quickstart",
            }
        ],
    }


def test_public_docs_blocks_non_public_categories(client, tmp_path, monkeypatch):
    docs_root = tmp_path / "docs"
    plans_dir = docs_root / "plans"
    plans_dir.mkdir(parents=True)
    (plans_dir / "internal-rollout.md").write_text("# Internal Rollout\n", encoding="utf-8")

    from app.routes import public_docs

    monkeypatch.setattr(public_docs, "DOCS_ROOT", docs_root.resolve())
    monkeypatch.delenv("PUBLIC_DOCS_CATEGORIES", raising=False)

    response = client.get("/api/public/docs/plans/internal-rollout")

    assert response.status_code == 404, response.text


def test_public_docs_rejects_symlink_escape_outside_docs_root(client, tmp_path, monkeypatch):
    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    escaped_dir = tmp_path / "docs-evil"
    escaped_dir.mkdir()
    (escaped_dir / "secret.md").write_text("# Escaped Secret\n", encoding="utf-8")
    (docs_root / "guides").symlink_to(escaped_dir, target_is_directory=True)

    from app.routes import public_docs

    monkeypatch.setattr(public_docs, "DOCS_ROOT", docs_root.resolve())
    monkeypatch.delenv("PUBLIC_DOCS_CATEGORIES", raising=False)

    response = client.get("/api/public/docs/guides/secret")

    assert response.status_code == 400, response.text


def test_public_docs_listing_skips_symlinked_markdown_files_outside_docs_root(client, tmp_path, monkeypatch):
    docs_root = tmp_path / "docs"
    guides_dir = docs_root / "guides"
    guides_dir.mkdir(parents=True)
    outside_file = tmp_path / "outside-secret.md"
    outside_file.write_text("# Outside Secret\n", encoding="utf-8")
    (guides_dir / "linked.md").symlink_to(outside_file)

    from app.routes import public_docs

    monkeypatch.setattr(public_docs, "DOCS_ROOT", docs_root.resolve())
    monkeypatch.delenv("PUBLIC_DOCS_CATEGORIES", raising=False)

    response = client.get("/api/public/docs")

    assert response.status_code == 200, response.text
    assert response.json() == {"categories": ["guides"], "files": []}
