'use strict';

const { Router } = require('express');

function createProjectsRouter({
  db,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // PROJECTS
  router.get('/api/projects', apiReadLimiter, requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM projects ORDER BY sort_order, id').all());
  });
  router.post('/api/projects', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { title, lead, status, description, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const result = db
      .prepare(
        'INSERT INTO projects (title, lead, status, description, sort_order) VALUES (?,?,?,?,?)',
      )
      .run(title, lead || '', status || 'active', description || '', sort_order || 0);
    res.json({ id: result.lastInsertRowid });
  });
  router.put('/api/projects/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { title, lead, status, description, sort_order } = req.body;
    db.prepare(
      'UPDATE projects SET title=?, lead=?, status=?, description=?, sort_order=? WHERE id=?',
    ).run(title, lead || '', status || 'active', description || '', sort_order || 0, req.params.id);
    res.json({ success: true });
  });
  router.delete('/api/projects/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createProjectsRouter };
