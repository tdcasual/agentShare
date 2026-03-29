import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPlaywrightApiServerCommand,
  createPlaywrightDatabaseRuntime,
  toSqliteDatabaseUrl,
} from "./test-db";

test("toSqliteDatabaseUrl returns an absolute sqlite URL", () => {
  const url = toSqliteDatabaseUrl("/tmp/agent-share/example.db");

  assert.equal(url, "sqlite:////tmp/agent-share/example.db");
});

test("createPlaywrightDatabaseRuntime creates temp-rooted unique directories and cleans them up", () => {
  const runtimeA = createPlaywrightDatabaseRuntime("run-a");
  const runtimeB = createPlaywrightDatabaseRuntime("run-b");

  assert.notEqual(runtimeA.directory, runtimeB.directory);
  assert.equal(path.dirname(runtimeA.databasePath), runtimeA.directory);
  assert.equal(path.dirname(runtimeB.databasePath), runtimeB.directory);
  assert.ok(runtimeA.directory.startsWith(os.tmpdir()));
  assert.ok(runtimeB.directory.startsWith(os.tmpdir()));
  assert.ok(runtimeA.databaseUrl.startsWith("sqlite:////"));
  assert.ok(runtimeB.databaseUrl.startsWith("sqlite:////"));

  fs.writeFileSync(runtimeA.databasePath, "ok");
  fs.writeFileSync(runtimeB.databasePath, "ok");
  assert.ok(fs.existsSync(runtimeA.databasePath));
  assert.ok(fs.existsSync(runtimeB.databasePath));

  runtimeA.cleanup();
  runtimeB.cleanup();

  assert.equal(fs.existsSync(runtimeA.directory), false);
  assert.equal(fs.existsSync(runtimeB.directory), false);
});

test("buildPlaywrightApiServerCommand makes migrations explicit before booting uvicorn", () => {
  const runtime = createPlaywrightDatabaseRuntime("run-api");
  const command = buildPlaywrightApiServerCommand({
    apiDir: "/workspace/apps/api",
    pythonBin: "/workspace/.venv/bin/python",
    uvicornBin: "/workspace/.venv/bin/uvicorn",
    databaseUrl: runtime.databaseUrl,
  });

  assert.match(command, /cd '?\/workspace\/apps\/api'?/);
  assert.match(command, /DATABASE_URL=/);
  assert.match(command, /SECRET_BACKEND=memory/);
  assert.match(command, /bootstrap_agent_key|BOOTSTRAP_AGENT_KEY/i);
  assert.match(command, /alembic/i);
  assert.match(command, /upgrade/);
  assert.match(command, /head/);
  assert.match(command, /uvicorn/);

  runtime.cleanup();
});
