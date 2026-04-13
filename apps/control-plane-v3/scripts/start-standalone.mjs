import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

const standaloneRoot = path.join(appRoot, '.next', 'standalone');
const standaloneServer = path.join(standaloneRoot, 'server.js');
const standaloneNextDir = path.join(standaloneRoot, '.next');
const standaloneStaticDir = path.join(standaloneNextDir, 'static');
const standalonePublicDir = path.join(standaloneRoot, 'public');

const sourceStaticDir = path.join(appRoot, '.next', 'static');
const sourcePublicDir = path.join(appRoot, 'public');

function ensureExists(targetPath, hint) {
  if (!existsSync(targetPath)) {
    throw new Error(`${hint} not found: ${targetPath}`);
  }
}

function syncDir(source, destination) {
  ensureExists(source, 'Required source directory');
  cpSync(source, destination, { recursive: true, force: true });
}

ensureExists(standaloneServer, 'Next standalone server');

syncDir(sourceStaticDir, standaloneStaticDir);
if (existsSync(sourcePublicDir)) {
  syncDir(sourcePublicDir, standalonePublicDir);
}

const child = spawn(process.execPath, [standaloneServer], {
  cwd: appRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
    PORT: process.env.PORT || '3000',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
