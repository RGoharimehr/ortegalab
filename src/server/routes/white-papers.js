'use strict';
const { Router } = require('express');
const { validateBlocks } = require('../services/white-paper-blocks');
function createWhitePapersRouter({
  db,
  requireStaff,
  requireCsrf,
  apiReadLimiter,
  apiWriteLimiter,
}) {
  const router = Router();
  const serialize = (row) => ({
    ...row,
    tags: JSON.parse(row.tags || '[]').length
      ? JSON.parse(row.tags)
      : row.category
        ? [row.category]
        : [],
    blocks: JSON.parse(row.blocks || '[]'),
  });
  const list = () => db.prepare('SELECT * FROM white_papers ORDER BY year DESC, id DESC');
  router.get('/api/white-papers', apiReadLimiter, (req, res) =>
    res.json(
      list()
        .all()
        .filter((row) => row.published === 1)
        .map(serialize),
    ),
  );
  router.get('/api/white-papers/all', apiReadLimiter, requireStaff, (req, res) =>
    res.json(list().all().map(serialize)),
  );
  function save(req, res) {
    const b = req.body || {};
    const title = String(b.title || '').trim(),
      authors = String(b.authors || '').trim(),
      abstract = String(b.abstract || '').trim();
    const year = Number(b.year),
      file = String(b.file_url || '').trim();
    if (
      !title ||
      !authors ||
      !abstract ||
      title.length > 500 ||
      authors.length > 2000 ||
      abstract.length > 30000 ||
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2200
    )
      return res
        .status(400)
        .json({ error: 'Title, authors, abstract and a valid year are required.' });
    if (
      file &&
      !/^\/uploads\/[a-zA-Z0-9._-]+\.pdf$/i.test(file) &&
      !/^https:\/\/[^\s]+\.pdf(?:\?[^\s]*)?$/i.test(file)
    )
      return res.status(400).json({ error: 'Choose an uploaded PDF or an HTTPS PDF URL.' });
    const published = b.published === 1 ? 1 : 0;
    if (published && !file)
      return res.status(400).json({ error: 'A PDF is required before publishing.' });
    let tags, blocks;
    try {
      if (!Array.isArray(b.tags ?? [])) throw new Error('Tags must be a list.');
      tags = [];
      const seen = new Set();
      for (const tag of b.tags ?? (b.category ? [b.category] : [])) {
        if (typeof tag !== 'string' || !tag.trim() || tag.length > 80)
          throw new Error('Use tags of 1–80 characters.');
        const key = tag.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          tags.push(tag.trim());
        }
      }
      if (tags.length > 20) throw new Error('Use at most 20 tags.');
      blocks = validateBlocks(b.blocks ?? []);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const values = [
      title,
      authors,
      abstract,
      year,
      '',
      file,
      String(b.file_name || '').slice(0, 500),
      published,
      JSON.stringify(tags),
      JSON.stringify(blocks),
    ];
    if (req.params.id) {
      const result = db
        .prepare(
          'UPDATE white_papers SET title=?,authors=?,abstract=?,year=?,category=?,file_url=?,file_name=?,published=?,tags=?,blocks=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        )
        .run(...values, req.params.id);
      if (!result.changes) return res.status(404).json({ error: 'White paper not found' });
      return res.json({ id: Number(req.params.id) });
    }
    const result = db
      .prepare(
        'INSERT INTO white_papers (title,authors,abstract,year,category,file_url,file_name,published,tags,blocks) VALUES (?,?,?,?,?,?,?,?,?,?)',
      )
      .run(...values);
    res.status(201).json({ id: result.lastInsertRowid });
  }
  router.post('/api/white-papers', apiWriteLimiter, requireStaff, requireCsrf, save);
  router.put('/api/white-papers/:id', apiWriteLimiter, requireStaff, requireCsrf, save);
  router.delete('/api/white-papers/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const result = db.prepare('DELETE FROM white_papers WHERE id=?').run(req.params.id);
    res
      .status(result.changes ? 200 : 404)
      .json(result.changes ? { success: true } : { error: 'White paper not found' });
  });
  return router;
}
module.exports = { createWhitePapersRouter };
