import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This directory contains only ignored compiler output. Clear stale declarations
// before emitting the public entry's dependency graph, not every vendored module.
const outputDirectory = fileURLToPath(
  new URL('./declarations', import.meta.url),
);
rmSync(outputDirectory, { force: true, recursive: true });
const result = spawnSync(
  'pnpm',
  ['exec', 'ember-tsc', '--declaration', '--project', 'tsconfig.publish.json'],
  {
    stdio: 'inherit',
  },
);
if (result.status !== 0) {
  rmSync(outputDirectory, { force: true, recursive: true });
  process.exit(result.status ?? 1);
}
