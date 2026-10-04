'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { compilePaper, needsFullLatex } = require('../src/server/services/full-latex');
const ready =
  process.platform === 'linux' && fs.existsSync(path.join(__dirname, '../data/bin/tectonic'));
test('advanced LaTeX selects the full engine instead of silently dropping content', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'fixtures/full-latex.tex'), 'utf8');
  assert.equal(needsFullLatex(source), true);
  assert.equal(needsFullLatex('\\section{Introduction}\nText'), false);
  await assert.rejects(compilePaper(source, {}, 'web'), /Full LaTeX/);
});
test(
  'full compiler renders TikZ and custom tables offline and cannot read app files',
  { skip: !ready },
  async () => {
    const uploadsPath = fs.mkdtempSync(path.join(os.tmpdir(), 'latfs-tex-test-'));
    try {
      const config = { uploadsPath, publicPath: path.join(__dirname, '../public') };
      const result = await compilePaper(
        fs.readFileSync(path.join(__dirname, 'fixtures/full-latex.tex'), 'utf8'),
        config,
        'full',
      );
      assert.equal(result.engine, 'full');
      assert.match(result.pdf_url, /^\/uploads\/compiled_/);
      assert.equal(
        fs
          .readFileSync(path.join(uploadsPath, path.basename(result.pdf_url)))
          .subarray(0, 5)
          .toString(),
        '%PDF-',
      );
      await assert.rejects(
        compilePaper(
          '\\documentclass{article}\\begin{document}\\input{/var/www/ortegalab/package.json}\\end{document}',
          config,
          'full',
        ),
        /could not compile/,
      );
      await assert.rejects(
        compilePaper('\\documentclass{article}\\begin{document}\\section{Broken', config, 'full'),
        /could not compile/,
      );
    } finally {
      fs.rmSync(uploadsPath, { recursive: true, force: true });
    }
  },
);
