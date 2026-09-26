'use strict';

const { Router } = require('express');

function createMediaRouter({
  db,
  photoUpload,
  removeUploadedAsset,
  searchTerm,
  likePattern,
  publicLimit,
  requireCsrf,
  requireModerator,
  apiWriteLimiter,
  apiReadLimiter,
  uploadRateLimiter,
}) {
  const router = Router();

  // GALLERY API
  router.get('/api/gallery', apiReadLimiter, (req, res) => {
    const limit = publicLimit(req.query.limit);
    const q = searchTerm(req.query.q);
    const params = [];
    let sql = 'SELECT * FROM gallery';
    if (q) {
      const like = likePattern(q);
      sql += " WHERE COALESCE(caption,'') LIKE ? ESCAPE '\\'";
      params.push(like);
    }
    sql += ' ORDER BY sort_order, id LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });

  router.post('/api/gallery', uploadRateLimiter, requireModerator, requireCsrf, (req, res) => {
    photoUpload.single('photo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload error' });
      if (!req.file) return res.status(400).json({ error: 'No image file provided' });
      const image_url = `/uploads/${req.file.filename}`;
      const caption = (req.body.caption || '').slice(0, 200);
      const sort_order = parseInt(req.body.sort_order, 10) || 0;
      const result = db
        .prepare('INSERT INTO gallery (image_url, caption, sort_order) VALUES (?, ?, ?)')
        .run(image_url, caption, sort_order);
      res.json({ id: result.lastInsertRowid, image_url, caption, sort_order });
    });
  });

  router.delete('/api/gallery/:id', apiWriteLimiter, requireModerator, requireCsrf, (req, res) => {
    const photo = db.prepare('SELECT * FROM gallery WHERE id=?').get(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);
    removeUploadedAsset(photo.image_url);
    res.json({ success: true });
  });

  // HERO SLIDES API (separate from photo gallery)
  router.get('/api/hero-slides', apiReadLimiter, (req, res) => {
    const limit = publicLimit(req.query.limit, 20, 20);
    const slides = db
      .prepare('SELECT * FROM hero_slides ORDER BY sort_order, id LIMIT ?')
      .all(limit);
    res.json(slides);
  });

  router.post('/api/hero-slides', uploadRateLimiter, requireModerator, requireCsrf, (req, res) => {
    photoUpload.single('photo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload error' });
      if (!req.file) return res.status(400).json({ error: 'No image file provided' });
      const image_url = `/uploads/${req.file.filename}`;
      const title = (req.body.title || '').slice(0, 200);
      const caption = (req.body.caption || '').slice(0, 400);
      const sort_order = parseInt(req.body.sort_order, 10) || 0;
      const result = db
        .prepare(
          'INSERT INTO hero_slides (image_url, title, caption, sort_order) VALUES (?, ?, ?, ?)',
        )
        .run(image_url, title, caption, sort_order);
      res.json({ id: result.lastInsertRowid, image_url, title, caption, sort_order });
    });
  });

  router.put('/api/hero-slides/:id', apiWriteLimiter, requireModerator, requireCsrf, (req, res) => {
    const { title, caption, sort_order } = req.body;
    db.prepare('UPDATE hero_slides SET title=?, caption=?, sort_order=? WHERE id=?').run(
      title || '',
      caption || '',
      sort_order || 0,
      req.params.id,
    );
    res.json({ success: true });
  });

  router.delete(
    '/api/hero-slides/:id',
    apiWriteLimiter,
    requireModerator,
    requireCsrf,
    (req, res) => {
      const slide = db.prepare('SELECT * FROM hero_slides WHERE id=?').get(req.params.id);
      if (!slide) return res.status(404).json({ error: 'Not found' });
      db.prepare('DELETE FROM hero_slides WHERE id=?').run(req.params.id);
      removeUploadedAsset(slide.image_url);
      res.json({ success: true });
    },
  );
  return router;
}

module.exports = { createMediaRouter };
