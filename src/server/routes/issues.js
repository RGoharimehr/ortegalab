'use strict';

const { Router } = require('express');

function createIssuesRouter({
  db,
  sendMail,
  str,
  clampInt,
  searchTerm,
  likePattern,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ---- Issues ----
  router.get('/api/issues', apiReadLimiter, requireAuth, (req, res) => {
    const { status, mine, query, category, priority, page, limit } = req.query;
    let sql = `SELECT i.*,
        r.name AS reporter_name, r.username AS reporter_username,
        a.name AS assignee_name, a.username AS assignee_username,
        e.name AS equipment_name
      FROM issues i
      LEFT JOIN users r ON r.id = i.reporter_user_id
      LEFT JOIN users a ON a.id = i.assignee_user_id
      LEFT JOIN equipment e ON e.id = i.related_equipment_id
      WHERE 1=1`;
    const params = [];
    if (status) {
      sql += ' AND i.status=?';
      params.push(status);
    }
    if (category) {
      sql += ' AND i.category=?';
      params.push(category);
    }
    if (priority) {
      sql += ' AND i.priority=?';
      params.push(priority);
    }
    if (mine === '1') {
      sql += ' AND (i.reporter_user_id=? OR i.assignee_user_id=?)';
      params.push(req.session.userId, req.session.userId);
    }
    const q = searchTerm(query);
    if (q) {
      sql +=
        " AND (i.title LIKE ? ESCAPE '\\' OR i.body LIKE ? ESCAPE '\\' OR COALESCE(e.name,'') LIKE ? ESCAPE '\\' OR COALESCE(r.name,'') LIKE ? ESCAPE '\\' OR COALESCE(a.name,'') LIKE ? ESCAPE '\\')";
      const like = likePattern(q);
      params.push(like, like, like, like, like);
    }
    sql +=
      " ORDER BY CASE i.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, CASE i.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, i.created_at DESC";
    const pageNum = clampInt(page, 1, { min: 1, max: 100000 });
    const pageSize = clampInt(limit, 200, { min: 1, max: 200 });
    const total = db.prepare(`SELECT COUNT(*) as n FROM (${sql})`).get(...params).n;
    const summary = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN i.status='open' THEN 1 ELSE 0 END), 0) AS open,
        COALESCE(SUM(CASE WHEN i.status='in_progress' THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN i.status='resolved' THEN 1 ELSE 0 END), 0) AS resolved,
        COALESCE(SUM(CASE WHEN i.priority='high' THEN 1 ELSE 0 END), 0) AS high_priority,
        COALESCE(SUM(CASE WHEN i.category='safety' AND i.status!='resolved' THEN 1 ELSE 0 END), 0) AS safety_open
      FROM (${sql}) i
    `,
      )
      .get(...params);
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, (pageNum - 1) * pageSize);
    res.json({
      total,
      page: pageNum,
      limit: pageSize,
      summary,
      rows: db.prepare(sql).all(...params),
    });
  });
  router.post('/api/issues', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { title, body, category, priority, related_equipment_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const r = db
      .prepare(
        'INSERT INTO issues (title, body, category, priority, reporter_user_id, related_equipment_id) VALUES (?,?,?,?,?,?)',
      )
      .run(
        str(title, 500),
        str(body, 10000),
        category || 'other',
        priority || 'normal',
        req.session.userId,
        related_equipment_id || null,
      );
    // Email notification — alert all professors/admins about new issues
    const reporter = db.prepare('SELECT name FROM users WHERE id=?').get(req.session.userId);
    const staffEmails = db
      .prepare(
        "SELECT email FROM users WHERE role IN ('admin','professor') AND email != '' AND active != 0",
      )
      .all()
      .map((u) => u.email);
    if (staffEmails.length) {
      sendMail(
        staffEmails,
        `[LATFS] New ${priority || 'normal'}-priority issue: ${title}`,
        `A new lab issue has been reported.\n\nTitle: ${title}\nCategory: ${category || 'other'}\nPriority: ${priority || 'normal'}\nReported by: ${reporter ? reporter.name : 'a lab member'}\n${body ? '\nDetails:\n' + body + '\n' : ''}\nLog in to the LATFS Platform to manage this issue.\n`,
      );
    }
    res.json({ id: r.lastInsertRowid });
  });
  router.put('/api/issues/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    // Anyone can update title/body if reporter; status/assignee only by staff
    const issue = db.prepare('SELECT * FROM issues WHERE id=?').get(req.params.id);
    if (!issue) return res.status(404).json({ error: 'not found' });
    const role = req.session.role || 'student';
    const isStaff = role === 'admin' || role === 'professor';
    const isReporter = issue.reporter_user_id === req.session.userId;
    if (!isStaff && !isReporter) return res.status(403).json({ error: 'not allowed' });
    const sets = [],
      params = [];
    const { title, body, category, priority, status, assignee_user_id, related_equipment_id } =
      req.body;
    if (title !== undefined && (isReporter || isStaff)) {
      sets.push('title=?');
      params.push(str(title, 500));
    }
    if (body !== undefined && (isReporter || isStaff)) {
      sets.push('body=?');
      params.push(str(body, 10000));
    }
    if (category !== undefined && (isReporter || isStaff)) {
      sets.push('category=?');
      params.push(category);
    }
    if (priority !== undefined && isStaff) {
      sets.push('priority=?');
      params.push(priority);
    }
    if (status !== undefined && isStaff) {
      sets.push('status=?');
      params.push(status);
    }
    if (assignee_user_id !== undefined && isStaff) {
      sets.push('assignee_user_id=?');
      params.push(assignee_user_id || null);
    }
    if (related_equipment_id !== undefined && isStaff) {
      sets.push('related_equipment_id=?');
      params.push(related_equipment_id || null);
    }
    if (!sets.length) return res.json({ success: true });
    sets.push('updated_at=CURRENT_TIMESTAMP');
    params.push(req.params.id);
    db.prepare('UPDATE issues SET ' + sets.join(', ') + ' WHERE id=?').run(...params);
    res.json({ success: true });
  });
  router.delete('/api/issues/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM issues WHERE id=?').run(req.params.id);
    db.prepare('DELETE FROM issue_comments WHERE issue_id=?').run(req.params.id);
    res.json({ success: true });
  });

  router.get('/api/issues/:id/comments', apiReadLimiter, requireAuth, (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT c.*, u.name AS user_name, u.username FROM issue_comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.issue_id=? ORDER BY c.id`,
        )
        .all(req.params.id),
    );
  });
  router.post('/api/issues/:id/comments', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'body required' });
    const issue = db.prepare('SELECT id FROM issues WHERE id=?').get(req.params.id);
    if (!issue) return res.status(404).json({ error: 'not found' });
    const r = db
      .prepare('INSERT INTO issue_comments (issue_id, user_id, body) VALUES (?,?,?)')
      .run(req.params.id, req.session.userId, str(body, 10000));
    res.json({ id: r.lastInsertRowid });
  });
  return router;
}

module.exports = { createIssuesRouter };
