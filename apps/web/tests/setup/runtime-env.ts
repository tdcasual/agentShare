import fs from "node:fs";
import path from "node:path";

type RuntimeEnvOptions = {
  startDir?: string;
  env?: Record<string, string | undefined>;
};

const UVICORN_OVERRIDE_ENV = "AGENT_SHARE_API_UVICORN_BIN";

export function resolveVenvExecutable(
  executable: string,
  options: RuntimeEnvOptions = {},
) {
  const startDir = options.startDir ?? __dirname;
  const env = options.env ?? process.env;
  const override = env[UVICORN_OVERRIDE_ENV];
  if (override) {
    return override;
  }

  let currentDir = startDir;
  while (true) {
    const candidate = path.join(currentDir, ".venv", "bin", executable);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        `Unable to find .venv/bin/${executable} from ${startDir}. Run scripts/ops/bootstrap-dev-runtime.sh or set ${UVICORN_OVERRIDE_ENV}.`,
      );
    }
    currentDir = parentDir;
  }
}
