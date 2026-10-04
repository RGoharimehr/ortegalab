'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { prepareWebLatex } = require('../src/server/services/latex-web');
const { compileLatex } = require('../src/server/services/latex');
test('custom table columns, diagram captions and numbered reference links survive normalization', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'fixtures/full-latex.tex'), 'utf8');
  const web = prepareWebLatex(source, ['/uploads/compiled_diagram_test.svg']);
  assert.equal(web.diagrams.length, 1);
  assert.equal(web.tableCount, 1);
  assert.match(web.source, /\\begin\{tabular\}\{ll\}/);
  assert.match(web.source, /\\hyperref\[fig:validation\]\{1\}/);
  if (fs.existsSync(path.join(__dirname, '../data/bin/pandoc'))) {
    const html = await compileLatex(web.source);
    assert.match(html, /<table/);
    assert.match(html, /compiled_diagram_test.svg/);
    assert.match(html, /Figure 1/);
    assert.match(html, /Table 1/);
  }
});
test('nested column definitions and bibliography links remain native markup', () => {
  const web = prepareWebLatex(
    String.raw`\newcolumntype{L}{>{\raggedright\arraybackslash}X}\begin{document}\begin{table}\caption{Data}\begin{tabularx}{\linewidth}{p{0.3\linewidth}*{2}{L}}A & B & C \\ 1 & 2 & 3 \\\end{tabularx}\end{table}\cite{a}\begin{thebibliography}{1}\bibitem{a}A source\end{thebibliography}\end{document}`,
  );
  assert.match(web.source, /\\begin\{tabular\}\{lll\}/);
  assert.match(web.source, /\\hyperlink\{bib-a\}\{\[1\]\}/);
  assert.match(web.source, /\\hypertarget\{bib-a\}/);
  assert.throws(
    () =>
      prepareWebLatex(
        String.raw`\begin{document}\begin{table}\begin{tabularx}{\linewidth}{Z}A\end{tabularx}\end{table}\end{document}`,
      ),
    /Unsupported table column/,
  );
});
