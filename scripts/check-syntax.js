'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const excluded = new Set(['.git', 'node_modules', 'vendor', 'uploads', 'coverage', 'data']);
let count = 0;
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name)) visit(file);
    } else if (/\.(?:js|mjs|cjs)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr || `Invalid JavaScript: ${file}`);
      count++;
    } else if (file.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      for (const [, attributes, source] of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      )) {
        if (
          !source.trim() ||
          /\bsrc\s*=|type=["'](?:application\/ld\+json|module)["']/i.test(attributes)
        )
          continue;
        new vm.Script(source, { filename: file });
        count++;
      }
    }
  }
}
visit(root);
console.log(`Syntax checked ${count} JavaScript sources.`);
