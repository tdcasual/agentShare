import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, Page } from "@playwright/test";

import { resolveVenvExecutable } from "./setup/runtime-env";

type ManagementRole = "viewer" | "operator" | "admin" | "owner";

const MANAGEMENT_SESSION_SECRET = "changeme-management-session-secret";
const MANAGEMENT_SESSION_COOKIE = "management_session";

function getPlaywrightRuntimeDatabaseUrl() {
  const runtimeStatePath = path.resolve(__dirname, "../.playwright-runtime.json");
  if (!fs.existsSync(runtimeStatePath)) {
    throw new Error(`Playwright runtime state file is missing: ${runtimeStatePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(runtimeStatePath, "utf8")) as {
    databaseUrl?: string;
  };
  if (!payload.databaseUrl) {
    throw new Error("Playwright runtime state does not include a databaseUrl.");
  }
  return payload.databaseUrl;
}

function buildPersistedManagementSession(role: ManagementRole, actorId = `ops.${role}`) {
  const databaseUrl = getPlaywrightRuntimeDatabaseUrl();
  const pythonBin = resolveVenvExecutable("python");
  const apiDir = path.resolve(__dirname, "../../api");
  const script = `
import json
import os
import time
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import Settings
from app.orm.management_session import ManagementSessionModel
from app.repositories.management_session_repo import ManagementSessionRepository
from app.schemas.sessions import ManagementSessionPayload
from app.services.session_service import issue_management_session_token

role = os.environ["MANAGEMENT_ROLE"]
actor_id = os.environ["MANAGEMENT_ACTOR_ID"]
issued_at = int(time.time()) - 5
payload = ManagementSessionPayload(
    sub=actor_id,
    actor_id=actor_id,
    actor_type="human",
    role=role,
    auth_method="session",
    session_id=f"session-{uuid4().hex}",
    iat=issued_at,
    exp=issued_at + 3600,
    ver=1,
)
engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
ManagementSessionModel.__table__.create(bind=engine, checkfirst=True)
with Session(engine) as session:
    repo = ManagementSessionRepository(session)
    repo.create(ManagementSessionModel(
        session_id=payload.session_id,
        actor_id=payload.actor_id,
        role=payload.role,
        issued_at=datetime.fromtimestamp(payload.iat, tz=timezone.utc),
        expires_at=datetime.fromtimestamp(payload.exp, tz=timezone.utc),
    ))
    session.commit()
settings = Settings(management_session_secret=os.environ["MANAGEMENT_SESSION_SECRET"])
print(json.dumps({"token": issue_management_session_token(settings, payload)}))
  `.trim();
  const output = execFileSync(pythonBin, ["-c", script], {
    cwd: apiDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      MANAGEMENT_ROLE: role,
      MANAGEMENT_ACTOR_ID: actorId,
      MANAGEMENT_SESSION_SECRET,
    },
    encoding: "utf8",
  });

  return JSON.parse(output) as { token: string };
}

export async function setChineseLocale(page: Page) {
  await page.context().addCookies([
    {
      name: "acp_lang",
      value: "zh",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function loginToManagementConsole(page: Page, nextPath = "/secrets") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page
    .getByLabel(/Bootstrap management credential|管理引导口令/)
    .fill("changeme-bootstrap-key");
  await page
    .getByRole("button", { name: /Create management session|创建管理会话/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`${nextPath.replace("/", "\\/")}$`));
}

export async function useManagementRole(page: Page, role: ManagementRole) {
  const session = buildPersistedManagementSession(role);
  await page.context().addCookies([
    {
      name: MANAGEMENT_SESSION_COOKIE,
      value: session.token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
