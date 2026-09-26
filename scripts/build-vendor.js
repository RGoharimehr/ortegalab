'use strict';

const { copyFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, '..', 'public', 'vendor');
mkdirSync(output, { recursive: true });
const entry = require.resolve('lucide');
copyFileSync(
  path.join(path.dirname(entry), '..', 'umd', 'lucide.min.js'),
  path.join(output, 'lucide.min.js'),
);
copyFileSync(
  path.join(path.dirname(entry), '..', '..', 'LICENSE'),
  path.join(output, 'lucide.LICENSE'),
);
console.log('Built local Lucide icon bundle.');
