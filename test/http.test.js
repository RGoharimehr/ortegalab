'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/server/app');

const password = 'Test-only-password-123!';
const logger = { log() {}, info() {}, warn() {}, error() {} };

async function fixture(t, options = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'latfs-http-'));
  const config = {
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-secret-that-stays-stable-across-restarts',
      ADMIN_SEED_PASSWORD: password,
      BASE_URL: 'https://lab.example.org',
    },
    databasePath: path.join(directory, 'lab.db'),
    uploadsPath: path.join(directory, 'uploads'),
    seedDemo: false,
    logger,
    ...options,
  };
  let application = createApp(config);
  let server;
  let base;
  async function listen() {
    server = application.app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    application.close();
  }
  await listen();
  t.after(async () => {
    await stop();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    get db() {
      return application.db;
    },
    config,
    async restart() {
      await stop();
      application = createApp(config);
      await listen();
    },
    async request(url, { method = 'GET', body, cookie, csrf } = {}) {
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (cookie) headers.Cookie = cookie;
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const response = await fetch(base + url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        /* HTML and attachments are also tested. */
      }
      return { status: response.status, headers: response.headers, data, text };
    },
  };
}

async function login(application, username = 'admin') {
  const response = await application.request('/admin/login', {
    method: 'POST',
    body: { username, password },
  });
  assert.equal(response.status, 200, response.text);
  assert.equal(response.data.success, true);
  return {
    cookie: response.headers.get('set-cookie').split(';')[0],
    csrf: response.data.csrfToken,
  };
}

