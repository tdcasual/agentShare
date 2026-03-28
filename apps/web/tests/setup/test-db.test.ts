import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
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
