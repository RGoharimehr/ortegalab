'use strict';

// Run after `docker build -t latfs:ci .`. All state belongs to uniquely named
// disposable containers/volumes; no host application directories are mounted.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const image = process.argv[2] || 'latfs:ci';
const prefix = `latfs-smoke-${randomUUID().slice(0, 8)}`;
const containers = new Set();
const volumes = [`${prefix}-db`, `${prefix}-uploads`];
const secret = randomUUID() + randomUUID();

function docker(args, { allowFailure = false, timeout = 30000 } = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(
      `Docker ${args[0]} failed: ${result.error?.message || result.stderr || result.stdout}`,
    );
  }
  return result;
}

function exec(container, source) {
  return docker(['exec', container, 'node', '-e', source]).stdout.trim();
}

function remove(container) {
  docker(['rm', '--force', container], { allowFailure: true });
  containers.delete(container);
}

function start(suffix, extra = []) {
  const container = `${prefix}-${suffix}`;
  containers.add(container);
  docker([
    'run',
    '--detach',
    '--name',
    container,
    '--env',
    `SESSION_SECRET=${secret}`,
    '--env',
    'PORT=3000',
    ...extra,
    image,
  ]);
  return container;
}

async function waitHealthy(container) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = docker(
      [
        'exec',
        container,
        'node',
        '-e',
        "fetch('http://127.0.0.1:3000/healthz').then(async r=>process.exit(r.ok && (await r.json()).ok ? 0 : 1)).catch(()=>process.exit(1))",
      ],
      { allowFailure: true, timeout: 5000 },
    );
    if (response.status === 0) return;
    const state = docker(['inspect', '--format', '{{.State.Status}}', container], {
      allowFailure: true,
    });
    if (state.stdout.trim() !== 'running') break;
    await delay(500);
  }
  throw new Error(
    `Container failed health check:\n${docker(['logs', container], { allowFailure: true }).stderr}`,
  );
}

const mountedState = [
  '--read-only',
  '--tmpfs',
  '/tmp:rw,nosuid,noexec,size=16m',
  '--mount',
  `type=volume,source=${volumes[0]},target=/app/data`,
  '--mount',
  `type=volume,source=${volumes[1]},target=/app/uploads`,
];

async function main() {
  // Reproduce Render's plain Docker launch: no DATABASE_PATH/UPLOADS_PATH override.
  let container = start('defaults');
  await waitHealthy(container);
  exec(
    container,
    `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    assert.notEqual(process.getuid(), 0, 'The server must run as a non-root user');
    assert.equal(process.env.DATABASE_PATH, '/app/data/latfs.db');
    assert.equal(process.env.UPLOADS_PATH, '/app/uploads');
    assert.ok(fs.statSync(process.env.DATABASE_PATH).isFile());
    fs.writeFileSync(process.env.UPLOADS_PATH + '/smoke.txt', 'writable');
  `,
  );
  remove(container);
  console.log('Default image paths start successfully as the non-root runtime user.');

  // Existing Compose volume destinations retain their data across replacement.
  container = start('persist', mountedState);
  await waitHealthy(container);
  exec(
    container,
    `
    const db = new (require('better-sqlite3'))(process.env.DATABASE_PATH);
    db.prepare("INSERT INTO news (title, content, date) VALUES (?, ?, ?)").run('Docker persistence smoke', 'Keep across replacement', '2026-01-01');
    db.close();
    require('node:fs').writeFileSync(process.env.UPLOADS_PATH + '/persistence.txt', 'keep-this-upload');
  `,
  );
  docker(['stop', '--time', '10', container]);
  remove(container);
  container = start('restored', mountedState);
  await waitHealthy(container);
  exec(
    container,
    `
    const assert = require('node:assert/strict');
    const db = new (require('better-sqlite3'))(process.env.DATABASE_PATH, { readonly: true });
    assert.equal(db.prepare("SELECT content FROM news WHERE title=?").get('Docker persistence smoke').content, 'Keep across replacement');
    db.close();
    assert.equal(require('node:fs').readFileSync(process.env.UPLOADS_PATH + '/persistence.txt', 'utf8'), 'keep-this-upload');
  `,
  );
  docker(['stop', '--time', '10', container]);
  remove(container);
  console.log(
    'Database and uploads survive container replacement with a read-only application filesystem.',
  );

  // Render can keep both storage paths beneath one explicitly configured disk.
  container = start('override', [
    ...mountedState,
    '--env',
    'DATABASE_PATH=/app/data/custom/latfs.db',
    '--env',
    'UPLOADS_PATH=/app/data/custom/uploads',
  ]);
  await waitHealthy(container);
  exec(
    container,
    `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    assert.ok(fs.statSync('/app/data/custom/latfs.db').isFile());
    fs.writeFileSync('/app/data/custom/uploads/override.txt', 'writable');
    assert.ok(fs.statSync('/app/data/latfs.db').isFile(), 'Existing data must stay in place');
  `,
  );
  docker(['stop', '--time', '10', container]);
  remove(container);
  console.log('Explicit database and upload paths work under a shared disk mount.');

  // Mount permissions cannot be repaired by image-layer ownership. Fail clearly.
  for (const [setting, volume, target] of [
    ['DATABASE_PATH', volumes[0], '/app/data'],
    ['UPLOADS_PATH', volumes[1], '/app/uploads'],
  ]) {
    container = start(`readonly-${setting.toLowerCase()}`, [
      '--mount',
      `type=volume,source=${volume},target=${target},readonly`,
    ]);
    const exitCode = docker(['wait', container], { timeout: 15000 }).stdout.trim();
    assert.notEqual(exitCode, '0', 'A read-only data mount must fail startup');
    const logs = docker(['logs', container]);
    assert.ok((logs.stdout + logs.stderr).includes(`Cannot use ${setting}`));
    assert.ok((logs.stdout + logs.stderr).includes('UID '));
    remove(container);
  }
  console.log('Read-only database/upload mounts produce actionable diagnostics.');
}

main()
  .catch((error) => {
    console.error(error.message);
    for (const container of containers) {
      const result = docker(['logs', container], { allowFailure: true });
      if (result.stdout || result.stderr) console.error(result.stdout + result.stderr);
    }
    process.exitCode = 1;
  })
  .finally(() => {
    for (const container of containers) remove(container);
    for (const volume of volumes) docker(['volume', 'rm', volume], { allowFailure: true });
  });
