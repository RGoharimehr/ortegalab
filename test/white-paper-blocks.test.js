'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBlocks } = require('../src/server/services/white-paper-blocks');
test('report template rejects unsafe figures and inconsistent tables', () => {
  assert.throws(() => validateBlocks([{ type: 'html', text: '<script></script>' }]), /Unsupported/);
  assert.throws(
    () => validateBlocks([{ type: 'image', src: 'javascript:alert(1)', alt: 'a', caption: 'b' }]),
    /uploaded/,
  );
  assert.throws(
    () => validateBlocks([{ type: 'image', src: '/uploads/figure.png', alt: '', caption: 'b' }]),
    /alternative/,
  );
  assert.throws(
    () => validateBlocks([{ type: 'table', headers: ['a', 'b'], rows: [['1']], caption: 'c' }]),
    /same number/,
  );
  assert.deepEqual(validateBlocks([{ type: 'paragraph', text: '  Unformatted text  ' }]), [
    { type: 'paragraph', text: 'Unformatted text' },
  ]);
});
