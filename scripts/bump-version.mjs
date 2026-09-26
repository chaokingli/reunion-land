import { readFileSync, writeFileSync } from 'node:fs';

const files = ['package.json', 'project/server/package.json'];

function bump(version) {
  const parts = version.split('.').map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) {
    throw new Error(`expected semver x.y.z, got ${version}`);
  }
  parts[2] += 1;
  return parts.join('.');
}

const root = JSON.parse(readFileSync(files[0], 'utf8'));
const next = bump(root.version);

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.version = next;
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

process.stdout.write(`${next}\n`);
