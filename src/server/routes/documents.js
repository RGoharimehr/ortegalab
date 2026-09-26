'use strict';

const { Router } = require('express');

function createDocumentsRouter({
  db,
  removeUploadedAsset,
  str,
  searchTerm,
  likePattern,
  publicLimit,
  currentRole,
  isLabStaffRole,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ---- Generic documents (attached files for any entity) ----
  router.get('/api/documents', apiReadLimiter, requireAuth, (req, res) => {
    const { entity_type, entity_id } = req.query;
    if (!entity_type || !entity_id)
      return res.status(400).json({ error: 'entity_type and entity_id required' });
    if (entity_type === 'download' && !isLabStaffRole(currentRole(req))) {
      return res.status(403).json({ error: 'Download management requires staff access' });
    }
    res.json(
      db
        .prepare(
          'SELECT * FROM documents WHERE entity_type=? AND entity_id=? ORDER BY sort_order, id',
        )
        .all(entity_type, entity_id),
    );
  });
  router.post('/api/documents', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { entity_type, entity_id, title, file_url, file_name, sort_order } = req.body;
    if (!entity_type || !entity_id || !file_url)
      return res.status(400).json({ error: 'entity_type, entity_id, file_url required' });
    // Publishing belongs to the staff-only download library, never attachments.
    if (entity_type === 'download') {
      return res
        .status(403)
        .json({ error: 'Use the staff-only download library to publish files' });
    }
    const r = db
      .prepare(
        'INSERT INTO documents (entity_type, entity_id, title, file_url, file_name, created_by_user_id, sort_order, published) VALUES (?,?,?,?,?,?,?,0)',
      )
      .run(
        entity_type,
        entity_id,
        title || '',
        file_url,
        file_name || '',
        req.session.userId || null,
        sort_order || 0,
      );
    res.json({ id: r.lastInsertRowid });
  });
  router.delete('/api/documents/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const row = db
      .prepare('SELECT id, entity_type, created_by_user_id FROM documents WHERE id=?')
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const isStaff = isLabStaffRole(currentRole(req));
    if (
      !isStaff &&
      (row.entity_type === 'download' || row.created_by_user_id !== req.session.userId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.prepare('DELETE FROM documents WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // ---- Download library (public website) ----
  router.get('/api/downloads', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const category = str(req.query.category, 80).trim();
    const limit = publicLimit(req.query.limit, 200, 500);
    const params = ['download'];
    let sql =
      'SELECT id, title, description, category, file_url, file_name, mime_type, file_size, sort_order, created_at FROM documents WHERE entity_type=? AND published=1';
    if (category) {
      sql += ' AND category=?';
      params.push(category);
    }
    if (q) {
      const like = likePattern(q);
      sql +=
        " AND (title LIKE ? ESCAPE '\\' OR COALESCE(description,'') LIKE ? ESCAPE '\\' OR COALESCE(category,'') LIKE ? ESCAPE '\\' OR COALESCE(file_name,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like, like);
    }
    sql += ' ORDER BY sort_order, id DESC LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/api/downloads/all', apiReadLimiter, requireStaff, (req, res) => {
    res.json(
      db
        .prepare(
          "SELECT * FROM documents WHERE entity_type='download' ORDER BY sort_order, id DESC",
        )
        .all(),
    );
  });

  router.post('/api/downloads', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      title,
      description,
      category,
      file_url,
      file_name,
      mime_type,
      file_size,
      sort_order,
      published,
    } = req.body || {};
    if (!title || !file_url) return res.status(400).json({ error: 'title and file_url required' });
    const r = db
      .prepare(
        `
      INSERT INTO documents (entity_type, entity_id, title, description, category, file_url, file_name, mime_type, file_size, published, sort_order)
      VALUES ('download', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        title,
        description || '',
        category || '',
        file_url,
        file_name || '',
        mime_type || '',
        Number(file_size) || 0,
        published === 0 ? 0 : 1,
        Number(sort_order) || 0,
      );
    res.json({ id: r.lastInsertRowid });
  });

  router.put('/api/downloads/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      title,
      description,
      category,
      file_url,
      file_name,
      mime_type,
      file_size,
      sort_order,
      published,
    } = req.body || {};
    if (!title || !file_url) return res.status(400).json({ error: 'title and file_url required' });
    db.prepare(
      `
      UPDATE documents
      SET title=?, description=?, category=?, file_url=?, file_name=?, mime_type=?, file_size=?, published=?, sort_order=?
      WHERE id=? AND entity_type='download'
    `,
    ).run(
      title,
      description || '',
      category || '',
      file_url,
      file_name || '',
      mime_type || '',
      Number(file_size) || 0,
      published === 0 ? 0 : 1,
      Number(sort_order) || 0,
      req.params.id,
    );
    res.json({ success: true });
  });

  router.delete('/api/downloads/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const row = db
      .prepare("SELECT * FROM documents WHERE id=? AND entity_type='download'")
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Download not found' });
    db.prepare("DELETE FROM documents WHERE id=? AND entity_type='download'").run(req.params.id);
    removeUploadedAsset(row.file_url);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createDocumentsRouter };
