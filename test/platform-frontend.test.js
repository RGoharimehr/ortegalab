'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const publicRoot = path.join(__dirname, '..', 'public');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function page(t, name, { role = 'student', signedIn = true, url, respond } = {}) {
  const dom = new JSDOM(readFileSync(path.join(publicRoot, `${name}.html`), 'utf8'), {
    url: url || `https://lab.test/${name}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  t.after(async () => {
    for (let i = 0; i < 12; i++) await tick();
    dom.window.close();
  });
  const { window } = dom;
  const requests = [];
  window.Headers = Headers;
  window.matchMedia = () => ({ matches: false });
  window.alert = (message) => {
    throw new Error(`Unexpected alert: ${message}`);
  };
  window.confirm = () => true;
  window.fetch = async (route, options = {}) => {
    requests.push({ route, ...options });
    if (respond) {
      const response = await respond(route, options);
      if (response) return response;
    }
    if (route === '/api/me')
      return signedIn
        ? json({
            id: 2,
            username: 'researcher',
            name: 'Lab Researcher',
            role,
            csrfToken: 'test-csrf',
          })
        : json({ error: 'Not authenticated' }, 401);
    if (route === '/admin/check')
      return json({
        loggedIn: signedIn,
        username: 'researcher',
        name: 'Lab Researcher',
        role,
        csrfToken: 'test-csrf',
      });
    if (route === '/api/settings') return json({});
    if (route === '/api/resources/overview') return json({});
    if (route === '/api/dashboard/pi')
      return json({ tasks: {}, equipment: {}, issues: {}, meetings: [] });
    return json([]);
  };
  const scripts = Array.from(window.document.querySelectorAll('script[src]'));
  for (const script of scripts) {
    const filename = path.join(publicRoot, script.getAttribute('src'));
    vm.runInContext(readFileSync(filename, 'utf8'), dom.getInternalVMContext(), { filename });
  }
  for (let i = 0; i < 12; i++) await tick();
  return { dom, window, document: window.document, requests };
}

test('all lab routes boot after extraction and history navigation remains usable', async (t) => {
  const { window, document, requests } = await page(t, 'platform');
  assert.equal(document.querySelector('#appShell').classList.contains('hidden'), false);
  assert.equal(document.querySelector('#userName').textContent, 'Lab Researcher');
  for (const route of [
    'schedule',
    'tasks',
    'meetings',
    'equipment',
    'inventory',
    'issues',
    'samples',
    'lab-notebook',
    'training',
    'profile',
    'dashboard',
  ]) {
    document.querySelector(`[data-route="${route}"]`).click();
    await tick();
    await tick();
    assert.equal(document.querySelector('.p-section.active').dataset.section, route);
    assert.equal(window.location.hash, '#' + route);
  }
  window.goRoute('people-admin');
  assert.equal(document.querySelector('.p-section.active').dataset.section, 'dashboard');
  assert.equal(
    requests.some((request) => request.route.startsWith('/api/tasks/full')),
    true,
  );
  const inlineRouteControl = document.querySelector('[onclick="goRoute(\'tasks\')"]');
  inlineRouteControl.click();
  assert.equal(window.location.hash, '#tasks', 'existing declarative handlers remain callable');
  assert.equal(document.querySelector('[data-route="tasks"]').getAttribute('aria-current'), 'page');
});

test('dim display controls stay synchronized and preserve the preference', async (t) => {
  const { window, document } = await page(t, 'platform');
  const sidebar = document.querySelector('#dmToggle');
  const profile = document.querySelector('#profDmToggle');
  assert.equal(document.body.classList.contains('dm'), false);
  sidebar.click();
  assert.equal(document.body.classList.contains('dm'), true);
  assert.equal(profile.getAttribute('aria-pressed'), 'true');
  assert.equal(window.localStorage.getItem('latfs-dim-display'), 'true');
  profile.click();
  assert.equal(document.body.classList.contains('dm'), false);
  assert.equal(sidebar.getAttribute('aria-pressed'), 'false');
  assert.equal(window.localStorage.getItem('latfs-dim-display'), 'false');
});

test('lab sign-in preserves the two-factor flow and releases passwords after success', async (t) => {
  let loggedIn = false;
  const { window, document, requests } = await page(t, 'platform', {
    signedIn: false,
    respond(route, options) {
      if (route === '/admin/login') {
        const body = JSON.parse(options.body);
        if (!body.totp_code) return json({ totp_required: true });
        loggedIn = true;
        return json({ success: true });
      }
      if (route === '/api/me' && loggedIn)
        return json({ id: 2, name: 'Lab Researcher', role: 'student', csrfToken: 'after-login' });
    },
  });
  document.querySelector('#loginUser').value = 'researcher';
  document.querySelector('#loginPass').value = 'test-password-123';
  document
    .querySelector('#loginForm')
    .dispatchEvent(new window.Event('submit', { cancelable: true }));
  await tick();
  await tick();
  assert.equal(document.querySelector('#loginStep2').style.display, '');
  document.querySelector('#loginTotp').value = '123456';
  document
    .querySelector('#loginForm')
    .dispatchEvent(new window.Event('submit', { cancelable: true }));
  for (let i = 0; i < 8; i++) await tick();
  assert.equal(document.querySelector('#appShell').classList.contains('hidden'), false);
  assert.equal(document.querySelector('#loginPass').value, '');
  assert.equal(requests.filter((request) => request.route === '/admin/login').length, 2);
});

test('dashboard attention labels distinguish missing dates from due-today dates', async (t) => {
  const { window, document } = await page(t, 'platform');
  window.renderResourceDashboard({
    alerts: {
      inventory: [
        { name: 'Undated stock', stock_state: 'low', days_until_expiry: null },
        { name: 'Due today', stock_state: 'low', days_until_expiry: 0 },
      ],
      equipment: [
        {
          name: 'Unavailable rig',
          status: 'out_of_service',
          maintenance_state: 'none',
          calibration_state: 'none',
        },
        {
          name: 'Scheduled rig',
          status: 'available',
          maintenance_state: 'due_soon',
          calibration_state: 'overdue',
        },
      ],
      training: [
        { training_name: 'Undated training', user_name: 'Lab member', days_until_expiry: null },
        { training_name: 'Expired training', days_until_expiry: -3 },
      ],
    },
  });
  const labels = Array.from(document.querySelectorAll('#resourceAlerts .p-alert-row'), (row) => ({
    title: row.querySelector('.p-alert-title').textContent,
    detail: row.querySelector('.p-alert-meta').textContent,
  }));
  assert.equal(labels.find((row) => row.title === 'Undated stock').detail, 'Low stock');
  assert.equal(labels.find((row) => row.title === 'Undated training').detail, 'Lab member');
  assert.match(labels.find((row) => row.title === 'Due today').detail, /Expires today/);
  assert.equal(labels.find((row) => row.title === 'Unavailable rig').detail, 'out of service');
  assert.match(
    labels.find((row) => row.title === 'Scheduled rig').detail,
    /Maintenance due soon \| Calibration overdue/,
  );
  assert.equal(labels.find((row) => row.title === 'Expired training').detail, 'Expired 3d ago');
  assert.equal(window.expiryAttentionLabel(undefined, 30), '');
  assert.equal(window.expiryAttentionLabel('', 30), '');
  assert.equal(window.expiryAttentionLabel(31, 30), '');
  assert.equal(window.expiryAttentionLabel(60, 60), 'Expires in 60d');
});

test('lab create/edit dialogs retain their handlers and keyboard dismissal', async (t) => {
  const { window, document } = await page(t, 'platform', { role: 'admin' });
  for (const handler of [
    'openEventModal',
    'openTaskModal',
    'openMeetingModal',
    'openEquipModal',
    'openInvModal',
    'openSampleModal',
    'openNotebookModal',
    'openTrainingModal',
    'openIssueModal',
  ]) {
    await window[handler]();
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog, handler);
    assert.equal(dialog.contains(document.activeElement), true, handler);
    dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(document.querySelector('[role="dialog"]'), null, handler);
  }
});

test('lab dialogs prevent duplicate saves and preserve a follow-up dialog', async (t) => {
  const { window, document } = await page(t, 'platform');
  let saveCount = 0;
  let release;
  window.modal('<h2>Start</h2>', async () => {
    saveCount++;
    await new Promise((resolve) => {
      release = resolve;
    });
    window.modal('<h2>Backup codes</h2>', null);
  });
  const form = document.querySelector('#modalForm');
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  assert.equal(saveCount, 1);
  release();
  await tick();
  assert.equal(document.querySelector('[role="dialog"] h2').textContent, 'Backup codes');
});

test('admin session gate enforces roles and moderator content keeps its controls', async (t) => {
  const student = await page(t, 'admin', { role: 'student' });
  assert.equal(student.document.querySelector('#appShell').style.display, 'none');
  assert.match(student.document.querySelector('#lErr').textContent, /moderator/);
  const moderator = await page(t, 'admin', {
    role: 'moderator',
    url: 'https://lab.test/admin#content',
  });
  assert.equal(moderator.document.querySelector('#appShell').style.display, 'flex');
  const tabs = Array.from(
    moderator.document.querySelectorAll('[data-tab]'),
    (element) => element.dataset.tab,
  );
  assert.deepEqual(tabs, ['news', 'hero', 'gallery']);
  moderator.document.querySelector('#newNews').click();
  assert.equal(
    moderator.document.querySelector('[role="dialog"]').getAttribute('aria-modal'),
    'true',
  );
  moderator.document.querySelector('[data-act="cancel"]').click();
  assert.equal(moderator.document.querySelector('[role="dialog"]'), null);
});

test('all administrator content tabs render after extraction', async (t) => {
  const { document } = await page(t, 'admin', {
    role: 'admin',
    url: 'https://lab.test/admin#content',
  });
  for (const tab of [
    'people',
    'news',
    'publications',
    'white-papers',
    'research',
    'facilities',
    'hero',
    'gallery',
    'downloads',
    'sponsors',
    'apps',
    'settings',
  ]) {
    document.querySelector(`[data-tab="${tab}"]`).click();
    for (let i = 0; i < 4; i++) await tick();
    assert.ok(document.querySelector('#adminBody').children.length, tab);
    assert.equal(document.querySelector('#adminBody > [role="alert"]'), null, tab);
  }
});

test('shared client preserves uploads, adds fresh CSRF only to mutations, and handles empty responses', async (t) => {
  const { window } = await page(t, 'reset-password');
  const sent = [];
  window.fetch = async (route, options) => {
    sent.push({ route, ...options });
    return new Response(null, { status: 204 });
  };
  let csrf = 'first';
  const request = window.LabHttp.createClient({ getCsrfToken: () => csrf });
  assert.equal(await request('/api/example'), null);
  assert.equal(sent[0].headers.has('X-CSRF-Token'), false);
  csrf = 'renewed';
  await request('/api/example', { method: 'POST', body: { title: 'Sample' } });
  assert.equal(sent[1].headers.get('X-CSRF-Token'), 'renewed');
  assert.equal(sent[1].headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(sent[1].body), { title: 'Sample' });
  const file = new window.FormData();
  file.append('photo', new window.Blob(['image']), 'image.png');
  await request('/api/upload/photo', { method: 'POST', body: file });
  assert.equal(sent[2].body, file);
  assert.equal(sent[2].headers.has('Content-Type'), false);
  await assert.rejects(
    request('https://other.test/api', { method: 'POST' }),
    /only request files from this site/,
  );
});

test('shared client reports useful API errors without exposing HTML error documents', async (t) => {
  const { window } = await page(t, 'reset-password');
  const request = window.LabHttp.createClient();
  window.fetch = async () => json({ error: 'Training is required' }, 403);
  await assert.rejects(
    request('/api/equipment'),
    (error) => error.status === 403 && error.message === 'Training is required',
  );
  window.fetch = async () => new Response('<html>Internal stack trace</html>', { status: 500 });
  await assert.rejects(
    request('/api/equipment'),
    (error) => error.status === 500 && !error.message.includes('stack trace'),
  );
});

test('password reset enforces the server minimum and avoids duplicate submissions', async (t) => {
  let release;
  const { window, document, requests } = await page(t, 'reset-password', {
    url: 'https://lab.test/reset-password?token=example',
    respond(route) {
      if (route === '/api/reset-password')
        return new Promise((resolve) => {
          release = () => resolve(json({ success: true }));
        });
    },
  });
  const form = document.querySelector('#resetForm');
  for (const id of ['newPass', 'confirmPass']) document.getElementById(id).value = 'short123';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  assert.match(document.querySelector('#msg').textContent, /12 characters/);
  assert.equal(requests.length, 0);
  for (const id of ['newPass', 'confirmPass'])
    document.getElementById(id).value = 'long-password-123';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  assert.equal(requests.length, 1);
  release();
  await tick();
  await tick();
  assert.match(document.querySelector('#msg').textContent, /Password updated/);
  assert.equal(document.querySelector('#newPass').value, '');
});

test('people management directs staff to Web Admin without duplicate platform editors', async (t) => {
  const { window, document } = await page(t, 'platform', { role: 'admin' });
  await window.loadUsers();
  assert.equal(typeof window.openUserModal, 'undefined');
  assert.equal(document.querySelector('#addUserBtn'), null);
  assert.equal(document.querySelector('#usersList a').getAttribute('href'), '/admin#content');
});

test('white paper editor preserves tags and adds structured table blocks', async (t) => {
  const { document } = await page(t, 'admin', {
    role: 'admin',
    url: 'https://lab.test/admin#content',
    respond: (route) =>
      route === '/api/white-papers/all'
        ? json([
            {
              id: 1,
              title: 'Report',
              authors: 'Author',
              abstract: 'Abstract',
              year: 2026,
              tags: ['Cooling', 'Modeling'],
              blocks: [{ type: 'paragraph', text: 'Existing text' }],
            },
          ])
        : null,
  });
  document.querySelector('[data-tab="white-papers"]').click();
  for (let i = 0; i < 5; i++) await tick();
  document.querySelector('[data-edit-download="1"]').click();
  assert.equal(document.querySelector('#d_cat').value, 'Cooling, Modeling');
  assert.equal(document.querySelector('[data-field="text"]').value, 'Existing text');
  document.querySelector('[data-add-block="table"]').click();
  assert.equal(document.querySelectorAll('[data-paper-block]').length, 2);
  assert.equal(document.querySelector('[data-field="text"]').value, 'Existing text');
  assert.ok(document.querySelector('[data-field="cells"]'));
});
