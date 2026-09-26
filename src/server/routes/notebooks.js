'use strict';

const { Router } = require('express');

function createNotebooksRouter({
  db,
  str,
  searchTerm,
  likePattern,
  requireAuth,
  requireCsrf,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ── Digital lab notebooks ─────────────────────────────────────────────────────
  router.get('/api/lab-notebooks', apiReadLimiter, requireAuth, (req, res) => {
    const { mine, project_id, search } = req.query;
    const role = req.session.role || 'student';
    let sql = `SELECT n.*, u.name AS author_name, p.title AS project_title
      FROM lab_notebooks n
      LEFT JOIN users u ON u.id=n.user_id
      LEFT JOIN projects p ON p.id=n.project_id WHERE 1=1`;
    const params = [];
    // Non-staff can only see their own entries
    if (mine === '1' || (role !== 'admin' && role !== 'professor')) {
      sql += ' AND n.user_id=?';
      params.push(req.session.userId);
    }
    if (project_id) {
      sql += ' AND n.project_id=?';
      params.push(project_id);
    }
    const q = searchTerm(search);
    if (q) {
      const like = likePattern(q);
      sql +=
        " AND (n.title LIKE ? ESCAPE '\\' OR n.content LIKE ? ESCAPE '\\' OR n.tags LIKE ? ESCAPE '\\')";
      params.push(like, like, like);
    }
    sql += ' ORDER BY n.experiment_date DESC, n.id DESC LIMIT 200';
    res.json(db.prepare(sql).all(...params));
  });
  router.get('/api/lab-notebooks/:id', apiReadLimiter, requireAuth, (req, res) => {
    const n = db
      .prepare(
        `SELECT n.*, u.name AS author_name, p.title AS project_title
      FROM lab_notebooks n LEFT JOIN users u ON u.id=n.user_id LEFT JOIN projects p ON p.id=n.project_id
      WHERE n.id=?`,
      )
      .get(req.params.id);
    if (!n) return res.status(404).json({ error: 'not found' });
    const role = req.session.role || 'student';
    if (n.user_id !== req.session.userId && role !== 'admin' && role !== 'professor')
      return res.status(403).json({ error: 'Forbidden' });
    res.json(n);
  });
  router.post('/api/lab-notebooks', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { title, project_id, experiment_date, content, tags, status } = req.body;
    if (!title || !experiment_date)
      return res.status(400).json({ error: 'title and experiment_date required' });
    const r = db
      .prepare(
        `INSERT INTO lab_notebooks (title, user_id, project_id, experiment_date, content, tags, status)
      VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        str(title, 500),
        req.session.userId,
        project_id || null,
        experiment_date,
        content || '',
        tags || '',
        status || 'draft',
      );
    res.json({ id: r.lastInsertRowid });
  });
  router.put('/api/lab-notebooks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const n = db.prepare('SELECT user_id FROM lab_notebooks WHERE id=?').get(req.params.id);
    if (!n) return res.status(404).json({ error: 'not found' });
    const role = req.session.role || 'student';
    if (n.user_id !== req.session.userId && role !== 'admin' && role !== 'professor')
      return res.status(403).json({ error: 'Forbidden' });
    const { title, project_id, experiment_date, content, tags, status } = req.body;
    db.prepare(
      `UPDATE lab_notebooks SET title=?, project_id=?, experiment_date=?, content=?, tags=?,
      status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(
      str(title, 500),
      project_id || null,
      experiment_date,
      content || '',
      tags || '',
      status || 'draft',
      req.params.id,
    );
    res.json({ success: true });
  });
  router.delete('/api/lab-notebooks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const n = db.prepare('SELECT user_id FROM lab_notebooks WHERE id=?').get(req.params.id);
    if (!n) return res.status(404).json({ error: 'not found' });
    const role = req.session.role || 'student';
    if (n.user_id !== req.session.userId && role !== 'admin' && role !== 'professor')
      return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM lab_notebooks WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createNotebooksRouter };
