'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { compileLatex } = require('./latex');
const root = path.resolve(__dirname, '../../..');
let busy = false;
function needsFullLatex(source) {
  return /\\(?:begin\{(?:tikzpicture|tabularx)\}|tikzset\b|titleformat\b|newcolumntype\b|maketitle\b)/.test(
    source,
  );
}
async function compilePaper(source, config, mode = 'auto') {
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > 100000)
    throw new Error('Use a nonempty LaTeX document up to 100 KB.');
  if (!['auto', 'web', 'full'].includes(mode)) throw new Error('Choose Auto, Web or Full LaTeX.');
  const full = mode === 'full' || needsFullLatex(source);
  if (!full) return { html: await compileLatex(source), engine: 'web' };
  if (mode === 'web')
    throw new Error(
      'This document needs Full LaTeX to preserve its diagrams or layout. Choose Auto or Full LaTeX.',
    );
  if (process.platform !== 'linux')
    throw new Error(
      'Full LaTeX runs on the production server. Open Web Admin at https://latfs.duckdns.org/admin to compile this document.',
    );
  if (busy) throw new Error('Another full paper is compiling. Try again shortly.');
  busy = true;
  let dir;
  try {
    const bin = path.join(root, 'data/bin/tectonic'),
      cache = path.join(root, 'data/tex-cache');
    await fs.access(bin);
    await fs.access(cache);
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'latfs-full-tex-'));
    // Only explicitly referenced image files enter the isolated job directory.
    let input = source;
    const images = [...source.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g)];
    for (const match of images) {
      const url = match[1];
      if (
        !/^\/(uploads|assets)\/[a-zA-Z0-9/_.-]+\.(png|jpe?g|webp|gif|pdf)$/i.test(url) ||
        url.includes('..')
      )
        throw new Error(
          'Upload figures first and use their /uploads/ paths. External files are not available to the compiler.',
        );
      const base = url.startsWith('/uploads/')
        ? config.uploadsPath
        : path.join(config.publicPath, 'assets');
      const relative = url.replace(/^\/(uploads|assets)\//, '');
      const original = await fs.realpath(path.join(base, relative));
      if (!original.startsWith((await fs.realpath(base)) + path.sep))
        throw new Error('Invalid figure path.');
      const name = 'figure-' + images.indexOf(match) + path.extname(url);
      await fs.copyFile(original, path.join(dir, name));
      input = input.replace(match[0], match[0].replace('{' + url + '}', '{' + name + '}'));
    }
    await fs.writeFile(path.join(dir, 'paper.tex'), input);
    const args = [
      '--as=1073741824',
      '--cpu=45',
      '--fsize=52428800',
      '--nproc=256',
      '--',
      '/usr/bin/bwrap',
      '--die-with-parent',
      '--unshare-all',
      '--ro-bind',
      '/usr',
      '/usr',
      '--symlink',
      'usr/lib',
      '/lib',
      '--symlink',
      'usr/lib64',
      '/lib64',
      '--ro-bind',
      '/etc/fonts',
      '/etc/fonts',
      '--ro-bind',
      bin,
      '/tectonic',
      '--ro-bind',
      cache,
      '/cache',
      '--bind',
      dir,
      '/work',
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '--tmpfs',
      '/tmp',
      '--clearenv',
      '--setenv',
      'HOME',
      '/tmp',
      '--setenv',
      'PATH',
      '/usr/bin',
      '--setenv',
      'TECTONIC_CACHE_DIR',
      '/cache',
      '--chdir',
      '/work',
      '/tectonic',
      '--untrusted',
      '--only-cached',
      '--keep-logs',
      'paper.tex',
    ];
    await new Promise((resolve, reject) => {
      execFile(
        '/usr/bin/prlimit',
        args,
        {
          timeout: 60000,
          killSignal: 'SIGKILL',
          maxBuffer: 1024 * 1024,
          env: { PATH: '/usr/bin:/bin' },
        },
        (error, stdout, stderr) => {
          if (error)
            return reject(
              new Error(
                error.killed
                  ? 'Full LaTeX exceeded its resource limit.'
                  : 'Full LaTeX could not compile: ' + (stderr || stdout).slice(-2500),
              ),
            );
          resolve();
        },
      );
    });
    const pdf = await fs.readFile(path.join(dir, 'paper.pdf'));
    if (pdf.subarray(0, 5).toString() !== '%PDF-')
      throw new Error('The compiler did not produce a PDF.');
    const name = 'compiled_' + crypto.randomUUID() + '.pdf';
    await fs.writeFile(path.join(config.uploadsPath, name), pdf, { flag: 'wx' });
    return { html: '', pdf_url: '/uploads/' + name, engine: 'full' };
  } catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(
        'Full LaTeX or a referenced figure is missing. Contact the website administrator.',
        { cause: error },
      );
    throw error;
  } finally {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
    busy = false;
  }
}
module.exports = { compilePaper, needsFullLatex };
