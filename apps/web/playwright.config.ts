import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "@playwright/test";
import {
  type PlaywrightDatabaseRuntime,
  buildPlaywrightApiServerCommand,
  createPlaywrightDatabaseRuntime,
} from "./tests/setup/test-db";
import { resolveVenvExecutable } from "./tests/setup/runtime-env";

const apiDir = path.resolve(__dirname, "../api");
const pythonBin = resolveVenvExecutable("python");
const uvicornBin = resolveVenvExecutable("uvicorn");
const runtimeStatePath = path.resolve(__dirname, ".playwright-runtime.json");
const testDatabaseRuntime = loadOrCreatePlaywrightDatabaseRuntime(runtimeStatePath);

function loadOrCreatePlaywrightDatabaseRuntime(
  statePath: string,
): PlaywrightDatabaseRuntime {
  if (fs.existsSync(statePath)) {
    const payload = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      directory: string;
      databasePath: string;
      databaseUrl: string;
    };
    if (fs.existsSync(payload.directory)) {
      return {
        ...payload,
        cleanup() {
          fs.rmSync(payload.directory, { recursive: true, force: true });
        },
      };
    }
  }

  const runtime = createPlaywrightDatabaseRuntime();
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        directory: runtime.directory,
        databasePath: runtime.databasePath,
        databaseUrl: runtime.databaseUrl,
      },
      null,
      2,
    ),
  );
  return runtime;
}

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3300",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: buildPlaywrightApiServerCommand({
        apiDir,
        pythonBin,
        uvicornBin,
        databaseUrl: testDatabaseRuntime.databaseUrl,
      }),
      port: 3800,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command:
        "env AGENT_CONTROL_PLANE_API_URL=http://127.0.0.1:3800 BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key npm run dev -- --hostname 127.0.0.1 --port 3300",
      port: 3300,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
