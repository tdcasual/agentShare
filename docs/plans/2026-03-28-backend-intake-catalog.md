# Backend Intake Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a backend management API that exposes the current intake resource kinds and variants as structured catalog data.

**Architecture:** Keep the existing create routes unchanged and add a small read-only catalog layer under `apps/api`. The new catalog service will return resource kinds, variants, sections, and field metadata that closely mirror the current frontend contract model, including dynamic option-source hints where the backend should not inline live inventory.

**Tech Stack:** FastAPI, Pydantic schemas, existing management-session auth, pytest, current OpenAPI contract tests.

---

### Task 1: Add failing tests for the intake catalog route

**Files:**
- Create: `apps/api/tests/test_intake_catalog_api.py`
- Modify: `apps/api/tests/test_openapi_contract.py`

### Task 2: Implement the intake catalog schemas and service

**Files:**
- Create: `apps/api/app/schemas/intake_catalog.py`
- Create: `apps/api/app/services/intake_catalog.py`

### Task 3: Expose the intake catalog route

**Files:**
- Create: `apps/api/app/routes/intake_catalog.py`
- Modify: `apps/api/app/main.py`

### Task 4: Verify the backend implementation

**Checks:**
- `cd apps/api && pytest tests/test_intake_catalog_api.py tests/test_openapi_contract.py -q`
- `cd apps/api && pytest -q`
