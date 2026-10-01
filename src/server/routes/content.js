'use strict';

const { Router } = require('express');

function researchPayload(body) {
  if (
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    typeof body.description !== 'string' ||
    !body.description.trim()
  )
    throw new Error('A title and short description are required.');
  const links = typeof body.links === 'string' ? JSON.parse(body.links || '[]') : body.links || [];
  if (!Array.isArray(links) || links.length > 30)
    throw new Error('Provide up to 30 related links.');
  const normalized = links.map((link) => {
    if (!link || typeof link.url !== 'string' || !/^https?:\/\//i.test(link.url))
      throw new Error('Research links must use http:// or https:// URLs.');
    const url = new URL(link.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid research link.');
    return { label: String(link.label || link.title || link.url).slice(0, 200), url: url.href };
  });
  return {
    ...body,
    title: body.title.trim(),
    description: body.description.trim(),
    links: JSON.stringify(normalized),
  };
}

function createContentRouter({
  db,
  sendInternalError,
  removeUploadedAsset,
  str,
  clampInt,
  searchTerm,
  likePattern,
  publicLimit,
  buildPublicPeopleRows,
  requireCsrf,
  requireStaff,
  requireModerator,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // NEWS API — write operations restricted to staff (admin/professor)
  router.get('/api/news', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const limit = publicLimit(req.query.limit);
    const params = [];
    let sql = 'SELECT * FROM news';
    if (q) {
      const like = likePattern(q);
      sql +=
        " WHERE (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR COALESCE(slug,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like);
    }
    sql += ' ORDER BY date DESC, id DESC LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });

  router.post('/api/news', apiWriteLimiter, requireModerator, requireCsrf, (req, res) => {
    const { title, content, date, image_url, slug } = req.body;
    if (!title || !content || !date) return res.status(400).json({ error: 'Missing fields' });
    const result = db
      .prepare('INSERT INTO news (title, content, date, image_url, slug) VALUES (?, ?, ?, ?, ?)')
      .run(str(title, 500), str(content, 20000), date, str(image_url, 500), str(slug, 200));
    res.json({ id: result.lastInsertRowid, title, content, date });
  });

  router.put('/api/news/:id', apiWriteLimiter, requireModerator, requireCsrf, (req, res) => {
    const { title, content, date, image_url, slug } = req.body;
    db.prepare('UPDATE news SET title=?, content=?, date=?, image_url=?, slug=? WHERE id=?').run(
      str(title, 500),
      str(content, 20000),
      date,
      str(image_url, 500),
      str(slug, 200),
      req.params.id,
    );
    res.json({ success: true });
  });

  router.delete('/api/news/:id', apiWriteLimiter, requireModerator, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM news WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // PUBLICATIONS API — write operations restricted to staff
  router.get('/api/publications', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const year = clampInt(req.query.year, null, { min: 1900, max: 2100 });
    const limit = publicLimit(req.query.limit);
    const conditions = [];
    const params = [];
    if (year) {
      conditions.push('year=?');
      params.push(year);
    }
    if (q) {
      const like = likePattern(q);
      conditions.push(
        "(title LIKE ? ESCAPE '\\' OR authors LIKE ? ESCAPE '\\' OR venue LIKE ? ESCAPE '\\')",
      );
      params.push(like, like, like);
    }
    let sql = 'SELECT * FROM publications';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY year DESC, id DESC LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });

  router.post('/api/publications', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { title, authors, venue, year, pdf_url, doi_url, citation_url } = req.body;
    if (!title || !authors || !venue || !year)
      return res.status(400).json({ error: 'Missing fields' });
    const yearNum = parseInt(year, 10);
    if (!yearNum || yearNum < 1900 || yearNum > 2100)
      return res.status(400).json({ error: 'year must be a number between 1900 and 2100' });
    const result = db
      .prepare(
        'INSERT INTO publications (title, authors, venue, year, pdf_url, doi_url, citation_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(title, authors, venue, yearNum, pdf_url || null, doi_url || null, citation_url || null);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/api/publications/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { title, authors, venue, year, pdf_url, doi_url, citation_url } = req.body;
    const yearNum = parseInt(year, 10);
    if (!yearNum || yearNum < 1900 || yearNum > 2100)
      return res.status(400).json({ error: 'year must be a number between 1900 and 2100' });
    const result = db
      .prepare(
        'UPDATE publications SET title=?, authors=?, venue=?, year=?, pdf_url=?, doi_url=?, citation_url=? WHERE id=?',
      )
      .run(
        title,
        authors,
        venue,
        yearNum,
        pdf_url || null,
        doi_url || null,
        citation_url || null,
        req.params.id,
      );
    if (!result.changes) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  });

  router.delete('/api/publications/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM publications WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // PEOPLE API — write operations restricted to staff
  router.get('/api/people', apiReadLimiter, (req, res) => {
    const { category, active } = req.query;
    const q = searchTerm(req.query.q);
    const limit = publicLimit(req.query.limit, 500, 500);
    let sql = 'SELECT * FROM people WHERE 1=1';
    const params = [];
    if (category) {
      sql += ' AND category=?';
      params.push(category);
    }
    if (active !== undefined) {
      sql += ' AND active=?';
      params.push(active === 'true' || active === '1' ? 1 : 0);
    }
    if (q) {
      const like = likePattern(q);
      sql +=
        " AND (name LIKE ? ESCAPE '\\' OR role LIKE ? ESCAPE '\\' OR COALESCE(bio,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like);
    }
    sql += ' ORDER BY category, name LIMIT ?';
    params.push(limit);
    const people = db.prepare(sql).all(...params);
    res.json(people);
  });

  router.get('/api/people/public', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const category = str(req.query.category, 80).trim().toLowerCase();
    const limit = publicLimit(req.query.limit, 500, 500);
    let rows = buildPublicPeopleRows();
    if (category) {
      rows = rows.filter((person) => String(person.category || '').toLowerCase() === category);
    }
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((person) =>
        [person.name, person.role, person.bio, person.category].some((field) =>
          String(field || '')
            .toLowerCase()
            .includes(needle),
        ),
      );
    }
    res.json(rows.slice(0, limit));
  });

  router.post('/api/people', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      name,
      role,
      category,
      bio,
      photo_url,
      photo_position,
      email,
      linkedin_url,
      website_url,
      active,
    } = req.body;
    if (!name || !role || !category) return res.status(400).json({ error: 'Missing fields' });
    const result = db
      .prepare(
        'INSERT INTO people (name, role, category, bio, photo_url, photo_position, email, linkedin_url, website_url, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        name,
        role,
        category,
        bio || '',
        photo_url || '',
        photo_position || 'center center',
        email || '',
        linkedin_url || '',
        website_url || '',
        active !== false ? 1 : 0,
      );
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/api/people/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      name,
      role,
      category,
      bio,
      photo_url,
      photo_position,
      email,
      linkedin_url,
      website_url,
      active,
    } = req.body;
    db.prepare(
      'UPDATE people SET name=?, role=?, category=?, bio=?, photo_url=?, photo_position=?, email=?, linkedin_url=?, website_url=?, active=? WHERE id=?',
    ).run(
      name,
      role,
      category,
      bio || '',
      photo_url || '',
      photo_position || 'center center',
      email || '',
      linkedin_url || '',
      website_url || '',
      active ? 1 : 0,
      req.params.id,
    );
    res.json({ success: true });
  });

  router.delete('/api/people/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM people WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // RESEARCH API — write operations restricted to staff
  router.get('/api/research', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const limit = publicLimit(req.query.limit);
    const params = [];
    let sql = 'SELECT * FROM research';
    if (q) {
      const like = likePattern(q);
      sql +=
        " WHERE (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR COALESCE(content,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like);
    }
    sql += ' ORDER BY sort_order, id LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });

  router.post('/api/research', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    let payload;
    try {
      payload = researchPayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const { title, description, content, image_url, links, sort_order } = payload;
    if (!title || !description) return res.status(400).json({ error: 'Missing fields' });
    const result = db
      .prepare(
        'INSERT INTO research (title, description, content, image_url, links, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(title, description, content || '', image_url || '', links || '[]', sort_order || 0);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/api/research/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    let payload;
    try {
      payload = researchPayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const { title, description, content, image_url, links, sort_order } = payload;
    const result = db
      .prepare(
        'UPDATE research SET title=?, description=?, content=?, image_url=?, links=?, sort_order=? WHERE id=?',
      )
      .run(
        title,
        description,
        content || '',
        image_url || '',
        links || '[]',
        sort_order || 0,
        req.params.id,
      );
    if (!result.changes) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  });

  router.delete('/api/research/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM research WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // SPONSORS API — write operations restricted to staff
  router.get('/api/sponsors', apiReadLimiter, (req, res) => {
    const limit = publicLimit(req.query.limit);
    const sponsors = db
      .prepare('SELECT * FROM sponsors ORDER BY sort_order, id LIMIT ?')
      .all(limit);
    res.json(sponsors);
  });

  router.post('/api/sponsors', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, logo_url, website_url, sort_order, show_in_footer } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const result = db
      .prepare(
        'INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)',
      )
      .run(name, logo_url || '', website_url || '', sort_order || 0, show_in_footer ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/api/sponsors/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, logo_url, website_url, sort_order, show_in_footer } = req.body;
    const result = db
      .prepare(
        'UPDATE sponsors SET name=?, logo_url=?, website_url=?, sort_order=?, show_in_footer=? WHERE id=?',
      )
      .run(
        name,
        logo_url || '',
        website_url || '',
        sort_order || 0,
        show_in_footer ? 1 : 0,
        req.params.id,
      );
    if (!result.changes) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  });

  router.delete('/api/sponsors/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM sponsors WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // FACILITIES API
  router.get('/api/facilities', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const limit = publicLimit(req.query.limit);
    const params = [];
    let sql = 'SELECT * FROM facilities';
    if (q) {
      const like = likePattern(q);
      sql +=
        " WHERE (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR COALESCE(content,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like);
    }
    sql += ' ORDER BY sort_order, id LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });

  router.post('/api/facilities', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, description, content, photo_url, doc_url, doc_name, sort_order } = req.body;
    if (!name || !description) return res.status(400).json({ error: 'Missing required fields' });
    const result = db
      .prepare(
        'INSERT INTO facilities (name, description, content, photo_url, doc_url, doc_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        name,
        description,
        content || '',
        photo_url || '',
        doc_url || '',
        doc_name || '',
        sort_order || 0,
      );
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/api/facilities/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, description, content, photo_url, doc_url, doc_name, sort_order } = req.body;
    const result = db
      .prepare(
        'UPDATE facilities SET name=?, description=?, content=?, photo_url=?, doc_url=?, doc_name=?, sort_order=? WHERE id=?',
      )
      .run(
        name,
        description,
        content || '',
        photo_url || '',
        doc_url || '',
        doc_name || '',
        sort_order || 0,
        req.params.id,
      );
    if (!result.changes) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  });

  router.delete('/api/facilities/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const item = db.prepare('SELECT * FROM facilities WHERE id=?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM facilities WHERE id=?').run(req.params.id);
    for (const fileUrl of [item.photo_url, item.doc_url]) removeUploadedAsset(fileUrl);
    res.json({ success: true });
  });

  // APPS — HTML mini-applications featured on the public website
  router.get('/api/apps', apiReadLimiter, (req, res) => {
    const q = searchTerm(req.query.q);
    const limit = publicLimit(req.query.limit);
    const params = [];
    let sql = 'SELECT * FROM apps WHERE published=1';
    if (q) {
      const like = likePattern(q);
      sql +=
        " AND (title LIKE ? ESCAPE '\\' OR COALESCE(summary,'') LIKE ? ESCAPE '\\' OR COALESCE(description,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like);
    }
    sql += ' ORDER BY sort_order, id LIMIT ?';
    params.push(limit);
    res.json(db.prepare(sql).all(...params));
  });
  router.get('/api/apps/all', apiReadLimiter, requireStaff, (req, res) => {
    res.json(db.prepare('SELECT * FROM apps ORDER BY sort_order, id').all());
  });
  router.post('/api/apps', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { slug, title, summary, description, url, embed_html, thumbnail, sort_order, published } =
      req.body;
    if (!slug || !title) return res.status(400).json({ error: 'slug and title required' });
    try {
      const r = db
        .prepare(
          'INSERT INTO apps (slug, title, summary, description, url, embed_html, thumbnail, sort_order, published) VALUES (?,?,?,?,?,?,?,?,?)',
        )
        .run(
          slug,
          title,
          summary || '',
          description || '',
          url || '',
          embed_html || '',
          thumbnail || '',
          sort_order || 0,
          published === 0 ? 0 : 1,
        );
      res.json({ id: r.lastInsertRowid });
    } catch (e) {
      if (e.message.includes('UNIQUE'))
        return res.status(409).json({ error: 'Slug already exists' });
      sendInternalError(res, e, 'apps create');
    }
  });
  router.put('/api/apps/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { slug, title, summary, description, url, embed_html, thumbnail, sort_order, published } =
      req.body;
    db.prepare(
      'UPDATE apps SET slug=?, title=?, summary=?, description=?, url=?, embed_html=?, thumbnail=?, sort_order=?, published=? WHERE id=?',
    ).run(
      slug,
      title,
      summary || '',
      description || '',
      url || '',
      embed_html || '',
      thumbnail || '',
      sort_order || 0,
      published === 0 ? 0 : 1,
      req.params.id,
    );
    res.json({ success: true });
  });
  router.delete('/api/apps/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM apps WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createContentRouter };
