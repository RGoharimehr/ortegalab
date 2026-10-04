'use strict';
const { execFile } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const sanitize = require('sanitize-html');
let busy = false;
const mathTags =
  'math semantics annotation mrow mi mn mo ms mtext mspace mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mtr mtd'.split(
    ' ',
  );
function cleanHtml(html) {
  return sanitize(html, {
    allowedTags: [...sanitize.defaults.allowedTags, 'img', 'figure', 'figcaption', ...mathTags],
    allowedAttributes: {
      '*': ['id', 'class'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      ...Object.fromEntries(
        mathTags.map((tag) => [
          tag,
          [
            'display',
            'xmlns',
            'encoding',
            'mathvariant',
            'stretchy',
            'accent',
            'accentunder',
            'columnalign',
            'rowspacing',
            'columnspacing',
            'linethickness',
            'width',
            'height',
            'depth',
            'lspace',
            'rspace',
            'displaystyle',
            'scriptlevel',
          ],
        ]),
      ),
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === 'img' &&
      ((!/^\/(uploads|assets)\/[a-zA-Z0-9/_.-]+\.(png|jpe?g|webp|gif)$/i.test(
        frame.attribs.src || '',
      ) &&
        !/^\/uploads\/compiled_diagram_[a-zA-Z0-9_-]+\.svg$/.test(frame.attribs.src || '')) ||
        frame.attribs.src.includes('..')),
  });
}
async function compileLatex(source) {
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > 100000)
    throw new Error('Use a nonempty LaTeX document up to 100 KB.');
  if (busy) throw new Error('Another paper is compiling. Try again in a moment.');
  busy = true;
  let dir;
  try {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'latfs-tex-'));
    const executable =
      process.env.PANDOC_PATH || path.resolve(__dirname, '../../../data/bin/pandoc');
    const html = await new Promise((resolve, reject) => {
      const child = execFile(
        executable,
        [
          '--sandbox',
          '--from=latex',
          '--to=html5',
          '--math-method=mathml',
          '--shift-heading-level-by=1',
          '--fail-if-warnings',
          '+RTS',
          '-M128m',
          '-RTS',
        ],
        {
          cwd: dir,
          timeout: 15000,
          killSignal: 'SIGKILL',
          maxBuffer: 2 * 1024 * 1024,
          env: { PATH: '/usr/bin:/bin', HOME: dir, LANG: 'C.UTF-8' },
        },
        (error, stdout, stderr) => {
          if (error)
            return reject(
              new Error(
                error.code === 'ENOENT'
                  ? 'LaTeX compiler is not installed. Contact the website administrator.'
                  : error.killed
                    ? 'Compilation exceeded 15 seconds. Simplify the document.'
                    : `LaTeX could not compile: ${stderr.slice(0, 2000) || 'Check the document syntax.'}`,
              ),
            );
          resolve(stdout);
        },
      );
      child.stdin.on('error', () => {});
      child.stdin.end(source);
    });
    const clean = cleanHtml(html);
    if ((html.match(/<img\b/g) || []).length !== (clean.match(/<img\b/g) || []).length)
      throw new Error(
        'Figures must use uploaded /uploads/ or site /assets/ PNG, JPEG, WebP or GIF paths. Upload the image in this editor.',
      );
    if (!clean.trim())
      throw new Error('No page content was generated. Add sections and text inside the document.');
    return clean;
  } finally {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
    busy = false;
  }
}
module.exports = { compileLatex, cleanHtml };
