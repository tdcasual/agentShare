import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_BOOTSTRAP_AGENT_KEY = "changeme-bootstrap-key";

export type PlaywrightDatabaseRuntime = {
  directory: string;
  databasePath: string;
  databaseUrl: string;
  cleanup: () => void;
};

export type PlaywrightApiServerCommandOptions = {
  apiDir: string;
  pythonBin: string;
  uvicornBin: string;
  databaseUrl: string;
  host?: string;
  port?: number;
  bootstrapAgentKey?: string;
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function toSqliteDatabaseUrl(databasePath: string): string {
  const absolutePath = path.resolve(databasePath);
  return `sqlite:////${absolutePath.replace(/^\/+/, "")}`;
}

export function createPlaywrightDatabaseRuntime(
  suffix = `${Date.now()}-${process.pid}`,
): PlaywrightDatabaseRuntime {
  const prefix = path.join(os.tmpdir(), "agent-share-playwright-");
  const directory = fs.mkdtempSync(prefix);
  const databasePath = path.join(directory, `${suffix}.db`);

  return {
    directory,
    databasePath,
    databaseUrl: toSqliteDatabaseUrl(databasePath),
    cleanup() {
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

export function buildPlaywrightApiServerCommand({
  apiDir,
  pythonBin,
  uvicornBin,
  databaseUrl,
  host = "127.0.0.1",
  port = 3800,
  bootstrapAgentKey = DEFAULT_BOOTSTRAP_AGENT_KEY,
}: PlaywrightApiServerCommandOptions): string {
  const envPrefix = [
    `DATABASE_URL=${shellQuote(databaseUrl)}`,
    "SECRET_BACKEND=memory",
    `BOOTSTRAP_AGENT_KEY=${shellQuote(bootstrapAgentKey)}`,
  ].join(" ");
  const alembicCommand = `${envPrefix} ${shellQuote(pythonBin)} -c ${shellQuote(
    "from alembic.config import main; main(argv=['-c', 'alembic.ini', 'upgrade', 'head'])",
  )}`;
  const apiCommand = `${envPrefix} ${shellQuote(uvicornBin)} app.main:app --app-dir . --host ${host} --port ${port}`;

  return `cd ${shellQuote(apiDir)} && ${alembicCommand} && ${apiCommand}`;
}

export function registerCleanupHooks(cleanup: () => void) {
  const once = () => {
    cleanup();
  };

  process.once("exit", once);
  process.once("SIGINT", () => {
    once();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    once();
    process.exit(143);
  });
}
