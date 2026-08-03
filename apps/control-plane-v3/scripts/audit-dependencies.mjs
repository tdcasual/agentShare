import { spawnSync } from 'node:child_process';

const registry = 'https://registry.npmjs.org';
const allowedDevelopmentAdvisories = new Map([
  [
    'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
    {
      expiresOn: '2026-09-30',
      reason: 'Development-only glob tooling; production dependency graph is unaffected.',
    },
  ],
]);

const today = new Date().toISOString().slice(0, 10);
const expiredAllowances = [...allowedDevelopmentAdvisories.entries()].filter(
  ([, allowance]) => allowance.expiresOn < today
);
if (expiredAllowances.length > 0) {
  console.error(
    `Expired development advisory allowances: ${expiredAllowances
      .map(([url, allowance]) => `${url} (expired ${allowance.expiresOn})`)
      .join(', ')}`
  );
  process.exit(1);
}

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
  if (allowedDevelopmentAdvisories.size > 0) {
    console.error(
      `Development advisory allowlist is stale: ${[...allowedDevelopmentAdvisories.keys()].join(', ')}`
    );
    process.exit(1);
  }
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
const unusedAllowances = [...allowedDevelopmentAdvisories.keys()].filter(
  (url) => !advisoryUrls.has(url)
);
if (unexpected.length > 0 || advisoryUrls.size === 0 || unusedAllowances.length > 0) {
  console.error(`Unexpected development advisories: ${unexpected.join(', ') || 'unclassified'}`);
  if (unusedAllowances.length > 0) {
    console.error(`Stale development advisory allowances: ${unusedAllowances.join(', ')}`);
  }
  process.exit(1);
}

console.warn(
  `Production dependencies are clean. Temporarily allowing ${[...advisoryUrls].join(', ')} ` +
    `until ${[...allowedDevelopmentAdvisories.values()][0].expiresOn}.`
);
