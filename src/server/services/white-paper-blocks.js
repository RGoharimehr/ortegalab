'use strict';
function validateBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length > 60)
    throw new Error('Use at most 60 content blocks.');
  const text = (v, max = 12000) => {
    if (typeof v !== 'string' || v.length > max)
      throw new Error('Invalid or oversized text in content block.');
    return v.trim();
  };
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') throw new Error('Invalid content block.');
    if (b.type === 'heading' || b.type === 'paragraph')
      return { type: b.type, text: text(b.text, b.type === 'heading' ? 200 : 12000) };
    if (b.type === 'image') {
      const src = text(b.src, 1000),
        alt = text(b.alt, 500),
        caption = text(b.caption, 2000);
      if (
        !/^\/(?:uploads|assets)\/[a-zA-Z0-9/_.-]+\.(?:png|jpe?g|webp|gif)$/i.test(src) ||
        src.includes('..')
      )
        throw new Error('Choose an uploaded image for each figure.');
      if (!alt || !caption)
        throw new Error('Images need descriptive alternative text and a caption.');
      return { type: 'image', src, alt, caption };
    }
    if (b.type === 'table') {
      if (
        !Array.isArray(b.headers) ||
        !b.headers.length ||
        b.headers.length > 12 ||
        !Array.isArray(b.rows) ||
        b.rows.length > 100
      )
        throw new Error('Tables support 1–12 columns and up to 100 rows.');
      const headers = b.headers.map((v) => text(v, 200));
      const rows = b.rows.map((row) => {
        if (!Array.isArray(row) || row.length !== headers.length)
          throw new Error('Every table row must have the same number of columns.');
        return row.map((v) => text(v, 1000));
      });
      const caption = text(b.caption, 2000);
      if (!caption) throw new Error('Tables need a caption.');
      return { type: 'table', headers, rows, caption };
    }
    throw new Error('Unsupported content block.');
  });
}
module.exports = { validateBlocks };
