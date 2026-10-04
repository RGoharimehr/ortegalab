'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compileLatex, cleanHtml } = require('../src/server/services/latex');
const available = fs.existsSync(
  process.env.PANDOC_PATH || path.join(__dirname, '../data/bin/pandoc'),
);
test('compiled HTML rejects scripts, remote images, unsafe links and inline styling', () => {
  const html = cleanHtml(
    '<script>alert(1)</script><img src="https://evil.test/a.png"><img src="/uploads/a.png" onerror="alert(1)"><a href="javascript:alert(1)">link</a><p style="position:fixed">Text</p><math><msup><mi>x</mi><mn>2</mn></msup></math>',
  );
  assert.doesNotMatch(html, /script|onerror|evil.test|style=/);
  assert.match(html, /\/uploads\/a.png/);
  assert.match(html, /<msup>/);
});
test(
  'shared LaTeX template compiles equations and an editable table into semantic HTML',
  { skip: !available },
  async () => {
    const html = await compileLatex(
      fs.readFileSync(
        path.join(__dirname, '../public/templates/LATFS-White-Paper-Template.tex'),
        'utf8',
      ),
    );
    assert.match(html, /<h2[^>]*>Introduction/);
    assert.match(html, /<math/);
    assert.match(html, /<table>/);
    assert.match(html, /<caption>/);
  },
);
test(
  'LaTeX sandbox blocks file reads, rejects broken syntax and oversized input',
  { skip: !available },
  async () => {
    await assert.rejects(compileLatex('\\input{/etc/passwd}'), /compile|content/i);
    await assert.rejects(compileLatex('\\section{Unclosed'), /compile/i);
    await assert.rejects(compileLatex('x'.repeat(100001)), /100 KB/);
    const html = await compileLatex('\\section{Still working}\nText.');
    assert.match(html, /Still working/);
  },
);
