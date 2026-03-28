import { defineConfig } from "@playwright/test";
import {
  createPlaywrightDatabaseRuntime,
  registerCleanupHooks,
} from "./tests/setup/test-db";
import { resolveVenvExecutable } from "./tests/setup/runtime-env";

const uvicornBin = resolveVenvExecutable("uvicorn");
const testDatabaseRuntime = createPlaywrightDatabaseRuntime();

registerCleanupHooks(testDatabaseRuntime.cleanup);

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3300",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `env DATABASE_URL=${testDatabaseRuntime.databaseUrl} SECRET_BACKEND=memory BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key ${uvicornBin} app.main:app --app-dir ../api --host 127.0.0.1 --port 3800`,
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
