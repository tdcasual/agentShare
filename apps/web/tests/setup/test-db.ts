import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type PlaywrightDatabaseRuntime = {
  directory: string;
  databasePath: string;
  databaseUrl: string;
  cleanup: () => void;
};

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
