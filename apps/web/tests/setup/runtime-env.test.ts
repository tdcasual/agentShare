import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveVenvExecutable } from "./runtime-env";

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agent-share-runtime-env-"));
}

test("resolveVenvExecutable prefers the explicit environment override", () => {
  const root = createTempDir();
  const override = path.join(root, "custom-bin", "uvicorn");
  fs.mkdirSync(path.dirname(override), { recursive: true });
  fs.writeFileSync(override, "");

  const resolved = resolveVenvExecutable("uvicorn", {
    startDir: path.join(root, "apps", "web"),
    env: { AGENT_SHARE_API_UVICORN_BIN: override },
  });

  assert.equal(resolved, override);
});

test("resolveVenvExecutable walks upward until it finds the shared .venv", () => {
  const root = createTempDir();
  const nested = path.join(root, "apps", "web");
  const executable = path.join(root, ".venv", "bin", "uvicorn");
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(executable, "");

  const resolved = resolveVenvExecutable("uvicorn", {
    startDir: nested,
    env: {},
  });

  assert.equal(resolved, executable);
});

test("resolveVenvExecutable explains how to bootstrap the dev runtime when missing", () => {
  const root = createTempDir();
  fs.mkdirSync(path.join(root, "apps", "web"), { recursive: true });

  assert.throws(
    () => resolveVenvExecutable("uvicorn", {
      startDir: path.join(root, "apps", "web"),
      env: {},
    }),
    /bootstrap-dev-runtime\.sh/,
  );
});
