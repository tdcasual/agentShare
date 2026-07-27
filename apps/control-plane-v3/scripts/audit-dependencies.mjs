import { spawnSync } from 'node:child_process';

const registry = 'https://registry.npmjs.org';
const allowedDevelopmentAdvisories = new Set(['https://github.com/advisories/GHSA-mh99-v99m-4gvg']);

function runAudit(extraArguments) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['audit', '--json', `--registry=${registry}`, ...extraArguments],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  if (!result.stdout) throw new Error(result.stderr || 'npm audit returned no JSON output');
  return { report: JSON.parse(result.stdout), status: result.status ?? 1 };
}

const production = runAudit(['--omit=dev']);
const productionCount = production.report.metadata?.vulnerabilities?.total ?? 0;
if (production.status !== 0 || productionCount !== 0) {
  console.error(`Production dependency audit failed with ${productionCount} vulnerabilities.`);
  process.exit(1);
}

const complete = runAudit([]);
if (complete.status === 0) {
  console.log(
    'Dependency audit passed: production and development dependencies have no advisories.'
  );
  process.exit(0);
}

const advisoryUrls = new Set();
for (const vulnerability of Object.values(complete.report.vulnerabilities ?? {})) {
  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === 'object' && cause.url) advisoryUrls.add(cause.url);
  }
}
const unexpected = [...advisoryUrls].filter((url) => !allowedDevelopmentAdvisories.has(url));
if (unexpected.length > 0 || advisoryUrls.size === 0) {
  console.error(`Unexpected development advisories: ${unexpected.join(', ') || 'unclassified'}`);
  process.exit(1);
}

console.warn(
  `Production dependencies are clean. Temporarily allowing ${[...advisoryUrls].join(', ')} ` +
    'in development-only glob tooling until compatible upstream releases are available.'
);