test('public and authenticated HTTP contracts survive modularization', async (t) => {
  const application = await fixture(t);
  let auth;
  let student;

  await t.test('public pages, API arrays, metadata and health load', async () => {
    for (const route of ['/', '/platform', '/admin', '/reset-password']) {
      const response = await application.request(route);
      assert.equal(response.status, 200, route);
      assert.match(response.text, /<!DOCTYPE html>/i);
      assert.ok(response.headers.get('content-security-policy'));
    }
    assert.deepEqual((await application.request('/healthz')).data, { ok: true });
    for (const route of [
      'news',
      'publications',
      'people/public',
      'research',
      'gallery',
      'hero-slides',
      'facilities',
      'apps',
      'downloads',
    ]) {
      const response = await application.request('/api/' + route);
      assert.equal(response.status, 200, route);
      assert.ok(Array.isArray(response.data), route);
    }
    assert.equal(
      (await application.request('/api/news')).data.length,
      0,
      'No demo news in a clean non-demo database',
    );
    const sitemap = await application.request('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.text, /https:\/\/lab.example.org/);
  });

  await t.test('lab records reject anonymous reads', async () => {
    for (const route of [
      'me',
      'tasks',
      'events',
      'meetings',
      'inventory',
      'equipment',
      'samples',
      'lab-notebooks',
      'training',
      'issues',
      'users',
      'projects',
      'resources/overview',
    ]) {
      assert.equal((await application.request('/api/' + route)).status, 401, route);
    }
  });

  await t.test('login validates payloads and returns session and CSRF token', async () => {
    assert.equal(
      (await application.request('/admin/login', { method: 'POST', body: {} })).status,
      400,
    );
    assert.equal(
      (
        await application.request('/admin/login', {
          method: 'POST',
          body: { username: 'admin', password: 'incorrect' },
        })
      ).status,
      401,
    );
    auth = await login(application);
    assert.ok(auth.csrf);
    const me = await application.request('/api/me', auth);
    assert.equal(me.data.role, 'admin');
    const hash = bcrypt.hashSync(password, 4);
    application.db
      .prepare(
        "INSERT INTO users (username, password, role, name, active) VALUES (?, ?, 'student', 'Test Student', 1)",
      )
      .run('teststudent', hash);
    student = await login(application, 'teststudent');
  });

  await t.test('content mutations require CSRF and appropriate role', async () => {
    const body = { title: 'Verified lab news', content: 'Test article', date: '2026-09-24' };
    assert.equal(
      (await application.request('/api/news', { method: 'POST', body, cookie: auth.cookie }))
        .status,
      403,
    );
    assert.equal(
      (await application.request('/api/news', { method: 'POST', body, ...student })).status,
      403,
    );
    const created = await application.request('/api/news', { method: 'POST', body, ...auth });
    assert.equal(created.status, 200, created.text);
    assert.ok(created.data.id);
    assert.equal((await application.request('/api/news')).data[0].title, body.title);
    assert.equal(
      (await application.request('/api/news/' + created.data.id, { method: 'DELETE', ...auth }))
        .status,
      200,
    );
  });

  await t.test('task workflow and inventory adjustment operate through real routes', async () => {
    const created = await application.request('/api/tasks', {
      method: 'POST',
      ...auth,
      body: { title: 'Calibrate rig', status: 'todo', priority: 'normal' },
    });
    assert.equal(created.status, 200, created.text);
    const id = created.data.id;
    assert.equal(
      (
        await application.request('/api/tasks/' + id, {
          method: 'PUT',
          ...auth,
          body: { status: 'done' },
        })
      ).status,
      200,
    );
    const tasks = (await application.request('/api/tasks', auth)).data.rows;
    assert.ok(tasks.some((task) => task.id === id && task.status === 'done'));
    const stock = await application.request('/api/inventory', {
      method: 'POST',
      ...auth,
      body: { sku: 'TEST-001', name: 'Test fittings', qty: 5, min_qty: 2, lab: 'A' },
    });
    assert.equal(stock.status, 200, stock.text);
    const adjusted = await application.request(`/api/inventory/${stock.data.id}/adjust`, {
      method: 'PATCH',
      ...auth,
      body: { delta: -1, reason: 'Test use' },
    });
    assert.equal(adjusted.status, 200, adjusted.text);
    assert.equal(
      application.db.prepare('SELECT qty FROM inventory WHERE id=?').get(stock.data.id).qty,
      4,
    );
  });

  await t.test('calendar publishes only explicitly public events', async () => {
    for (const visibility of ['public', 'lab', 'private']) {
      const response = await application.request('/api/events', {
        method: 'POST',
        ...auth,
        body: {
          title: `${visibility} event`,
          start_time: '2026-10-01T12:00:00Z',
          end_time: '2026-10-01T13:00:00Z',
          visibility,
        },
      });
      assert.equal(response.status, 200, response.text);
    }
    const calendar = await application.request('/api/events/calendar.ics');
    assert.equal(calendar.status, 200);
    assert.match(calendar.text, /SUMMARY:public event/);
    assert.doesNotMatch(calendar.text, /SUMMARY:(lab|private) event/);
  });

  await t.test('unpublished attachments stay private while published downloads load', async () => {
    const filename = 'access-check.txt';
    writeFileSync(path.join(application.config.uploadsPath, filename), 'Private lab attachment');
    assert.ok([401, 403, 404].includes((await application.request('/uploads/' + filename)).status));
    assert.equal((await application.request('/uploads/' + filename, auth)).status, 200);
    application.db
      .prepare(
        "INSERT INTO documents (entity_type, entity_id, title, file_url, published) VALUES ('download', 0, 'Public test file', ?, 1)",
      )
      .run('/uploads/' + filename);
    assert.equal((await application.request('/uploads/' + filename)).status, 200);
    application.db
      .prepare('UPDATE documents SET published=0 WHERE file_url=?')
      .run('/uploads/' + filename);
    assert.ok([401, 403, 404].includes((await application.request('/uploads/' + filename)).status));
  });

  await t.test('attachment endpoints cannot bypass staff-only publication controls', async () => {
    const body = {
      entity_type: 'download',
      entity_id: 1,
      title: 'Unauthorized publication',
      file_url: '/uploads/access-check.txt',
    };
    assert.equal(
      (await application.request('/api/documents', { method: 'POST', ...student, body })).status,
      403,
    );
    assert.equal(
      (await application.request('/api/downloads', { method: 'POST', ...student, body })).status,
      403,
    );
    assert.equal(
      (await application.request('/api/documents?entity_type=download&entity_id=1', student))
        .status,
      403,
    );
    assert.equal((await application.request('/uploads/access-check.txt')).status, 401);

    // Even a legacy download created through the former bypass is staff-owned.
    const studentId = application.db
      .prepare('SELECT id FROM users WHERE username=?')
      .get('teststudent').id;
    const legacy = application.db
      .prepare(
        "INSERT INTO documents (entity_type, entity_id, file_url, created_by_user_id, published) VALUES ('download', 1, '/uploads/access-check.txt', ?, 0)",
      )
      .run(studentId);
    assert.equal(
      (
        await application.request(`/api/documents/${legacy.lastInsertRowid}`, {
          method: 'DELETE',
          ...student,
        })
      ).status,
      403,
    );

    const attachment = await application.request('/api/documents', {
      method: 'POST',
      ...student,
      body: { ...body, entity_type: 'equipment' },
    });
    assert.equal(attachment.status, 200, attachment.text);
    assert.equal(
      application.db.prepare('SELECT published FROM documents WHERE id=?').get(attachment.data.id)
        .published,
      0,
    );
    assert.equal(
      (
        await application.request(`/api/documents/${attachment.data.id}`, {
          method: 'DELETE',
          ...student,
        })
      ).status,
      200,
    );
  });

  await t.test('session and lab records survive an application restart', async () => {
    await application.restart();
    assert.equal((await application.request('/api/me', auth)).data.role, 'admin');
    assert.ok(
      (await application.request('/api/tasks', auth)).data.rows.some(
        (task) => task.title === 'Calibrate rig',
      ),
    );
    const result = await application.request('/admin/logout', { method: 'POST', ...auth });
    assert.equal(result.status, 200);
    assert.equal((await application.request('/api/me', auth)).status, 401);
  });
});

test('production refuses startup without a session secret', () => {
  assert.throws(() => createApp({ env: { NODE_ENV: 'production' } }), /SESSION_SECRET|secret/i);
});

test('equipment checkout, return and conflicting reservations remain consistent', async (t) => {
  const app = await fixture(t);
  const auth = await login(app);
  const write = (url, body, method = 'POST') => app.request(url, { ...auth, method, body });
  const created = await write('/api/equipment', { name: 'Disposable QA flow meter' });
  assert.equal(created.status, 200, created.text);
  const url = `/api/equipment/${created.data.id}`;
  assert.equal((await write(url + '/checkout', {})).status, 200);
  assert.equal((await write(url + '/checkout', {})).status, 409);
  await app.restart();
  assert.equal((await app.request('/api/equipment', auth)).data.rows[0].status, 'in_use');
  assert.equal((await write(url + '/checkin', {})).status, 200);
  assert.equal((await write(url + '/checkin', {})).status, 409);
  const log = (await app.request(url + '/log', auth)).data;
  assert.equal(log.length, 2);
  assert.ok(log.find((e) => e.action === 'checkout').ended_at);
  const window = { start_at: '2030-02-12T10:00:00', end_at: '2030-02-12T11:00:00' };
  assert.equal((await write(url + '/reservations', window)).status, 200);
  assert.equal((await write(url + '/reservations', window)).status, 409);
  assert.equal(
    (await write(url + '/reservations', { ...window, end_at: '2030-02-12T09:00:00' })).status,
    400,
  );
});

test('calendar rejects invalid ranges on create and partial update', async (t) => {
  const app = await fixture(t);
  const auth = await login(app);
  const body = {
    title: 'QA meeting',
    start_time: '2030-03-01T10:00:00',
    end_time: '2030-03-01T11:00:00',
  };
  assert.equal(
    (
      await app.request('/api/events', {
        ...auth,
        method: 'POST',
        body: { ...body, end_time: 'invalid' },
      })
    ).status,
    400,
  );
  const event = await app.request('/api/events', { ...auth, method: 'POST', body });
  assert.equal(event.status, 200);
  assert.equal(
    (
      await app.request('/api/events/' + event.data.id, {
        ...auth,
        method: 'PUT',
        body: { start_time: '2030-03-01T12:00:00' },
      })
    ).status,
    400,
  );
  assert.equal((await app.request('/api/events', auth)).data[0].start_time, body.start_time);
});

test('vacancy announcements validate status and persist publicly across restart', async (t) => {
  const app = await fixture(t);
  const auth = await login(app);
  const body = {
    join_openings_status: 'open',
    join_openings_title: 'QA position',
    join_openings_details: 'Disposable test announcement.',
  };
  assert.equal((await app.request('/api/settings', { method: 'PUT', body })).status, 401);
  assert.equal(
    (
      await app.request('/api/settings', {
        ...auth,
        method: 'PUT',
        body: { join_openings_status: 'wrong' },
      })
    ).status,
    400,
  );
  assert.equal((await app.request('/api/settings', { ...auth, method: 'PUT', body })).status, 200);
  await app.restart();
  const settings = (await app.request('/api/site-settings')).data;
  for (const [key, value] of Object.entries(body)) assert.equal(settings[key], value);
});

test('research editing persists full pages and rejects invalid links', async (t) => {
  const application = await fixture(t);
  const auth = await login(application);
  const record = {
    title: 'Cooling experiment',
    description: 'Summary',
    content: 'Detailed methods\nSecond paragraph',
    image_url: '/uploads/test.jpg',
    links: JSON.stringify([{ label: 'Dataset', url: 'https://example.org/data' }]),
    sort_order: 1,
  };
  const created = await application.request('/api/research', {
    method: 'POST',
    body: record,
    ...auth,
  });
  assert.equal(created.status, 200);
  const path = '/api/research/' + created.data.id;
  assert.equal(
    (
      await application.request(path, {
        method: 'PUT',
        body: { ...record, links: '[{"url":"javascript:alert(1)"}]' },
        ...auth,
      })
    ).status,
    400,
  );
  assert.equal(
    (await application.request(path, { method: 'PUT', body: { ...record, title: '' }, ...auth }))
      .status,
    400,
  );
  assert.equal(
    (
      await application.request(path, {
        method: 'PUT',
        body: { ...record, content: 'Updated full description' },
        ...auth,
      })
    ).status,
    200,
  );
  await application.restart();
  const rows = (await application.request('/api/research')).data;
  const saved = rows.find((row) => row.id === created.data.id);
  assert.equal(saved.content, 'Updated full description');
  assert.equal(JSON.parse(saved.links)[0].url, 'https://example.org/data');
});

test('CMS palettes, categorized gallery and authoritative people survive restarts', async (t) => {
  const app = await fixture(t);
  const auth = await login(app);
  for (const theme of ['navy', 'graphite-green', 'graphite']) {
    const save = await app.request('/api/settings', {
      ...auth,
      method: 'PUT',
      body: { site_theme: theme },
    });
    assert.equal(save.status, 200);
    assert.equal((await app.request('/api/site-settings')).data.site_theme, theme);
  }
  assert.equal(
    (
      await app.request('/api/settings', {
        ...auth,
        method: 'PUT',
        body: { site_theme: 'unknown' },
      })
    ).status,
    400,
  );
  const backgrounds = JSON.stringify({
    join: '/assets/lab/lab-wide-view.png',
    home_gallery: 'none',
  });
  assert.equal(
    (
      await app.request('/api/settings', {
        ...auth,
        method: 'PUT',
        body: { site_backgrounds: backgrounds },
      })
    ).status,
    200,
  );
  assert.equal((await app.request('/api/site-settings')).data.site_backgrounds, backgrounds);
  assert.equal(
    (
      await app.request('/api/settings', {
        ...auth,
        method: 'PUT',
        body: { site_backgrounds: JSON.stringify({ join: 'javascript:alert(1)' }) },
      })
    ).status,
    400,
  );
  const photos = (await app.request('/api/gallery')).data;
  const visit = photos.find((photo) => photo.image_url.includes('arpa-e'));
  assert.equal(visit.category, 'Visits');
  assert.equal(
    (
      await app.request('/api/gallery/' + visit.id, {
        ...auth,
        method: 'PUT',
        body: { category: 'Exhibition', caption: 'Edited caption', sort_order: 4 },
      })
    ).status,
    200,
  );
  assert.equal(
    (await app.request('/api/gallery/999999', { ...auth, method: 'PUT', body: {} })).status,
    404,
  );
  const removedPhoto = photos.find((photo) => photo.id !== visit.id);
  await app.request('/api/gallery/' + removedPhoto.id, { ...auth, method: 'DELETE' });
  const account = await app.request('/api/users', {
    ...auth,
    method: 'POST',
    body: {
      username: 'cms-only-test',
      password,
      name: 'CMS Test',
      email: 'cms@example.test',
      role: 'student',
    },
  });
  assert.equal(account.status, 200);
  const profile = await app.request('/api/people', {
    ...auth,
    method: 'POST',
    body: {
      name: 'CMS Test',
      email: 'cms@example.test',
      role: 'Researcher',
      category: 'phd',
      bio: 'CMS biography',
      active: true,
    },
  });
  const publicRows = (await app.request('/api/people/public')).data;
  assert.equal(publicRows.find((person) => person.id === profile.data.id).bio, 'CMS biography');
  await app.request('/api/people/' + profile.data.id, { ...auth, method: 'DELETE' });
  assert.ok(
    !(await app.request('/api/people/public')).data.some(
      (person) => person.email === 'cms@example.test',
    ),
  );
  assert.equal(
    (
      await app.request('/api/me/profile', {
        ...auth,
        method: 'PUT',
        body: { name: 'Platform edit' },
      })
    ).status,
    403,
  );
  await app.request('/api/users/' + account.data.id, {
    ...auth,
    method: 'PUT',
    body: { active: false },
  });
  assert.ok(
    !(await app.request('/api/users', auth)).data.some((user) => user.id === account.data.id),
  );
  assert.equal(
    (await app.request('/api/users?include_disabled=1', auth)).data.find(
      (user) => user.id === account.data.id,
    ).active,
    0,
  );
  await app.restart();
  assert.equal((await app.request('/api/site-settings')).data.site_theme, 'graphite');
  const after = (await app.request('/api/gallery')).data;
  assert.equal(after.find((photo) => photo.id === visit.id).category, 'Exhibition');
  assert.ok(!after.some((photo) => photo.image_url === removedPhoto.image_url));
  assert.ok(
    !(await app.request('/api/people/public')).data.some(
      (person) => person.email === 'cms@example.test',
    ),
  );
});

test('SEO pages expose public content, canonical URLs and safe sitemap without JavaScript', async (t) => {
  const app = await fixture(t);
  const id = Number(
    app.db
      .prepare('INSERT INTO research (title,description,content) VALUES (?,?,?)')
      .run('Cooling & heat', 'Study of boiling', '<script>alert(1)</script>').lastInsertRowid,
  );
  app.db
    .prepare('INSERT INTO people (name,role,category,active) VALUES (?,?,?,0)')
    .run('Hidden Person', 'Researcher', 'phd');
  for (const route of [
    '/',
    '/research',
    '/people',
    '/publications',
    '/facilities',
    '/news',
    '/gallery',
    '/apps',
    '/downloads',
    '/join',
    '/contact',
  ]) {
    const page = await app.request(route);
    assert.equal(page.status, 200, route);
    assert.match(page.text, /<main/);
    assert.match(page.text, /<base href="\/">/);
    assert.doesNotMatch(page.text, /latfs\.villanova\.edu|Hidden Person/);
  }
  const detail = await app.request('/research/' + id);
  assert.match(detail.text, /Cooling &amp; heat/);
  assert.match(detail.text, new RegExp('https://lab.example.org/research/' + id));
  assert.doesNotMatch(detail.text, /<script>alert/);
  const sitemap = await app.request('/sitemap.xml');
  assert.match(sitemap.text, new RegExp('/research/' + id));
  assert.doesNotMatch(sitemap.text, /#|\/admin|\/platform/);
  const robots = await app.request('/robots.txt');
  assert.match(robots.text, /https:\/\/lab.example.org\/sitemap.xml/);
  for (const route of ['/admin', '/admin.html', '/platform', '/platform.html', '/reset-password']) {
    assert.match((await app.request(route)).headers.get('x-robots-tag'), /noindex/);
  }
  const missing = await app.request('/research/999999');
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('x-robots-tag'), 'noindex');
});
