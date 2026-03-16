import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "env SECRET_BACKEND=memory ../../.venv/bin/uvicorn app.main:app --app-dir ../api --host 127.0.0.1 --port 8000",
      port: 8000,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command:
        "env AGENT_CONTROL_PLANE_API_URL=http://127.0.0.1:8000 npm run dev -- --hostname 127.0.0.1 --port 3000",
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
