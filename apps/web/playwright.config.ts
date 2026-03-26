import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3300",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "env DATABASE_URL=sqlite:///../../agent_share_playwright_$$.db SECRET_BACKEND=memory BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key ../../.venv/bin/uvicorn app.main:app --app-dir ../api --host 127.0.0.1 --port 3800",
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
