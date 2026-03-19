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
        "env DATABASE_URL=sqlite:///../../agent_share_playwright_$$.db SECRET_BACKEND=memory BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key ../../.venv/bin/uvicorn app.main:app --app-dir ../api --host 127.0.0.1 --port 8000",
      port: 8000,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command:
        "env AGENT_CONTROL_PLANE_API_URL=http://127.0.0.1:8000 BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key npm run dev -- --hostname 127.0.0.1 --port 3000",
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
