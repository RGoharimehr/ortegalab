'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
function setup(t) {
  const dom = new JSDOM(
    '<div id="root"><div><input id="photo" type="file" data-photo-target="#url"></div><input id="url"></div>',
    { runScripts: 'outside-only' },
  );
  t.after(() => dom.window.close());
  const w = dom.window,
    calls = [];
  w.apiGet = async () => [
    { image_url: '/uploads/existing.jpg', caption: 'Conference booth', category: 'Exhibition' },
  ];
  w.api = async (url) => {
    calls.push(url);
    return { url: '/uploads/private.jpg' };
  };
  w.uploadGallery = async (...args) => {
    calls.push(args);
    return { image_url: '/uploads/shared.jpg' };
  };
  w.eval(fs.readFileSync('public/js/admin/photo-library.js', 'utf8'));
  w.installPhotoControls(w.document.querySelector('#root'));
  return { w, calls, doc: w.document };
}
test('gallery picker reuses existing URL and clears upload and public opt-in', async (t) => {
  const { w, calls, doc } = setup(t);
  const check = doc.querySelector('[data-add]');
  check.checked = true;
  await doc.querySelector('[data-browse]').onclick();
  assert.match(doc.querySelector('[data-results]').textContent, /Exhibition/);
  doc.querySelector('[data-results] button').click();
  assert.equal(doc.querySelector('#url').value, '/uploads/existing.jpg');
  assert.equal(check.checked, false);
  assert.equal(calls.length, 0);
  assert.equal(doc.querySelector('[data-picker]').hidden, true);
  assert.ok(w);
});
test('checked upload goes to gallery once with selected tag and reuses same URL on retry', async (t) => {
  const { w, calls, doc } = setup(t);
  const file = new w.File(['photo'], 'photo.png', { type: 'image/png' });
  Object.defineProperty(doc.querySelector('#photo'), 'files', { value: [file] });
  doc.querySelector('[data-add]').checked = true;
  doc.querySelector('[data-tag]').value = 'Exhibition';
  doc.querySelector('[data-caption]').value = 'Lab exhibition';
  assert.equal(await w.uploadContentPhoto(file), '/uploads/shared.jpg');
  assert.equal(await w.uploadContentPhoto(file), '/uploads/shared.jpg');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'Lab exhibition');
  assert.equal(calls[0][3], 'Exhibition');
});
test('unchecked upload remains outside the gallery', async (t) => {
  const { w, calls } = setup(t);
  assert.equal(
    await w.uploadContentPhoto(new w.File(['photo'], 'photo.png')),
    '/uploads/private.jpg',
  );
  assert.deepEqual(calls, ['/api/upload/photo']);
});
