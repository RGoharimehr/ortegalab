/* ===========================================================
   LATFS Platform — vanilla JS port of the React UI Kit
   =========================================================== */

let CSRF = '';
let SESSION_USER = { name:'Dr. A. Ortega', role:'PI · Director', initials:'AO', first:'Alfonso' };
let LAB_NAMES = { lab_a_name:'Lab A', lab_a_room:'Tolentine 344', lab_b_name:'Lab B', lab_b_room:'Mendel 270' };
const labLabel = (ab) => ab === 'A'
  ? `${LAB_NAMES.lab_a_name}${LAB_NAMES.lab_a_room ? ' · ' + LAB_NAMES.lab_a_room : ''}`
  : `${LAB_NAMES.lab_b_name}${LAB_NAMES.lab_b_room ? ' · ' + LAB_NAMES.lab_b_room : ''}`;

const $ = (s, root=document) => root.querySelector(s);
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const initials = (name) => (name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
const fmtDT = (d) => { if(!d) return ''; const x = new Date(d); if(isNaN(x)) return d; return x.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); };
const ADMIN_SURFACE_ROLES = new Set(['admin', 'professor', 'moderator']);
const LAB_STAFF_ROLES = new Set(['admin', 'professor']);
const ALL_NAV_ITEMS = [
  ['overview',   'Overview',     'home'],
  ['content',    'Site content', 'edit-3'],
];

function isLabStaffRole(role) {
  return LAB_STAFF_ROLES.has(role);
}

function canAccessAdminSurface(role) {
  return ADMIN_SURFACE_ROLES.has(role);
}

function allowedNavItems() {
  return ALL_NAV_ITEMS.slice();
}

function allowedContentTabs() {
  if (isLabStaffRole(SESSION_USER.role)) {
    return [
      ['people','People','users'],
      ['news','News','megaphone'],
      ['publications','Publications','book-open'],
      ['research','Research','flask-conical'],
      ['facilities','Facilities','building-2'],
      ['hero','Hero / homepage','image'],
      ['gallery','Gallery','images'],
      ['downloads','Downloads','download'],
      ['sponsors','Sponsors','briefcase'],
      ['apps','Apps','grid'],
      ['settings','Settings','settings']
    ];
  }
  return [
    ['news','News','megaphone'],
    ['hero','Hero / homepage','image'],
    ['gallery','Gallery','images']
  ];
}

async function api(path, opts={}) {
  const headers = { 'Content-Type':'application/json' };
  if (CSRF) headers['X-CSRF-Token'] = CSRF;
  const r = await fetch(path, { credentials:'same-origin', ...opts, headers: {...headers, ...(opts.headers||{})} });
  if (!r.ok) {
    const txt = await r.text().catch(()=>'');
    throw new Error(`${r.status} ${r.statusText} ${txt}`);
  }
  return r.json();
}
const apiGet = (p) => api(p);
const apiPost = (p, body) => api(p, { method:'POST', body: JSON.stringify(body) });
const apiPut  = (p, body) => api(p, { method:'PUT',  body: JSON.stringify(body) });
const apiDel  = (p)       => api(p, { method:'DELETE' });
async function apiRows(p) {
  const data = await apiGet(p);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.rows)) return data.rows;
  return [];
}

async function uploadPhoto(file) {
  const fd = new FormData(); fd.append('photo', file);
  const r = await fetch('/api/upload/photo', { method:'POST', credentials:'same-origin', headers:{ 'X-CSRF-Token': CSRF }, body: fd });
  if(!r.ok) throw new Error('Upload failed: '+r.status);
  return (await r.json()).url;
}
async function uploadDoc(file) {
  const fd = new FormData(); fd.append('document', file);
  const r = await fetch('/api/upload/document', { method:'POST', credentials:'same-origin', headers:{ 'X-CSRF-Token': CSRF }, body: fd });
  if(!r.ok) throw new Error('Upload failed: '+r.status);
  return await r.json();
}
async function uploadGallery(file, caption='', sort_order=0) {
  const fd = new FormData(); fd.append('photo', file); fd.append('caption', caption); fd.append('sort_order', sort_order);
  const r = await fetch('/api/gallery', { method:'POST', credentials:'same-origin', headers:{ 'X-CSRF-Token': CSRF }, body: fd });
  if(!r.ok) throw new Error('Upload failed: '+r.status);
  return await r.json();
}
async function uploadHeroSlide(file, title='', caption='', sort_order=0) {
  const fd = new FormData(); fd.append('photo', file); fd.append('title', title); fd.append('caption', caption); fd.append('sort_order', sort_order);
  const r = await fetch('/api/hero-slides', { method:'POST', credentials:'same-origin', headers:{ 'X-CSRF-Token': CSRF }, body: fd });
  if(!r.ok) throw new Error('Upload failed: '+r.status);
  return await r.json();
}

/* ── Auth ──────────────────────────────────────────────── */
async function checkAuth() {
  try {
    const data = await fetch('/admin/check', { credentials:'same-origin' }).then(r=>r.json());
    if (data.loggedIn) {
      CSRF = data.csrfToken || '';
      SESSION_USER.name = data.name || data.username;
      SESSION_USER.role = data.role || 'admin';
      SESSION_USER.first = (data.name || data.username || '?').split(' ')[0] || '?';
      SESSION_USER.initials = initials(SESSION_USER.name);
      return true;
    }
    if (data && data.message) $('#lErr').textContent = data.message;
  } catch(e) { console.error('auth check failed', e); }
  return false;
}
let _adminLoginState = { step: 1, username: '', password: '', rememberMe: false };

function _resetAdminLogin() {
  _adminLoginState = { step: 1, username: '', password: '', rememberMe: false };
  $('#adminStep1').style.display = '';
  $('#adminStep2').style.display = 'none';
  $('#lTotp').value = '';
  $('#adminSubmitBtn').textContent = 'Sign in';
  $('#lUser').focus();
}

async function doLogin(user, pass, totpCode, rememberMe) {
  const body = { username: user, password: pass, remember_me: rememberMe };
  if (totpCode) body.totp_code = totpCode;
  const r = await fetch('/admin/login', {
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (data.totp_required) return data; // caller handles step transition
  if (!r.ok) throw new Error(data.error || 'Login failed');
  if (!canAccessAdminSurface(data.role || 'student')) {
    throw new Error('This account should use the Lab platform. Website Admin access is limited to moderator, professor, or admin roles.');
  }
  CSRF = data.csrfToken || '';
  SESSION_USER.name = data.name || data.username;
  SESSION_USER.role = data.role || 'admin';
  SESSION_USER.first = (data.name || data.username || '?').split(' ')[0] || '?';
  SESSION_USER.initials = initials(SESSION_USER.name);
  return data;
}

/* ── Sidebar nav ───────────────────────────────────────── */
let activeRoute = 'overview';

function renderNav() {
  const items = allowedNavItems();
  if (!items.some(([id]) => id === activeRoute)) activeRoute = items[0][0];
  $('#navMain').innerHTML = items.map(([id,label,icon]) =>
    `<button class="p-nav-item${id===activeRoute?' active':''}" data-route="${id}">
      <i data-lucide="${icon}" class="p-nav-icon"></i><span>${label}</span>
    </button>`
  ).join('');
  document.querySelectorAll('.p-sidebar [data-route]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === activeRoute);
    btn.onclick = () => navigate(btn.dataset.route);
  });
}

async function navigate(route) {
  const items = allowedNavItems();
  if (!items.some(([id]) => id === route)) route = 'overview';
  activeRoute = route;
  renderNav();
  const main = $('#mainContent');
  main.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const renderer = ROUTES[route];
    if (!renderer) { main.innerHTML = '<div class="p-card"><em style="color:var(--fg-4)">Unknown route</em></div>'; return; }
    await renderer(main);
    if (window.lucide) window.lucide.createIcons();
  } catch(e) {
    console.error(e);
    main.innerHTML = `<div class="p-card"><strong>Error loading ${escHtml(route)}:</strong> ${escHtml(e.message)}</div>`;
  }
}

/* ── Modal helper ──────────────────────────────────────── */
function modal(title, sub, body, onSave) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">
    <h2>${escHtml(title)}</h2>
    <p class="modal-sub">${escHtml(sub||'')}</p>
    <div class="modal-body">${body}</div>
    <div class="modal-actions">
      <button class="btn-ghost-sm" data-act="cancel">Cancel</button>
      <button class="btn-primary-sm" data-act="save">Save</button>
    </div>
  </div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.querySelector('[data-act="cancel"]').onclick = close;
  bg.querySelector('[data-act="save"]').onclick = async () => {
    try { await onSave(bg.querySelector('.modal-body')); close(); }
    catch(e){ alert(e.message); }
  };
  if (window.lucide) window.lucide.createIcons();
  return bg;
}

/* ───────────────────────────────────────────────────────────
   DASHBOARD
   ─────────────────────────────────────────────────────────── */
async function renderDashboard(root) {
  const [meetings, tasks, inventory] = await Promise.all([
    apiGet('/api/meetings').catch(()=>[]),
    apiRows('/api/tasks').catch(()=>[]),
    apiRows('/api/inventory').catch(()=>[]),
  ]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMeetings = meetings.filter(m => m.day_label === 'TODAY' || (m.scheduled_at && m.scheduled_at.startsWith(todayStr))).length;
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const lowInv = inventory.filter(i => i.qty < i.min_qty).length;
  const todaySlots = meetings.filter(m => m.day_label === 'TODAY' || (m.scheduled_at && m.scheduled_at.startsWith(todayStr))).slice(0,4);
  const myTasks = tasks.filter(t => t.status !== 'done').slice(0,4);
  const today = new Date().toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric'}).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const tagColor = { team:'var(--navy-900)', experiment:'var(--gold-600)', '1:1':'var(--status-info)', external:'var(--gold-600)', review:'var(--status-warn)', onboarding:'var(--gold-700)', lab:'var(--fg-3)' };
  const taskTag = { todo:['To do','p-tag-outline'], in_progress:['In progress','p-tag-info'], blocked:['Blocked','p-tag-gold'], done:['Done','p-tag-ok'] };

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <div class="eyebrow" style="color:var(--gold-700)">${escHtml(today)}</div>
        <h1 class="p-h1">${greeting}, ${escHtml(SESSION_USER.first || SESSION_USER.name.split(' ')[0])}.</h1>
        <p class="p-h1-sub">${todayMeetings} meeting${todayMeetings===1?'':'s'} today · ${openTasks} open task${openTasks===1?'':'s'} · ${lowInv} inventory item${lowInv===1?'':'s'} need attention.</p>
      </div>
    </div>

    <div class="p-grid-3">
      <div class="p-stat-card">
        <i data-lucide="calendar-clock" class="p-stat-icon"></i>
        <div class="p-stat-num">${todayMeetings}</div>
        <div class="p-stat-lbl">Meetings today</div>
      </div>
      <div class="p-stat-card">
        <i data-lucide="check-square" class="p-stat-icon" style="color:var(--gold-600)"></i>
        <div class="p-stat-num">${openTasks}</div>
        <div class="p-stat-lbl">Open tasks</div>
      </div>
      <div class="p-stat-card">
        <i data-lucide="alert-triangle" class="p-stat-icon" style="color:var(--status-warn)"></i>
        <div class="p-stat-num">${lowInv}</div>
        <div class="p-stat-lbl">Inventory low</div>
      </div>
    </div>

    <div class="p-grid-2" style="margin-top:24px">
      <section class="p-card">
        <div class="p-card-head">
          <div class="p-card-title">Today's schedule</div>
          <button class="w-link-gold" data-jump="schedule">Full week →</button>
        </div>
        ${todaySlots.length ? todaySlots.map(s => {
          const timeDisplay = s.time_label || (s.scheduled_at ? new Date(s.scheduled_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}) : '');
          const roomDisplay = s.room || s.location || '';
          return `
          <div class="p-slot">
            <div class="p-slot-time">${escHtml(timeDisplay.split('–')[0].trim())}</div>
            <div style="flex:1">
              <div class="p-slot-title">${escHtml(s.title)}</div>
              <div class="p-slot-room">${escHtml(roomDisplay)}</div>
            </div>
            <span class="p-slot-tag" style="background:${tagColor[s.type||s.meeting_type]||'var(--fg-3)'}">${escHtml(s.type||s.meeting_type||'meeting')}</span>
          </div>`;
        }).join('') : '<div class="empty">No meetings scheduled today.</div>'}
      </section>

      <section class="p-card">
        <div class="p-card-head">
          <div class="p-card-title">My tasks</div>
          <button class="w-link-gold" data-jump="tasks">All tasks →</button>
        </div>
        ${myTasks.length ? myTasks.map(t => {
          const [lbl, cls] = taskTag[t.status] || ['','p-tag-outline'];
          return `<div class="p-task">
            <input type="checkbox" class="p-check">
            <div style="flex:1">
              <div class="p-task-title">${escHtml(t.title)}</div>
              <div class="p-task-due">Due ${escHtml(t.due_label||'—')}</div>
            </div>
            <span class="p-tag ${cls}">${lbl}</span>
          </div>`;
        }).join('') : '<div class="empty">No open tasks. ✨</div>'}
      </section>
    </div>

    <section class="p-card" style="margin-top:24px">
      <div class="p-card-head">
        <div class="p-card-title">Lab status</div>
        <span class="p-tag p-tag-ok">All systems nominal</span>
      </div>
      <div class="p-grid-2">
        <div>
          <div class="p-lab-name">${escHtml(labLabel('A'))}</div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--status-ok)"></span><div style="flex:1"><div class="p-lab-lbl">Boiling rig</div><div class="p-lab-meta">M. Reyes · ends 16:00</div></div><span class="p-lab-state">Running</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--fg-4)"></span><div style="flex:1"><div class="p-lab-lbl">PIV system</div><div class="p-lab-meta">Last used yesterday</div></div><span class="p-lab-state">Idle</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--status-info)"></span><div style="flex:1"><div class="p-lab-lbl">High-speed camera</div><div class="p-lab-meta">A. Park · tomorrow 09:00</div></div><span class="p-lab-state">Booked</span></div>
        </div>
        <div>
          <div class="p-lab-name">${escHtml(labLabel('B'))}</div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--fg-4)"></span><div style="flex:1"><div class="p-lab-lbl">Thermocouple bench</div></div><span class="p-lab-state">Idle</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--status-warn)"></span><div style="flex:1"><div class="p-lab-lbl">Droplet impingement rig</div><div class="p-lab-meta">Pump replaced Mon</div></div><span class="p-lab-state">Maintenance</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--fg-4)"></span><div style="flex:1"><div class="p-lab-lbl">IR thermography</div></div><span class="p-lab-state">Idle</span></div>
        </div>
      </div>
    </section>
  `;
  root.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => navigate(b.dataset.jump));
}

/* ───────────────────────────────────────────────────────────
   SCHEDULE — list view using real server schema
   ─────────────────────────────────────────────────────────── */
async function renderSchedule(root) {
  const events = await apiGet('/api/events');
  const now = new Date();
  const upcoming = events
    .filter(e => e.start_time)
    .sort((a,b) => new Date(a.start_time) - new Date(b.start_time));

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Schedule</h1>
        <p class="p-h1-sub">${upcoming.length} upcoming event${upcoming.length===1?'':'s'}</p>
      </div>
      <div class="p-actions">
        <button class="btn-primary-sm" id="newEvent">+ New event</button>
      </div>
    </div>
    <div class="p-card" id="schedTable">
      ${upcoming.length ? upcoming.map(e => `
        <div class="p-slot">
          <div class="p-slot-time">${new Date(e.start_time).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</div>
          <div style="flex:1;">
            <div class="p-slot-title">${escHtml(e.title)}</div>
            <div class="p-slot-room">${fmtDT(e.start_time)}${e.end_time?' → '+fmtDT(e.end_time):''} · ${escHtml(e.location||'')}</div>
          </div>
          <span class="p-tag p-tag-outline">${escHtml(e.event_type||'event')}</span>
          <div class="row-actions">
            <button data-ev-edit="${e.id}">Edit</button>
            <button class="danger" data-ev-del="${e.id}">Delete</button>
          </div>
        </div>`).join('') : '<div class="empty">No upcoming events.</div>'}
    </div>
  `;

  root.querySelectorAll('[data-ev-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this event?')) return;
    await apiDel('/api/events/'+b.dataset.evDel);
    navigate('schedule');
  });
  root.querySelectorAll('[data-ev-edit]').forEach(b => b.onclick = () => {
    const ev = events.find(x => x.id == b.dataset.evEdit);
    openEventModal(ev);
  });

  function openEventModal(ev) {
    const isNew = !ev;
    ev = ev || {};
    modal(isNew ? 'New event' : 'Edit event', '', `
      <label>Title</label><input id="m_title" value="${escHtml(ev.title||'')}" placeholder="e.g. Boiling rig run">
      <label>Type</label>
      <select id="m_type">
        ${['meeting','seminar','reservation','other'].map(t=>`<option value="${t}"${(ev.event_type||'meeting')===t?' selected':''}>${t}</option>`).join('')}
      </select>
      <label>Start</label><input id="m_start" type="datetime-local" value="${ev.start_time?ev.start_time.slice(0,16):''}">
      <label>End (optional)</label><input id="m_end" type="datetime-local" value="${ev.end_time?ev.end_time.slice(0,16):''}">
      <label>Location</label><input id="m_loc" value="${escHtml(ev.location||'')}">
    `, async (mb) => {
      const body = {
        title: $('#m_title',mb).value.trim(),
        event_type: $('#m_type',mb).value,
        start_time: $('#m_start',mb).value,
        end_time: $('#m_end',mb).value || null,
        location: $('#m_loc',mb).value
      };
      if (!body.title || !body.start_time) throw new Error('Title and start time are required');
      if (isNew) await apiPost('/api/events', body);
      else await apiPut('/api/events/'+ev.id, body);
      navigate('schedule');
    });
  }

  $('#newEvent').onclick = () => openEventModal(null);
}

/* ───────────────────────────────────────────────────────────
   TASKS — kanban
   ─────────────────────────────────────────────────────────── */
async function renderTasks(root) {
  const tasks = await apiRows('/api/tasks');
  const COLS = [['todo','To do'], ['in_progress','In progress'], ['blocked','Blocked'], ['done','Done']];
  const tagBg = { inventory:'var(--status-info-tint)', experiment:'var(--gold-100)', lab:'var(--gray-100)', paper:'var(--status-info-tint)', maintenance:'var(--status-warn-tint)', data:'var(--gold-100)', team:'var(--gray-100)' };
  const tagFg = { inventory:'#075985', experiment:'var(--gold-700)', lab:'var(--fg-2)', paper:'#075985', maintenance:'#92400e', data:'var(--gold-700)', team:'var(--fg-2)' };

  const open = tasks.filter(t => t.status !== 'done').length;

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Tasks</h1>
        <p class="p-h1-sub">${open} open across the lab · ${tasks.length} total</p>
      </div>
      <div class="p-actions">
        <button class="btn-ghost-sm">Filter</button>
        <button class="btn-primary-sm" id="newTask">+ New task</button>
      </div>
    </div>
    <div class="p-kanban">
      ${COLS.map(([sid,sname]) => {
        const items = tasks.filter(t=>t.status===sid);
        return `<div class="p-col" data-status="${sid}">
          <div class="p-col-head"><div class="p-col-title">${sname}</div><div class="p-col-count">${items.length}</div></div>
          ${items.map(it => `<div class="p-task-card" data-id="${it.id}">
            <div class="p-task-card-title">${escHtml(it.title)}</div>
            <div class="p-task-card-foot">
              <span class="p-tag-sm" style="background:${tagBg[it.tag]||'var(--gray-100)'};color:${tagFg[it.tag]||'var(--fg-2)'}">${escHtml(it.tag||'lab')}</span>
              <div class="p-task-meta">
                <span class="p-task-due-sm">${escHtml(it.due_label||'—')}</span>
                <div class="p-task-av" title="${escHtml(it.assignee_display||it.assignee||it.assignee_name||'')}">${escHtml(initials(it.assignee_display||it.assignee||it.assignee_name))}</div>
              </div>
            </div>
          </div>`).join('')}
          <button class="p-col-add" data-add="${sid}">+ Add task</button>
        </div>`;
      }).join('')}
    </div>
  `;

  // Click a task card → edit/delete
  root.querySelectorAll('.p-task-card').forEach(card => {
    card.onclick = async () => {
      const t = tasks.find(x => x.id == card.dataset.id);
      if (!t) return;
      const bg = modal('Edit task', '', `
        <label>Title</label><input id="m_title" value="${escHtml(t.title)}">
        <label>Assignee</label><input id="m_who" value="${escHtml(t.assignee_display||t.assignee||t.assignee_name||'')}">
        <label>Tag</label>
        <select id="m_tag">
          ${['inventory','experiment','lab','paper','maintenance','data','team'].map(x=>`<option value="${x}"${x===t.tag?' selected':''}>${x}</option>`).join('')}
        </select>
        <label>Due</label><input id="m_due" value="${escHtml(t.due_label||'')}">
        <label>Status</label>
        <select id="m_st">
          ${COLS.map(([value,label])=>`<option value="${value}"${value===t.status?' selected':''}>${label}</option>`).join('')}
        </select>
        <label>&nbsp;</label>
        <div class="row-actions"><button class="danger" id="m_del">Delete</button></div>
      `, async (mb) => {
        await apiPut('/api/tasks/'+t.id, {
          title: $('#m_title',mb).value, assignee: $('#m_who',mb).value,
          tag: $('#m_tag',mb).value, due_label: $('#m_due',mb).value,
          status: $('#m_st',mb).value, sort_order: t.sort_order||0
        });
        navigate('tasks');
      });
      // hook delete button directly on the returned modal element
      const delBtn = bg.querySelector('#m_del');
      if (delBtn) delBtn.onclick = async (e) => {
        e.preventDefault();
        if (!confirm('Delete this task?')) return;
        await apiDel('/api/tasks/'+t.id);
        bg.remove();
        navigate('tasks');
      };
    };
  });

  root.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => {
    const status = btn.dataset.add;
    modal('New task', `Adding to "${status}".`, `
      <label>Title</label><input id="m_title" placeholder="Calibrate PIV camera">
      <label>Assignee</label><input id="m_who" placeholder="A. Park">
      <label>Tag</label>
      <select id="m_tag">${['inventory','experiment','lab','paper','maintenance','data','team'].map(x=>`<option value="${x}">${x}</option>`).join('')}</select>
      <label>Due</label><input id="m_due" placeholder="Fri">
    `, async (mb) => {
      await apiPost('/api/tasks', {
        title: $('#m_title',mb).value, assignee: $('#m_who',mb).value,
        tag: $('#m_tag',mb).value, due_label: $('#m_due',mb).value, status
      });
      navigate('tasks');
    });
  });

  $('#newTask').onclick = () => $('[data-add="todo"]').click();
}

/* ───────────────────────────────────────────────────────────
   MEETINGS — list
   ─────────────────────────────────────────────────────────── */
async function renderMeetings(root) {
  const meetings = await apiGet('/api/meetings');
  const typeColor = { team:'var(--navy-900)', '1:1':'var(--status-info)', external:'var(--gold-600)', review:'var(--status-warn)', onboarding:'var(--gold-700)' };

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Meetings</h1>
        <p class="p-h1-sub">${meetings.length} upcoming · 15 lab members</p>
      </div>
      <div class="p-actions">
        <button class="btn-ghost-sm">Calendar view</button>
        <button class="btn-primary-sm" id="newMeet">+ Schedule meeting</button>
      </div>
    </div>
    <div class="p-meet-list">
      ${meetings.map(m => {
        const att = (m.attendees||'').split(',').filter(Boolean);
        return `<div class="p-meet-card" data-id="${m.id}">
          <div class="p-meet-day">
            <div class="p-meet-day-lbl">${escHtml(m.day_label)}</div>
            <div class="p-meet-day-time">${escHtml(m.time_label)}</div>
          </div>
          <div class="p-meet-body">
            <div class="p-meet-title">${escHtml(m.title)}</div>
            <div class="p-meet-room"><i data-lucide="map-pin" class="p-icon-xs"></i>${escHtml(m.room||'')}</div>
            <div class="p-avatars">
              ${att.map((a,j)=>`<div class="p-av-sm" style="z-index:${att.length-j}">${escHtml(a.trim())}</div>`).join('')}
            </div>
          </div>
          <div class="p-meet-tag-col">
            <span class="p-meet-tag" style="background:${typeColor[m.type]||'var(--navy-900)'}">${escHtml(m.type)}</span>
            <div class="row-actions">
              <button data-edit="${m.id}">Edit</button>
              <button class="danger" data-del="${m.id}">Delete</button>
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="empty">No meetings scheduled.</div>'}
    </div>
  `;

  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    if (!confirm('Delete meeting?')) return;
    await apiDel('/api/meetings/'+b.dataset.del);
    navigate('meetings');
  });
  root.querySelectorAll('[data-edit]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const m = meetings.find(x=>x.id==b.dataset.edit);
    openMeetingModal(m);
  });

  function openMeetingModal(m) {
    const isNew = !m;
    m = m || { day_label:'TODAY', time_label:'09:30 – 10:30', title:'', room:'', attendees:'', type:'team' };
    modal(isNew?'Schedule meeting':'Edit meeting','',`
      <label>Day label</label><input id="m_day" value="${escHtml(m.day_label)}" placeholder="TODAY, TUE, WED…">
      <label>Time</label><input id="m_time" value="${escHtml(m.time_label)}" placeholder="09:30 – 10:30">
      <label>Title</label><input id="m_title" value="${escHtml(m.title)}">
      <label>Room</label><input id="m_room" value="${escHtml(m.room||'')}">
      <label>Attendees (comma-sep initials)</label><input id="m_att" value="${escHtml(m.attendees||'')}" placeholder="AO,SK,MR">
      <label>Type</label>
      <select id="m_type">${['team','1:1','external','review','onboarding'].map(x=>`<option value="${x}"${x===m.type?' selected':''}>${x}</option>`).join('')}</select>
    `, async (mb) => {
      const body = {
        day_label: $('#m_day',mb).value, time_label: $('#m_time',mb).value,
        title: $('#m_title',mb).value, room: $('#m_room',mb).value,
        attendees: $('#m_att',mb).value, type: $('#m_type',mb).value, sort_order: m.sort_order||0
      };
      if (isNew) await apiPost('/api/meetings', body);
      else await apiPut('/api/meetings/'+m.id, body);
      navigate('meetings');
    });
  }
  $('#newMeet').onclick = () => openMeetingModal(null);
}

/* ───────────────────────────────────────────────────────────
   INVENTORY — tabs + table
   ─────────────────────────────────────────────────────────── */
let _invLab = 'A';
async function renderInventory(root, embedded=false) {
  const response = await apiGet('/api/inventory').catch(()=>({ rows: [] }));
  const suppliers = await apiGet('/api/suppliers').catch(()=>[]);
  const items = Array.isArray(response) ? response : (response.rows || []);
  const labA = items.filter(i => i.lab==='A');
  const labB = items.filter(i => i.lab==='B');
  const list = _invLab==='A'?labA:labB;
  const stateOf = (it) => it.qty <= 0 ? 'alert' : it.qty <= it.min_qty ? 'warn' : 'ok';
  const stateMap = { ok:{cls:'p-tag-ok',lbl:'In stock',c:'var(--status-ok)'}, warn:{cls:'p-tag-warn',lbl:'Low',c:'var(--status-warn)'}, alert:{cls:'p-tag-alert',lbl:'Out',c:'var(--status-alert)'} };
  const low = list.filter(i => stateOf(i)!=='ok').length;

  root.innerHTML = `
    ${!embedded ? `<div class="p-page-head">
      <div>
        <h1 class="p-h1">Inventory</h1>
        <p class="p-h1-sub">Tracked across two lab spaces · ${low} item${low===1?'':'s'} need attention</p>
      </div>
      <div class="p-actions">
        <button class="btn-ghost-sm p-btn-tight" id="editSpaces" type="button">Edit lab spaces</button>
        <a class="btn-ghost-sm p-btn-tight" href="/api/inventory/export.csv" download style="text-decoration:none;">Export CSV</a>
        <button class="btn-primary-sm p-btn-tight" id="newInv" type="button">Add item</button>
      </div>
    </div>` : `<div class="p-inv-toolbar" style="justify-content:flex-end;">
      <button class="btn-primary-sm p-btn-tight" id="newInv" type="button">Add item</button>
    </div>`}

    <div class="p-tabs">
      <button class="p-tab${_invLab==='A'?' active':''}" data-lab="A">${escHtml(labLabel('A'))} <span class="p-tab-count">${labA.length}</span></button>
      <button class="p-tab${_invLab==='B'?' active':''}" data-lab="B">${escHtml(labLabel('B'))} <span class="p-tab-count">${labB.length}</span></button>
    </div>

    <div class="p-inv-toolbar">
      <div class="p-inv-search">
        <i data-lucide="search" class="p-inv-search-i"></i>
        <input id="invSearch" class="p-inv-input" placeholder="Search SKU, name, category…">
      </div>
      <select class="p-inv-select"><option>All categories</option></select>
      <select class="p-inv-select"><option>All status</option></select>
    </div>

    <div class="p-inv-table" id="invTable">
      <div class="p-inv-row p-inv-head">
        <div style="flex-basis:140px">SKU</div>
        <div style="flex:2.2">Item</div>
        <div style="flex:1">Category</div>
        <div style="flex:1">Quantity</div>
        <div style="flex:1">Status</div>
        <div style="flex-basis:80px"></div>
      </div>
      ${list.map(it => {
        const st = stateOf(it); const sm = stateMap[st];
        const supplierBits = [it.supplier_name, it.location].filter(Boolean).map(escHtml).join(' · ');
        const links = [];
        if (it.supplier_url) links.push(`<a href="${escHtml(it.supplier_url)}" target="_blank" rel="noopener">Vendor</a>`);
        if (it.reorder_url) links.push(`<a href="${escHtml(it.reorder_url)}" target="_blank" rel="noopener">Reorder</a>`);
        if (it.sds_url) links.push(`<a href="${escHtml(it.sds_url)}" target="_blank" rel="noopener">SDS</a>`);
        return `<div class="p-inv-row" data-id="${it.id}">
          <div style="flex-basis:140px"><code class="p-mono">${escHtml(it.sku)}</code></div>
          <div style="flex:2.2">
            <div class="p-inv-name">${escHtml(it.name)}</div>
            ${supplierBits ? `<div class="p-inline-meta"><span>${supplierBits}</span></div>` : ''}
            ${links.length ? `<div class="p-inline-links">${links.join('')}</div>` : ''}
          </div>
          <div style="flex:1" class="p-inv-cat">${escHtml(it.category||'')}</div>
          <div style="flex:1">
            <div><span class="p-qty-num">${it.qty}</span><span class="p-qty-min"> ${escHtml(it.unit || 'each')} / min ${it.min_qty}</span></div>
            <div class="p-qty-bar"><div class="p-qty-fill" style="width:${Math.min(100,(it.qty/Math.max(it.min_qty,1))*60)}%;background:${sm.c}"></div></div>
          </div>
          <div style="flex:1">
            <span class="p-tag ${sm.cls}"><span class="p-dot" style="background:${sm.c}"></span>${sm.lbl}</span>
          </div>
          <div style="flex-basis:80px;text-align:right" class="row-actions">
            <button data-edit="${it.id}">Edit</button>
            <button class="danger" data-del="${it.id}">×</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  root.querySelectorAll('[data-lab]').forEach(b => b.onclick = () => { _invLab = b.dataset.lab; renderInventory(root, embedded); if(window.lucide) window.lucide.createIcons(); });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete item?')) return;
    await apiDel('/api/inventory/'+b.dataset.del);
    renderInventory(root, embedded);
  });
  root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openInvModal(items.find(x=>x.id==b.dataset.edit)));
  $('#newInv').onclick = () => openInvModal(null);
  if ($('#editSpaces')) {
    $('#editSpaces').onclick = () => {
      _adminTab = 'settings';
      navigate('content');
    };
  }
  $('#invSearch').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    root.querySelectorAll('#invTable .p-inv-row:not(.p-inv-head)').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  function openInvModal(it) {
    const isNew = !it;
    it = it || { lab:_invLab, sku:'', name:'', category:'', qty:0, min_qty:0, unit:'each', supplier_id:'', reorder_url:'', notes:'', expiry_date:'', location:'', sds_url:'' };
    const bg = modal(isNew?'Add inventory item':'Edit item','',`
      <label>Lab</label><select id="m_lab"><option value="A"${it.lab==='A'?' selected':''}>${escHtml(labLabel('A'))}</option><option value="B"${it.lab==='B'?' selected':''}>${escHtml(labLabel('B'))}</option></select>
      <label>SKU</label><input id="m_sku" value="${escHtml(it.sku)}" placeholder="SN-LAT-00000">
      <label>Name</label><input id="m_name" value="${escHtml(it.name)}">
      <label>Category</label><input id="m_cat" value="${escHtml(it.category||'')}" placeholder="Sensors / Hardware / Consumables / Fluids / Optics / PPE">
      <div class="p-grid-2" style="gap:12px;">
        <div><label>Quantity</label><input id="m_qty" type="number" value="${it.qty}"></div>
        <div><label>Min quantity</label><input id="m_min" type="number" value="${it.min_qty}"></div>
      </div>
      <div class="p-grid-2" style="gap:12px;">
        <div><label>Unit</label><input id="m_unit" value="${escHtml(it.unit||'each')}" placeholder="each / bottles / packs"></div>
        <div><label>Expiry date</label><input id="m_exp" type="date" value="${escHtml(it.expiry_date||'')}"></div>
      </div>
      <label>Location</label><input id="m_loc" value="${escHtml(it.location||'')}" placeholder="Cabinet, shelf, freezer, or bench">
      <label>Supplier</label>
      <select id="m_sup">
        <option value="">No supplier linked</option>
        ${suppliers.map(s => `<option value="${s.id}"${String(s.id)===String(it.supplier_id||'')?' selected':''}>${escHtml(s.name)}</option>`).join('')}
      </select>
      <label>Vendor / reorder URL</label><input id="m_reorder" value="${escHtml(it.reorder_url||'')}" placeholder="https://vendor.example/item">
      <label>SDS / reference URL</label><input id="m_sds" value="${escHtml(it.sds_url||'')}" placeholder="https://...">
      <label>Notes</label><textarea id="m_notes" style="min-height:110px;">${escHtml(it.notes||'')}</textarea>
    `, async (mb) => {
      const body = {
        lab: $('#m_lab',mb).value, sku: $('#m_sku',mb).value, name: $('#m_name',mb).value,
        category: $('#m_cat',mb).value, qty: +$('#m_qty',mb).value, min_qty: +$('#m_min',mb).value,
        unit: $('#m_unit',mb).value || 'each',
        supplier_id: $('#m_sup',mb).value ? +$('#m_sup',mb).value : null,
        reorder_url: $('#m_reorder',mb).value,
        notes: $('#m_notes',mb).value,
        expiry_date: $('#m_exp',mb).value || null,
        location: $('#m_loc',mb).value,
        sds_url: $('#m_sds',mb).value,
        sort_order: it.sort_order||0
      };
      if (isNew) await apiPost('/api/inventory', body);
      else await apiPut('/api/inventory/'+it.id, body);
      renderInventory(root, embedded); if(window.lucide) window.lucide.createIcons();
    });
    bg.querySelector('.modal').classList.add('is-wide');
  }
}

/* ───────────────────────────────────────────────────────────
   PROJECTS
   ─────────────────────────────────────────────────────────── */
async function renderProjects(root) {
  const projs = await apiGet('/api/projects');
  const statusTag = { active:['Active','p-tag-ok','var(--status-ok)'], paused:['Paused','p-tag-warn','var(--status-warn)'], completed:['Completed','p-tag-info','var(--status-info)'] };
  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Projects</h1>
        <p class="p-h1-sub">${projs.length} active project${projs.length===1?'':'s'} across the lab</p>
      </div>
      <div class="p-actions">
        <button class="btn-primary-sm" id="newProj">+ New project</button>
      </div>
    </div>

    <div class="p-grid-2">
      ${projs.map(p => {
        const [lbl,cls,c] = statusTag[p.status] || statusTag.active;
        return `<div class="p-card">
          <div class="p-card-head">
            <div class="p-card-title">${escHtml(p.title)}</div>
            <span class="p-tag ${cls}"><span class="p-dot" style="background:${c}"></span>${lbl}</span>
          </div>
          <div style="font-size:13px;color:var(--fg-2);line-height:1.55;margin-bottom:12px">${escHtml(p.description||'')}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--fg-3)">
            <div><strong>Lead:</strong> ${escHtml(p.lead||'—')}</div>
            <div class="row-actions">
              <button data-edit="${p.id}">Edit</button>
              <button class="danger" data-del="${p.id}">Delete</button>
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="empty p-card">No projects yet.</div>'}
    </div>
  `;
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async ()=>{
    if(!confirm('Delete project?')) return;
    await apiDel('/api/projects/'+b.dataset.del); navigate('projects');
  });
  root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openProj(projs.find(x=>x.id==b.dataset.edit)));
  $('#newProj').onclick = () => openProj(null);

  function openProj(p) {
    const isNew = !p;
    p = p || { title:'', lead:'', status:'active', description:'' };
    modal(isNew?'New project':'Edit project','',`
      <label>Title</label><input id="m_t" value="${escHtml(p.title)}">
      <label>Lead</label><input id="m_l" value="${escHtml(p.lead||'')}">
      <label>Status</label>
      <select id="m_s">${['active','paused','completed'].map(x=>`<option value="${x}"${x===p.status?' selected':''}>${x}</option>`).join('')}</select>
      <label>Description</label><textarea id="m_d">${escHtml(p.description||'')}</textarea>
    `, async (mb) => {
      const body = { title:$('#m_t',mb).value, lead:$('#m_l',mb).value, status:$('#m_s',mb).value, description:$('#m_d',mb).value, sort_order:p.sort_order||0 };
      if(isNew) await apiPost('/api/projects', body); else await apiPut('/api/projects/'+p.id, body);
      navigate('projects');
    });
  }
}

/* ───────────────────────────────────────────────────────────
   ADMIN — Members / Content / Apps / Settings / Audit
   Members + Content + Apps render real lab data (people/news/publications/research/sponsors)
   ─────────────────────────────────────────────────────────── */
let _adminTab = 'people';
const ADMIN_TAB_META = {
  people:        { title: 'People and profiles', copy: 'Keep bios, roles, contact links, and photos aligned with the current lab roster.' },
  news:          { title: 'News publishing', copy: 'Highlight milestones, conference activity, awards, and lab announcements with strong cover images.' },
  publications:  { title: 'Publication archive', copy: 'Maintain the paper list, outbound links, and venue metadata for researchers and visitors.' },
  research:      { title: 'Research pillars', copy: 'Shape the homepage research narrative with concise themes and compelling supporting imagery.' },
  facilities:    { title: 'Facility showcase', copy: 'Document rigs, instruments, and reference materials so collaborators know what is available.' },
  hero:          { title: 'Homepage hero', copy: 'Refresh the first impression with seasonal photography, clear positioning, and disciplined copy.' },
  gallery:       { title: 'Gallery curation', copy: 'Surface candid lab work, team moments, and conference images that make the site feel alive.' },
  downloads:     { title: 'Download library', copy: 'Manage PDFs, office files, media, and other downloadable resources shown on the public site.' },
  sponsors:      { title: 'Sponsors and collaborators', copy: 'Present funding partners and collaborators with clean, current acknowledgements.' },
  apps:          { title: 'App launcher', copy: 'Organize tools, calculators, and linked experiences so students can find them quickly.' },
  settings:      { title: 'Site and platform copy', copy: 'Tune labels, section intros, and surface-level messaging used across the website and platform.' },
};
async function renderAdmin(root) {
  const tabs = allowedContentTabs();
  if (!tabs.some(([id]) => id === _adminTab)) _adminTab = tabs[0][0];
  const activeMeta = ADMIN_TAB_META[_adminTab] || { title: 'Content operations', copy: 'Manage the public-facing LATFS website.' };
  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <div class="eyebrow" style="color:var(--gold-700)">Administration</div>
        <h1 class="p-h1">Admin Panel</h1>
        <p class="p-h1-sub">Members, content publishing, and site settings.</p>
      </div>
      <div class="p-actions">
        <a class="btn-ghost-sm" href="/" target="_blank" rel="noopener" style="text-decoration:none;">Preview public site</a>
        <button class="btn-ghost-sm" id="logoutTop"><i data-lucide="log-out" style="width:12px;height:12px;margin-right:4px"></i>Sign out</button>
      </div>
    </div>

    <div class="p-admin-ribbon">
      <div>
        <div class="p-admin-kicker">Current focus</div>
        <div class="p-admin-title">${escHtml(activeMeta.title)}</div>
        <div class="p-admin-copy">${escHtml(activeMeta.copy)}</div>
      </div>
      <div class="p-admin-pill-row">
        <span class="p-admin-pill">${escHtml(SESSION_USER.role || 'admin')}</span>
        <span class="p-admin-pill soft">${isLabStaffRole(SESSION_USER.role) ? 'Full content access' : 'Moderator-safe access'}</span>
      </div>
    </div>

    <div class="p-tabs" id="adminTabs">
      ${tabs.map(([id,lbl,icn]) =>
        `<button class="p-tab${id===_adminTab?' active':''}" data-tab="${id}"><i data-lucide="${icn}" style="width:14px;height:14px"></i> ${lbl}</button>`
      ).join('')}
    </div>

    <div id="adminBody"></div>
  `;
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { _adminTab = b.dataset.tab; renderAdmin(root); if(window.lucide) window.lucide.createIcons(); });
  $('#logoutTop').onclick = doLogout;

  const body = $('#adminBody');
  if (_adminTab === 'news') renderNewsTab(body, await apiGet('/api/news').catch(()=>[]));
  else if (_adminTab === 'publications' && isLabStaffRole(SESSION_USER.role)) renderPubsTab(body, await apiGet('/api/publications').catch(()=>[]));
  else if (_adminTab === 'research' && isLabStaffRole(SESSION_USER.role)) renderResearchTab(body);
  else if (_adminTab === 'people' && isLabStaffRole(SESSION_USER.role)) renderPeopleTab(body, await apiGet('/api/people').catch(()=>[]));
  else if (_adminTab === 'facilities' && isLabStaffRole(SESSION_USER.role)) renderFacilitiesTab(body);
  else if (_adminTab === 'hero') renderHeroTab(body);
  else if (_adminTab === 'gallery') renderGalleryTab(body);
  else if (_adminTab === 'downloads' && isLabStaffRole(SESSION_USER.role)) renderDownloadsTab(body);
  else if (_adminTab === 'sponsors' && isLabStaffRole(SESSION_USER.role)) renderSponsorsTab(body);
  else if (_adminTab === 'apps' && isLabStaffRole(SESSION_USER.role)) renderAppsTab(body);
  else if (_adminTab === 'settings' && isLabStaffRole(SESSION_USER.role)) renderSettingsTab(body);
  else body.innerHTML = '<div class="p-card"><p style="color:var(--fg-3);font-size:13px;">This account has limited website-moderator access. News, hero, and gallery remain available here.</p></div>';

  if (window.lucide) window.lucide.createIcons();
}



function renderNewsTab(body, news) {
  body.innerHTML = `
    <div class="p-inv-toolbar">
      <button class="btn-primary-sm" id="newNews">+ New news item</button>
    </div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head">
        <div style="flex-basis:120px">Date</div>
        <div style="flex:2">Title</div>
        <div style="flex-basis:100px;text-align:right"></div>
      </div>
      ${news.map(n => `<div class="p-inv-row" data-id="${n.id}">
        <div style="flex-basis:120px"><code class="p-mono">${escHtml(n.date)}</code></div>
        <div style="flex:2"><div class="p-inv-name">${escHtml(n.title)}</div><div style="font-size:11px;color:var(--fg-4)">${escHtml((n.content||'').slice(0,100))}${(n.content||'').length>100?'…':''}</div></div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit="${n.id}">Edit</button><button class="danger" data-del="${n.id}">×</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if(confirm('Delete?')) { await apiDel('/api/news/'+b.dataset.del); renderAdmin($('#mainContent')); }});
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openNews(news.find(n=>n.id==b.dataset.edit)));
  $('#newNews').onclick = () => openNews(null);
  function openNews(n) {
    const isNew = !n; n = n || {title:'',content:'',date: new Date().toISOString().slice(0,10), image_url:''};
    modal(isNew?'New news item':'Edit news','',`
      <label>Date</label><input id="m_date" type="date" value="${escHtml(n.date)}">
      <label>Title</label><input id="m_t" value="${escHtml(n.title)}">
      <label>Cover image (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${n.image_url ? `<img src="${escHtml(n.image_url)}" alt="" style="height:48px;border-radius:6px;border:1px solid var(--border-1);">` : ''}
        <input type="file" id="m_img_file" accept="image/*" style="flex:1;">
      </div>
      <label>Cover image URL</label><input id="m_img" value="${escHtml(n.image_url||'')}">
      <label>Content</label><textarea id="m_c" style="min-height:160px;">${escHtml(n.content)}</textarea>
    `, async (mb) => {
      const f = $('#m_img_file', mb);
      if (f && f.files && f.files[0]) { const url = await uploadPhoto(f.files[0]); $('#m_img', mb).value = url; }
      const body = { date:$('#m_date',mb).value, title:$('#m_t',mb).value, content:$('#m_c',mb).value, image_url:$('#m_img',mb).value };
      if (isNew) await apiPost('/api/news', body); else await apiPut('/api/news/'+n.id, body);
      renderAdmin($('#mainContent'));
    });
  }
}

function renderPubsTab(body, pubs) {
  body.innerHTML = `
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newPub">+ Add publication</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex-basis:60px">Year</div><div style="flex:3">Title</div><div style="flex:1">Venue</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${pubs.map(p => `<div class="p-inv-row">
        <div style="flex-basis:60px"><code class="p-mono">${p.year}</code></div>
        <div style="flex:3"><div class="p-inv-name">${escHtml(p.title)}</div><div style="font-size:11px;color:var(--fg-4)">${escHtml(p.authors||'')}</div></div>
        <div style="flex:1;font-size:12px;color:var(--fg-3)">${escHtml(p.venue||'')}</div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit="${p.id}">Edit</button><button class="danger" data-del="${p.id}">×</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async ()=>{ if(confirm('Delete?')){ await apiDel('/api/publications/'+b.dataset.del); renderAdmin($('#mainContent')); }});
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = ()=>openPub(pubs.find(x=>x.id==b.dataset.edit)));
  $('#newPub').onclick = () => openPub(null);
  function openPub(p) {
    const isNew = !p; p = p || {title:'',authors:'',venue:'',year:new Date().getFullYear(),pdf_url:'',doi_url:''};
    modal(isNew?'Add publication':'Edit publication','',`
      <label>Title</label><input id="m_t" value="${escHtml(p.title)}">
      <label>Authors</label><input id="m_a" value="${escHtml(p.authors)}">
      <label>Venue</label><input id="m_v" value="${escHtml(p.venue)}">
      <label>Year</label><input id="m_y" type="number" value="${p.year}">
      <label>PDF file (upload, optional)</label>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="file" id="m_pdf_file" accept=".pdf,application/pdf" style="flex:1;">
        <span id="m_pdf_status" style="font-size:11px; color:var(--fg-4);"></span>
      </div>
      <label>PDF URL (or use upload above)</label><input id="m_pdf" value="${escHtml(p.pdf_url||'')}">
      <label>DOI URL</label><input id="m_doi" value="${escHtml(p.doi_url||'')}">
    `, async (mb) => {
      const fileInput = $('#m_pdf_file', mb);
      if (fileInput && fileInput.files && fileInput.files[0]) {
        $('#m_pdf_status', mb).textContent = 'Uploading...';
        try { const u = await uploadDoc(fileInput.files[0]); $('#m_pdf', mb).value = u.url; $('#m_pdf_status', mb).textContent = 'Uploaded.'; }
        catch(e){ $('#m_pdf_status', mb).textContent = e.message; throw e; }
      }
      const body = { title:$('#m_t',mb).value, authors:$('#m_a',mb).value, venue:$('#m_v',mb).value, year:+$('#m_y',mb).value, pdf_url:$('#m_pdf',mb).value, doi_url:$('#m_doi',mb).value };
      if(isNew) await apiPost('/api/publications', body); else await apiPut('/api/publications/'+p.id, body);
      renderAdmin($('#mainContent'));
    });
  }
}

async function renderResearchTab(body) {
  const areas = await apiGet('/api/research');
  body.innerHTML = `
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newR">+ Add research area</button></div>
    <div class="p-grid-2">
      ${areas.map(r => `<div class="p-card">
        <div class="p-card-head"><div class="p-card-title">${escHtml(r.title)}</div></div>
        <div style="font-size:13px;color:var(--fg-2);margin-bottom:10px">${escHtml(r.description||'')}</div>
        <div class="row-actions"><button data-edit="${r.id}">Edit</button><button class="danger" data-del="${r.id}">Delete</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async()=>{ if(confirm('Delete?')){ await apiDel('/api/research/'+b.dataset.del); renderAdmin($('#mainContent')); }});
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openR(areas.find(x=>x.id==b.dataset.edit)));
  $('#newR').onclick = () => openR(null);
  function openR(r) {
    const isNew = !r; r = r || {title:'',description:'',image_url:'',sort_order:0};
    modal(isNew?'Add research area':'Edit research area','',`
      <label>Title</label><input id="m_t" value="${escHtml(r.title)}">
      <label>Description</label><textarea id="m_d" style="min-height:140px;">${escHtml(r.description||'')}</textarea>
      <label>Cover image (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${r.image_url ? `<img src="${escHtml(r.image_url)}" alt="" style="height:48px; border-radius:6px; border:1px solid var(--border-1);">` : ''}
        <input type="file" id="m_i_file" accept="image/*" style="flex:1;">
      </div>
      <label>Image URL (or use upload above)</label><input id="m_i" value="${escHtml(r.image_url||'')}">
      <label>Sort order</label><input id="m_s" type="number" value="${r.sort_order||0}">
    `, async (mb) => {
      const f = $('#m_i_file', mb);
      if (f && f.files && f.files[0]) { const url = await uploadPhoto(f.files[0]); $('#m_i', mb).value = url; }
      const body = { title:$('#m_t',mb).value, description:$('#m_d',mb).value, image_url:$('#m_i',mb).value, sort_order:+$('#m_s',mb).value };
      if(isNew) await apiPost('/api/research', body); else await apiPut('/api/research/'+r.id, body);
      renderAdmin($('#mainContent'));
    });
  }
}

function renderPeopleTab(body, people) {
  body.innerHTML = `
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newP">+ Add person</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Name</div><div style="flex:1">Role</div><div style="flex:1">Category</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${people.map(p => `<div class="p-inv-row">
        <div style="flex:2;display:flex;align-items:center;gap:12px">
          ${p.photo_url ? `<img src="${escHtml(p.photo_url)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border-1);">`
          : `<div class="p-task-av" style="width:36px;height:36px;font-size:12px;background:var(--gold-600)">${escHtml(initials(p.name))}</div>`}
          <div><div class="p-inv-name">${escHtml(p.name)}</div><div style="font-size:11px;color:var(--fg-4)">${escHtml(p.email||'')}</div></div>
        </div>
        <div style="flex:1;font-size:12px;color:var(--fg-2)">${escHtml(p.role||'')}</div>
        <div style="flex:1"><span class="p-tag p-tag-outline">${escHtml(p.category||'')}</span></div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit="${p.id}">Edit</button><button class="danger" data-del="${p.id}">×</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async ()=>{ if(confirm('Remove?')){ await apiDel('/api/people/'+b.dataset.del); renderAdmin($('#mainContent')); }});
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = ()=>openP(people.find(x=>x.id==b.dataset.edit)));
  $('#newP').onclick = ()=>openP(null);
  function openP(p) {
    const isNew = !p; p = p || {name:'',role:'',category:'phd',email:'',bio:'',photo_url:'',active:1};
    const bg = modal(isNew?'Add person':'Edit person','',`
      <label>Name</label><input id="m_n" value="${escHtml(p.name)}">
      <label>Role</label><input id="m_r" value="${escHtml(p.role)}">
      <label>Category</label>
      <select id="m_c">${['director','manager','faculty','postdoc','phd','ms','ug','alumni','collaborator'].map(x=>`<option value="${x}"${x===p.category?' selected':''}>${x}</option>`).join('')}</select>
      <label>Email</label><input id="m_e" value="${escHtml(p.email||'')}">
      <label>Profile photo (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        <img id="m_ph_prev" src="${escHtml(p.photo_url||'')}" alt="" style="width:54px;height:54px;border-radius:50%;object-fit:cover;object-position:${escHtml(p.photo_position||'center center')};background:var(--bg-1);border:1px solid var(--border-1);${p.photo_url?'':'visibility:hidden;'}">
        <input type="file" id="m_ph_file" accept="image/*" style="flex:1;">
      </div>
      <label>Photo URL (or use upload above)</label><input id="m_ph" value="${escHtml(p.photo_url||'')}">
      <label>Photo focal point — click on the image to choose what should be centered in the circle</label>
      <div id="m_ph_picker" style="position:relative; width:300px; height:300px; border:1px solid var(--border-1); border-radius:8px; overflow:hidden; background:var(--bg-1); cursor:crosshair;">
        <img id="m_ph_picker_img" src="${escHtml(p.photo_url||'')}" alt="" style="width:100%; height:100%; object-fit:contain; ${p.photo_url?'':'display:none;'}">
        <div id="m_ph_picker_dot" style="position:absolute; width:18px; height:18px; border:2px solid var(--gold-600); background:rgba(255,255,255,.6); border-radius:50%; transform:translate(-50%,-50%); pointer-events:none; left:50%; top:50%;"></div>
      </div>
      <input id="m_pp" type="hidden" value="${escHtml(p.photo_position||'center center')}">
      <label>Result preview</label>
      <img id="m_ph_result" src="${escHtml(p.photo_url||'')}" alt="" style="width:120px;height:120px;border-radius:50%;object-fit:cover;object-position:${escHtml(p.photo_position||'center center')};border:3px solid #fff; box-shadow:var(--shadow-sm); ${p.photo_url?'':'display:none;'}">
      <label>LinkedIn URL</label><input id="m_li" value="${escHtml(p.linkedin_url||'')}" placeholder="https://linkedin.com/in/...">
      <label>Personal website (optional)</label><input id="m_ws" value="${escHtml(p.website_url||'')}">
      <label>Bio</label><textarea id="m_b" style="min-height:120px;">${escHtml(p.bio||'')}</textarea>
    `, async (mb) => {
      const f = $('#m_ph_file', mb);
      if (f && f.files && f.files[0]) {
        const url = await uploadPhoto(f.files[0]);
        $('#m_ph', mb).value = url;
        $('#m_ph_picker_img', mb).src = url; $('#m_ph_picker_img', mb).style.display = 'block';
        $('#m_ph_result', mb).src = url; $('#m_ph_result', mb).style.display = 'inline-block';
      }
      const body = { name:$('#m_n',mb).value, role:$('#m_r',mb).value, category:$('#m_c',mb).value, email:$('#m_e',mb).value, photo_url:$('#m_ph',mb).value, photo_position:$('#m_pp',mb).value, linkedin_url:$('#m_li',mb).value, website_url:$('#m_ws',mb).value, bio:$('#m_b',mb).value, active:1 };
      if(isNew) await apiPost('/api/people', body); else await apiPut('/api/people/'+p.id, body);
      renderAdmin($('#mainContent'));
    });
    bg.querySelector('.modal').classList.add('is-wide');
    // Upgrade the focal-point picker into a larger drag-to-frame tool.
    setTimeout(() => {
      const picker = document.getElementById('m_ph_picker');
      if (!picker) return;
      const img = document.getElementById('m_ph_picker_img');
      const dot = document.getElementById('m_ph_picker_dot');
      const result = document.getElementById('m_ph_result');
      const preview = document.getElementById('m_ph_prev');
      const hidden = document.getElementById('m_pp');
      const urlInput = document.getElementById('m_ph');
      const fileInput = document.getElementById('m_ph_file');
      const resultLabel = result ? result.previousElementSibling : null;
      picker.className = 'p-photo-stage';
      picker.style.width = '100%';
      picker.style.maxWidth = '360px';
      picker.style.height = 'auto';
      if (img) {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
      }
      if (dot) dot.className = 'p-photo-dot';
      if (resultLabel && resultLabel.tagName === 'LABEL') resultLabel.textContent = 'Circle preview';
      if (result) {
        result.style.width = '120px';
        result.style.height = '120px';
        result.style.display = result.src ? 'block' : 'none';
      }
      const xMap = { left: '0%', center: '50%', right: '100%' };
      const yMap = { top: '0%', center: '50%', bottom: '100%' };
      const safeImageSrc = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('/')) return raw;
        if (raw.startsWith('blob:') || raw.startsWith('data:image/')) return raw;
        try {
          const parsed = new URL(raw, window.location.origin);
          if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin === window.location.origin) {
            return parsed.href;
          }
        } catch (_) {}
        return '';
      };
      const applySource = (src) => {
        const safeSrc = safeImageSrc(src);
        const visible = !!safeSrc;
        if (img) {
          img.src = safeSrc;
          img.style.display = visible ? 'block' : 'none';
        }
        if (result) {
          result.src = safeSrc;
          result.style.display = visible ? 'block' : 'none';
        }
        if (preview) {
          preview.src = safeSrc;
          preview.style.visibility = visible ? 'visible' : 'hidden';
        }
      };
      const applyFocus = (pos) => {
        const parts = String(pos || 'center center').split(' ');
        const x = xMap[parts[0]] || parts[0] || '50%';
        const y = yMap[parts[1]] || parts[1] || '50%';
        hidden.value = `${x} ${y}`;
        if (dot) {
          dot.style.left = x;
          dot.style.top = y;
        }
        if (img) img.style.objectPosition = `${x} ${y}`;
        if (result) result.style.objectPosition = `${x} ${y}`;
        if (preview) preview.style.objectPosition = `${x} ${y}`;
      };
      const setFromPointer = (clientX, clientY) => {
        if (!img || !img.src) return;
        const rect = picker.getBoundingClientRect();
        const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)).toFixed(1) + '%';
        const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)).toFixed(1) + '%';
        applyFocus(`${xPct} ${yPct}`);
      };
      const modalBody = picker.parentElement;
      const leftCol = document.createElement('div');
      const toolWrap = document.createElement('div');
      toolWrap.className = 'p-photo-tool';
      const infoCol = document.createElement('div');
      infoCol.innerHTML = `
        <div class="p-photo-help">Click or drag on the image to choose what stays centered in the circular crop. The preview reflects the same cover-style framing used on the public site.</div>
        <div class="p-photo-presets">
          <button type="button" data-photo-pos="50% 50%">Center</button>
          <button type="button" data-photo-pos="50% 26%">Raise</button>
          <button type="button" data-photo-pos="35% 50%">Left</button>
          <button type="button" data-photo-pos="65% 50%">Right</button>
        </div>
      `;
      const previewCard = document.createElement('div');
      previewCard.className = 'p-photo-preview-card';
      if (resultLabel && result) {
        resultLabel.remove();
        previewCard.appendChild(resultLabel);
        previewCard.appendChild(result);
      }
      infoCol.appendChild(previewCard);
      modalBody.insertBefore(toolWrap, picker);
      leftCol.appendChild(picker);
      if (hidden) leftCol.appendChild(hidden);
      toolWrap.appendChild(leftCol);
      toolWrap.appendChild(infoCol);
      let dragging = false;
      applyFocus(hidden.value || 'center center');
      applySource(urlInput.value.trim() || p.photo_url || '');
      picker.addEventListener('pointerdown', e => {
        dragging = true;
        setFromPointer(e.clientX, e.clientY);
      });
      picker.addEventListener('pointermove', e => {
        if (dragging) setFromPointer(e.clientX, e.clientY);
      });
      ['pointerup','pointerleave','pointercancel'].forEach(evt =>
        picker.addEventListener(evt, () => { dragging = false; })
      );
      infoCol.querySelectorAll('[data-photo-pos]').forEach(btn => btn.onclick = () => applyFocus(btn.dataset.photoPos));
      urlInput.addEventListener('input', () => applySource(urlInput.value.trim()));
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          const file = fileInput.files && fileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => applySource(String(reader.result || ''));
          reader.readAsDataURL(file);
        });
      }
    }, 0);
  }
}


async function renderFacilitiesTab(body) {
  const facs = await apiGet('/api/facilities').catch(()=>[]);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Each facility has its own page on the public site (Facilities → click a card). Add photos and PDF documentation per facility.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newFac">+ Add facility</button></div>
    <div class="p-grid-2">
      ${facs.length ? facs.map(f => `
        <div class="p-card" style="padding:0; overflow:hidden;">
          ${f.photo_url ? `<img src="${escHtml(f.photo_url)}" alt="" style="width:100%; height:160px; object-fit:cover; display:block; background:var(--bg-1);">` : '<div style="height:160px;background:var(--bg-1);"></div>'}
          <div style="padding:14px 16px;">
            <div class="p-inv-name">${escHtml(f.name||'(untitled)')}</div>
            <div style="font-size:12px;color:var(--fg-3); margin:4px 0 10px;">${escHtml((f.description||'').slice(0,120))}${(f.description||'').length>120?'...':''}</div>
            <div style="font-size:11px;color:var(--fg-4); margin-bottom:8px;">${f.doc_url?'<a href="'+escHtml(f.doc_url)+'" target="_blank" style="color:var(--gold-700);">'+escHtml(f.doc_name||'document')+'</a>':'no document'}</div>
            <div class="row-actions"><button data-edit="${f.id}">Edit</button><button class="danger" data-del="${f.id}">Delete</button></div>
          </div>
        </div>`).join('') : '<div class="empty">No facilities yet.</div>'}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if(!confirm('Delete this facility?')) return;
    await apiDel('/api/facilities/'+b.dataset.del); renderAdmin($('#mainContent'));
  });
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openFac(facs.find(f=>f.id==b.dataset.edit)));
  $('#newFac').onclick = () => openFac(null);
  function openFac(f) {
    const isNew = !f; f = f || {name:'', description:'', content:'', photo_url:'', doc_url:'', doc_name:'', sort_order:0};
    modal(isNew?'Add facility':'Edit facility','',`
      <label>Name</label><input id="m_n" value="${escHtml(f.name||'')}">
      <label>Short description (one or two lines)</label><textarea id="m_d">${escHtml(f.description||'')}</textarea>
      <label>Long description (shown on detail page)</label><textarea id="m_c" style="min-height:160px;">${escHtml(f.content||'')}</textarea>
      <label>Cover photo (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${f.photo_url ? `<img src="${escHtml(f.photo_url)}" alt="" style="height:50px; border-radius:6px; border:1px solid var(--border-1);">` : ''}
        <input type="file" id="m_pf" accept="image/*" style="flex:1;">
      </div>
      <label>Photo URL (or use upload above)</label><input id="m_p" value="${escHtml(f.photo_url||'')}">
      <label>Documentation file (PDF, upload)</label>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="file" id="m_df" accept=".pdf,application/pdf" style="flex:1;">
        <span id="m_df_status" style="font-size:11px; color:var(--fg-4);">${f.doc_url ? '<a href="'+escHtml(f.doc_url)+'" target="_blank" style="color:var(--gold-700);">current: '+escHtml(f.doc_name||'doc')+'</a>' : ''}</span>
      </div>
      <label>Doc URL (or use upload above)</label><input id="m_du" value="${escHtml(f.doc_url||'')}">
      <label>Doc display name</label><input id="m_dn" value="${escHtml(f.doc_name||'')}">
      <label>Sort order</label><input id="m_s" type="number" value="${f.sort_order||0}">
    `, async (mb) => {
      const pf = $('#m_pf', mb);
      if (pf && pf.files && pf.files[0]) { const url = await uploadPhoto(pf.files[0]); $('#m_p', mb).value = url; }
      const df = $('#m_df', mb);
      if (df && df.files && df.files[0]) {
        const u = await uploadDoc(df.files[0]);
        $('#m_du', mb).value = u.url;
        if (!$('#m_dn', mb).value) $('#m_dn', mb).value = u.name;
      }
      const body = { name:$('#m_n',mb).value, description:$('#m_d',mb).value, content:$('#m_c',mb).value, photo_url:$('#m_p',mb).value, doc_url:$('#m_du',mb).value, doc_name:$('#m_dn',mb).value, sort_order:+$('#m_s',mb).value };
      if(isNew) await apiPost('/api/facilities', body); else await apiPut('/api/facilities/'+f.id, body);
      renderAdmin($('#mainContent'));
    });
  }
}

async function renderHeroTab(body) {
  const slides = await apiGet('/api/hero-slides').catch(()=>[]);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Images shown behind the lab name on the public homepage. The slideshow rotates through these. Drop in 1600x900+ photos for best quality.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newSlide">+ Add hero slide</button></div>
    <div class="p-grid-3">
      ${slides.length ? slides.map(s => `
        <div class="p-card" style="padding:0; overflow:hidden;">
          <img src="${escHtml(s.image_url)}" alt="" style="width:100%; height:170px; object-fit:cover; display:block; background:var(--bg-1);">
          <div style="padding:12px;">
            <div class="p-inv-name">${escHtml(s.title||'(untitled)')}</div>
            <div style="font-size:12px;color:var(--fg-3); margin:4px 0 10px;">${escHtml(s.caption||'')}</div>
            <div class="row-actions"><button data-edit="${s.id}">Edit</button><button class="danger" data-del="${s.id}">Delete</button></div>
          </div>
        </div>`).join('') : '<div class="empty">No hero slides yet.</div>'}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if(!confirm('Delete this slide?')) return;
    await apiDel('/api/hero-slides/'+b.dataset.del); renderAdmin($('#mainContent'));
  });
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openSlide(slides.find(s=>s.id==b.dataset.edit)));
  $('#newSlide').onclick = () => openSlide(null);
  function openSlide(s) {
    const isNew = !s; s = s || {title:'', caption:'', image_url:'', sort_order:0};
    modal(isNew?'Add hero slide':'Edit hero slide','',`
      <label>Title</label><input id="m_t" value="${escHtml(s.title||'')}">
      <label>Caption</label><textarea id="m_c">${escHtml(s.caption||'')}</textarea>
      <label>Sort order</label><input id="m_s" type="number" value="${s.sort_order||0}">
      ${isNew ? `<label>Image (required)</label><input type="file" id="m_f" accept="image/*">` :
                `<label>Replace image (optional)</label><input type="file" id="m_f" accept="image/*">
                 <div style="margin-top:8px;"><img src="${escHtml(s.image_url)}" alt="" style="max-width:100%; max-height:140px; border-radius:6px; border:1px solid var(--border-1);"></div>`}
    `, async (mb) => {
      const f = $('#m_f', mb);
      const title = $('#m_t', mb).value;
      const caption = $('#m_c', mb).value;
      const sort_order = +$('#m_s', mb).value;
      if (isNew) {
        if(!f.files[0]) throw new Error('Please pick an image file');
        await uploadHeroSlide(f.files[0], title, caption, sort_order);
      } else {
        let image_url = s.image_url;
        if (f.files[0]) image_url = await uploadPhoto(f.files[0]);
        await apiPut('/api/hero-slides/'+s.id, { title, caption, image_url, sort_order });
      }
      renderAdmin($('#mainContent'));
    });
  }
}

async function renderGalleryTab(body) {
  const photos = await apiGet('/api/gallery').catch(()=>[]);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Photos shown in the homepage gallery strip. Add candid lab shots, conferences, and milestones.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newPic">+ Add photo</button></div>
    <div class="p-grid-3">
      ${photos.length ? photos.map(g => `
        <div class="p-card" style="padding:0; overflow:hidden;">
          <img src="${escHtml(g.image_url)}" alt="" style="width:100%; height:170px; object-fit:cover; display:block; background:var(--bg-1);">
          <div style="padding:10px 12px;">
            <div style="font-size:12px;color:var(--fg-2);">${escHtml(g.caption||'(no caption)')}</div>
            <div class="row-actions" style="margin-top:8px;"><button class="danger" data-del="${g.id}">Delete</button></div>
          </div>
        </div>`).join('') : '<div class="empty">No gallery photos yet.</div>'}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if(!confirm('Delete this photo?')) return;
    await apiDel('/api/gallery/'+b.dataset.del); renderAdmin($('#mainContent'));
  });
  $('#newPic').onclick = () => {
    modal('Add gallery photo','',`
      <label>Image file (required)</label><input type="file" id="m_f" accept="image/*">
      <label>Caption</label><input id="m_c" value="">
      <label>Sort order</label><input id="m_s" type="number" value="0">
    `, async (mb) => {
      const f = $('#m_f', mb);
      if (!f.files[0]) throw new Error('Please pick an image file');
      await uploadGallery(f.files[0], $('#m_c', mb).value, +$('#m_s', mb).value);
      renderAdmin($('#mainContent'));
    });
  };
}

async function renderSponsorsTab(body) {
  const sponsors = await apiGet('/api/sponsors').catch(()=>[]);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Sponsors and collaborators. Logo and name appear on the homepage marquee. URL links the logo. Mark "show in footer" to also display in the footer.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newSp">+ Add sponsor / collaborator</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Name</div><div style="flex:2">Logo</div><div style="flex:2">Website</div><div style="flex-basis:80px;text-align:center">Footer</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${sponsors.map(sp => `<div class="p-inv-row">
        <div style="flex:2"><div class="p-inv-name">${escHtml(sp.name)}</div></div>
        <div style="flex:2">${sp.logo_url ? `<img src="${escHtml(sp.logo_url)}" alt="" style="max-height:34px; max-width:140px;">` : '<span style="color:var(--fg-4); font-size:12px;">no logo</span>'}</div>
        <div style="flex:2; font-size:12px; color:var(--fg-3); word-break:break-all;">${escHtml(sp.website_url||'')}</div>
        <div style="flex-basis:80px; text-align:center; font-size:12px; color:${sp.show_in_footer?'var(--status-ok)':'var(--fg-4)'};">${sp.show_in_footer?'Yes':'-'}</div>
        <div style="flex-basis:100px; text-align:right" class="row-actions"><button data-edit="${sp.id}">Edit</button><button class="danger" data-del="${sp.id}">x</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if(!confirm('Remove this sponsor?')) return;
    await apiDel('/api/sponsors/'+b.dataset.del); renderAdmin($('#mainContent'));
  });
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openSp(sponsors.find(s=>s.id==b.dataset.edit)));
  $('#newSp').onclick = () => openSp(null);
  function openSp(sp) {
    const isNew = !sp; sp = sp || {name:'', logo_url:'', website_url:'', sort_order:0, show_in_footer:0};
    modal(isNew?'Add sponsor':'Edit sponsor','',`
      <label>Name</label><input id="m_n" value="${escHtml(sp.name||'')}">
      <label>Website URL</label><input id="m_w" value="${escHtml(sp.website_url||'')}">
      <label>Logo (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${sp.logo_url ? `<img src="${escHtml(sp.logo_url)}" alt="" style="max-height:40px; max-width:120px;">` : ''}
        <input type="file" id="m_lf" accept="image/*">
      </div>
      <label>Logo URL (or use upload above)</label><input id="m_l" value="${escHtml(sp.logo_url||'')}">
      <label>Sort order</label><input id="m_s" type="number" value="${sp.sort_order||0}">
      <label><input type="checkbox" id="m_sf" ${sp.show_in_footer?'checked':''}> Show in footer</label>
    `, async (mb) => {
      const lf = $('#m_lf', mb);
      if (lf && lf.files && lf.files[0]) {
        const url = await uploadPhoto(lf.files[0]);
        $('#m_l', mb).value = url;
      }
      const body = { name:$('#m_n',mb).value, logo_url:$('#m_l',mb).value, website_url:$('#m_w',mb).value, sort_order:+$('#m_s',mb).value, show_in_footer: $('#m_sf', mb).checked ? 1 : 0 };
      if(isNew) await apiPost('/api/sponsors', body); else await apiPut('/api/sponsors/'+sp.id, body);
      renderAdmin($('#mainContent'));
    });
  }
}

async function renderAppsTab(body) {
  const apps = await apiGet('/api/apps/all').catch(()=>[]);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Publish either a linked app URL, inline HTML, or both. Inline HTML entries launch directly on the public Apps page, and you can also paste or import a full HTML file.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newApp">+ Add app</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">App</div><div style="flex:1">Slug</div><div style="flex:2">Summary</div><div style="flex-basis:110px;text-align:center">Mode</div><div style="flex-basis:80px;text-align:center">Live</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${apps.map(a => `<div class="p-inv-row">
        <div style="flex:2">
          <div class="p-inv-name">${escHtml(a.title)}</div>
          <div style="font-size:11px;color:var(--fg-4)">${a.url ? `<a href="${escHtml(a.url)}" target="_blank" style="color:var(--fg-4); text-decoration:underline;">${escHtml(a.url)}</a>` : '(no linked URL)'}</div>
          ${a.embed_html ? '<div class="p-inline-meta"><span>Inline HTML ready</span></div>' : ''}
        </div>
        <div style="flex:1"><code class="p-mono">${escHtml(a.slug)}</code></div>
        <div style="flex:2; font-size:12px; color:var(--fg-2);">${escHtml(a.summary||'')}</div>
        <div style="flex-basis:110px; text-align:center; font-size:11px; color:var(--fg-3);">${a.url && a.embed_html ? 'Link + inline' : a.embed_html ? 'Inline HTML' : a.url ? 'Linked URL' : 'Draft shell'}</div>
        <div style="flex-basis:80px; text-align:center; font-size:12px; color:${a.published?'var(--status-ok)':'var(--fg-4)'};">${a.published?'Yes':'Draft'}</div>
        <div style="flex-basis:100px; text-align:right" class="row-actions"><button data-edit="${a.id}">Edit</button><button class="danger" data-del="${a.id}">x</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if(!confirm('Remove this app?')) return;
    await apiDel('/api/apps/'+b.dataset.del); renderAdmin($('#mainContent'));
  });
  body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openApp(apps.find(a=>a.id==b.dataset.edit)));
  $('#newApp').onclick = () => openApp(null);
  function openApp(a) {
    const isNew = !a; a = a || {slug:'', title:'', summary:'', description:'', url:'', embed_html:'', thumbnail:'', sort_order:0, published:1};
    const bg = modal(isNew?'Add app':'Edit app','',`
      <label>Title</label><input id="m_t" value="${escHtml(a.title||'')}">
      <label>Slug (URL-safe id)</label><input id="m_sl" value="${escHtml(a.slug||'')}">
      <label>Summary (one line)</label><input id="m_su" value="${escHtml(a.summary||'')}">
      <label>Description</label><textarea id="m_d">${escHtml(a.description||'')}</textarea>
      <label>App URL (optional)</label><input id="m_u" value="${escHtml(a.url||'')}" placeholder="https://... or /apps/your-app">
      <label>Inline HTML (optional)</label><textarea id="m_html" style="min-height:180px;" placeholder="<div>...</div><script>...<\/script>">${escHtml(a.embed_html||'')}</textarea>
      <label>Import HTML file (optional)</label><input id="m_html_file" type="file" accept=".html,text/html">
      <div class="p-soft-note">Choose a standalone HTML file and its contents will be loaded into the inline HTML field.</div>
      <label>Thumbnail image URL (optional)</label><input id="m_thumb" value="${escHtml(a.thumbnail||'')}" placeholder="https://...">
      <label>Sort order</label><input id="m_so" type="number" value="${a.sort_order||0}">
      <label><input type="checkbox" id="m_pub" ${a.published?'checked':''}> Published (visible on public site)</label>
    `, async (mb) => {
      const body = {
        slug: $('#m_sl',mb).value.trim(),
        title: $('#m_t',mb).value,
        summary: $('#m_su',mb).value,
        description: $('#m_d',mb).value,
        url: $('#m_u',mb).value,
        embed_html: $('#m_html',mb).value,
        thumbnail: $('#m_thumb',mb).value,
        sort_order: +$('#m_so',mb).value,
        published: $('#m_pub', mb).checked ? 1 : 0
      };
      if(!body.slug || !body.title) throw new Error('Slug and title required');
      if(!body.url && !body.embed_html) throw new Error('Add either a URL or inline HTML');
      if(isNew) await apiPost('/api/apps', body); else await apiPut('/api/apps/'+a.id, body);
      renderAdmin($('#mainContent'));
    });
    bg.querySelector('.modal').classList.add('is-wide');
    const htmlFileInput = $('#m_html_file', bg);
    if(htmlFileInput){
      htmlFileInput.addEventListener('change', () => {
        const file = htmlFileInput.files && htmlFileInput.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = () => { $('#m_html', bg).value = String(reader.result || ''); };
        reader.readAsText(file);
      });
    }
  }
}

async function renderDownloadsTab(body) {
  const rows = await apiGet('/api/downloads/all').catch(()=>[]);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Publish downloadable PDFs, Office files, text files, media, and other resources up to 25 MB each.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newDownload">+ Add download</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Title</div><div style="flex:1">Category</div><div style="flex:1">File</div><div style="flex-basis:80px;text-align:center">Live</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${rows.map(item => `<div class="p-inv-row">
        <div style="flex:2">
          <div class="p-inv-name">${escHtml(item.title || '')}</div>
          <div style="font-size:11px;color:var(--fg-4)">${escHtml(item.description || '')}</div>
        </div>
        <div style="flex:1;font-size:12px;color:var(--fg-2)">${escHtml(item.category || 'General')}</div>
        <div style="flex:1">
          <div style="font-size:12px;color:var(--fg-2)">${escHtml(item.file_name || 'Uploaded file')}</div>
          <div style="font-size:11px;color:var(--fg-4)">${escHtml(item.mime_type || '')}${item.file_size ? ` · ${Math.max(1, Math.round(item.file_size / 1024))} KB` : ''}</div>
        </div>
        <div style="flex-basis:80px;text-align:center;font-size:12px;color:${item.published ? 'var(--status-ok)' : 'var(--fg-4)'};">${item.published ? 'Yes' : 'Draft'}</div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit-download="${item.id}">Edit</button><button class="danger" data-del-download="${item.id}">x</button></div>
      </div>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-del-download]').forEach(btn => btn.onclick = async () => {
    if(!confirm('Remove this download?')) return;
    await apiDel('/api/downloads/' + btn.dataset.delDownload);
    renderAdmin($('#mainContent'));
  });
  body.querySelectorAll('[data-edit-download]').forEach(btn => btn.onclick = () => {
    const item = rows.find(row => row.id == btn.dataset.editDownload);
    if(item) openDownloadEditor(item);
  });
  $('#newDownload').onclick = () => openDownloadEditor(null);

  function openDownloadEditor(item) {
    const isNew = !item;
    item = item || { title:'', description:'', category:'', file_url:'', file_name:'', mime_type:'', file_size:0, sort_order:0, published:1 };
    const bg = modal(isNew ? 'Add download' : 'Edit download', '', `
      <label>Title</label><input id="d_title" value="${escHtml(item.title || '')}">
      <label>Description</label><textarea id="d_desc">${escHtml(item.description || '')}</textarea>
      <label>Category</label><input id="d_cat" value="${escHtml(item.category || '')}" placeholder="PDF, Form, Video, Data, Office file...">
      <label>Upload file (optional if keeping current file)</label><input id="d_file" type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx,.mp4,.mov,.zip,.html,.json,.png,.jpg,.jpeg,.gif,.webp">
      <label>File URL</label><input id="d_url" value="${escHtml(item.file_url || '')}" placeholder="/uploads/your-file.pdf">
      <label>Visible file name</label><input id="d_name" value="${escHtml(item.file_name || '')}" placeholder="Original file name">
      <label>Sort order</label><input id="d_sort" type="number" value="${item.sort_order || 0}">
      <label><input type="checkbox" id="d_pub" ${item.published ? 'checked' : ''}> Published (visible on public site)</label>
    `, async (mb) => {
      let fileUrl = $('#d_url', mb).value.trim();
      let fileName = $('#d_name', mb).value.trim();
      let mimeType = item.mime_type || '';
      let fileSize = Number(item.file_size || 0);
      const file = $('#d_file', mb).files && $('#d_file', mb).files[0];
      if(file){
        const uploaded = await uploadDoc(file);
        fileUrl = uploaded.url;
        fileName = uploaded.name || fileName;
        mimeType = uploaded.mime_type || mimeType;
        fileSize = Number(uploaded.file_size || fileSize || 0);
      }
      const payload = {
        title: $('#d_title', mb).value.trim(),
        description: $('#d_desc', mb).value.trim(),
        category: $('#d_cat', mb).value.trim(),
        file_url: fileUrl,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
        sort_order: Number($('#d_sort', mb).value || 0),
        published: $('#d_pub', mb).checked ? 1 : 0
      };
      if(!payload.title || !payload.file_url) throw new Error('Title and file are required');
      if(isNew) await apiPost('/api/downloads', payload);
      else await apiPut('/api/downloads/' + item.id, payload);
      renderAdmin($('#mainContent'));
    });
    bg.querySelector('.modal').classList.add('is-wide');
  }
}

async function renderSettingsTab(body) {
  let s = Object.assign({}, LAB_NAMES);
  try { const fresh = await apiGet('/api/settings'); Object.assign(s, fresh); Object.assign(LAB_NAMES, fresh); } catch(_){}

  const fieldRow = (id, label, val, placeholder='') =>
    `<div style="margin-bottom:12px;">
       <label style="font-size:12px;font-weight:700;color:var(--fg-3);display:block;margin-bottom:4px;">${escHtml(label)}</label>
       <input id="${id}" class="p-inv-input" value="${escHtml(val||'')}" placeholder="${escHtml(placeholder)}">
     </div>`;

  body.innerHTML = `
    <div class="p-grid-2">
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Site</div></div>
        ${[['globe','Public domain','latfs.villanova.edu'],['image','Homepage hero','from Hero tab'],['mail','Contact inbox','info@latfs.villanova.edu']].map(([icn,lbl,val])=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px dashed var(--border-1)">
            <i data-lucide="${icn}" style="width:16px;height:16px;color:var(--fg-4);flex-shrink:0"></i>
            <div style="flex:1;font-size:13px;color:var(--navy-900);font-weight:600">${lbl}</div>
            <div style="font-size:12px;color:var(--fg-3)">${val}</div>
          </div>`).join('')}
        <div class="p-theme-grid">
          <div>
            <label style="font-size:12px;font-weight:700;color:var(--fg-3);display:block;margin-bottom:4px;">Website theme</label>
            <select id="st_theme" class="p-inv-input">
              <option value="navy-gold"${(s.site_theme||'navy-gold')==='navy-gold'?' selected':''}>Navy + Gold</option>
              <option value="navy-copper"${(s.site_theme||'navy-gold')==='navy-copper'?' selected':''}>Navy + Copper</option>
            </select>
            <div class="p-soft-note">Navy + Copper keeps the navy base and swaps the accent color to a warmer editorial tone.</div>
          </div>
          <div>
            <button class="btn-primary-sm p-btn-tight" id="saveThemeBtn" type="button">Save theme</button>
            <div id="themeSaveMsg" style="font-size:12px;color:var(--status-ok);margin-top:8px;display:none;">Saved!</div>
          </div>
        </div>
      </div>
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Account</div></div>
        <div style="padding:10px 0;border-bottom:1px dashed var(--border-1);font-size:13px;color:var(--fg-2)">Signed in as <strong>${escHtml(SESSION_USER.name)}</strong></div>
        <button class="btn-ghost-sm" id="logoutSet" style="margin-top:12px">Sign out</button>
      </div>
    </div>

    <div class="p-card" style="margin-top:24px;">
      <div class="p-card-head"><div class="p-card-title">Lab spaces</div></div>
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:16px;">These names flow into the lab platform and shared operational labels.</p>
      <div class="p-grid-2" style="gap:16px;">
        <div>
          ${fieldRow('st_la_name','Lab A — short name', s.lab_a_name, 'Lab A')}
          ${fieldRow('st_la_room','Lab A — room / building', s.lab_a_room, 'Tolentine 344')}
        </div>
        <div>
          ${fieldRow('st_lb_name','Lab B — short name', s.lab_b_name, 'Lab B')}
          ${fieldRow('st_lb_room','Lab B — room / building', s.lab_b_room, 'Mendel 270')}
        </div>
      </div>
      <button class="btn-primary-sm" id="saveLabNames" style="margin-top:4px;">Save lab names</button>
      <span id="labSaveMsg" style="font-size:12px;color:var(--status-ok);margin-left:10px;display:none;">Saved!</span>
    </div>

    <div class="p-card" style="margin-top:24px;">
      <div class="p-card-head"><div class="p-card-title">Public page headers</div></div>
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:16px;">Titles and intro paragraphs shown on the public website pages.</p>
      <div class="p-grid-2" style="gap:16px;">
        <div>
          ${fieldRow('st_res_sec','Research section title (home)', s.research_section_title, 'Research Areas')}
          ${fieldRow('st_res_ey','Research section eyebrow (home)', s.research_eyebrow, 'Six pillars · updated quarterly')}
          ${fieldRow('st_metric_res','Hero metric label · research', s.hero_metric_research_label, 'Research areas')}
          ${fieldRow('st_metric_pub','Hero metric label · publications', s.hero_metric_publications_label, 'Publications')}
          ${fieldRow('st_res_pt','Research page title', s.research_page_title, 'Six pillars of inquiry')}
          ${fieldRow('st_res_pi','Research page intro', s.research_page_intro, 'LATFS investigates…')}
        </div>
        <div>
          ${fieldRow('st_metric_people','Hero metric label · people', s.hero_metric_people_label, 'Active members')}
          ${fieldRow('st_metric_fac','Hero metric label · facilities', s.hero_metric_facilities_label, 'Facilities')}
          ${fieldRow('st_ppl_pt','People page title', s.people_page_title, 'Lab members')}
          ${fieldRow('st_ppl_pi','People page intro', s.people_page_intro, 'A small, hands-on lab…')}
          ${fieldRow('st_fac_pt','Facilities page title', s.facilities_page_title, 'Lab facilities & instruments')}
          ${fieldRow('st_fac_pi','Facilities page intro', s.facilities_page_intro, 'Click any facility…')}
          ${fieldRow('st_dl_pt','Downloads page title', s.downloads_page_title, 'Downloads')}
          ${fieldRow('st_dl_pi','Downloads page intro', s.downloads_page_intro, 'Access published PDFs…')}
        </div>
      </div>
      <button class="btn-primary-sm" id="savePageHeaders" style="margin-top:4px;">Save page headers</button>
      <span id="pageHdrMsg" style="font-size:12px;color:var(--status-ok);margin-left:10px;display:none;">Saved!</span>
    </div>

    <div class="p-card" style="margin-top:24px;">
      <div class="p-card-head"><div class="p-card-title">Platform section descriptions</div></div>
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:16px;">Subtitle text shown under each section heading in the platform (/platform) for all users.</p>
      <div class="p-grid-2" style="gap:16px;">
        <div>
          ${fieldRow('st_pl_dash','Dashboard subtitle', s.platform_dashboard_sub, "Here is today's snapshot.")}
          ${fieldRow('st_pl_sched','Schedule subtitle', s.platform_schedule_sub, 'Calendar of meetings, sessions and reservations.')}
          ${fieldRow('st_pl_tasks','Tasks subtitle', s.platform_tasks_sub, 'Drag-style kanban (open / in progress / blocked / done).')}
          ${fieldRow('st_pl_meet','Meetings subtitle', s.platform_meetings_sub, 'Group meetings, seminars and announcements from the PI.')}
        </div>
        <div>
          ${fieldRow('st_pl_equip','Equipment subtitle', s.platform_equipment_sub, 'Check items out and check them back in. Last-user is tracked.')}
          ${fieldRow('st_pl_iss','Issues subtitle', s.platform_issues_sub, 'Report broken equipment, request supplies, flag facility issues.')}
          ${fieldRow('st_pl_inv','Inventory subtitle', s.platform_inventory_sub, 'Track consumables, chemicals, reagents and supplies.')}
          ${fieldRow('st_pl_prof','Profile subtitle', s.platform_profile_sub, 'Your details, assigned tasks and equipment.')}
          ${fieldRow('st_pl_mem','Members subtitle', s.platform_members_sub, 'Manage accounts. Only admins / professors can edit.')}
        </div>
      </div>
      <button class="btn-primary-sm" id="savePlatformSubs" style="margin-top:4px;">Save platform descriptions</button>
      <span id="platSubMsg" style="font-size:12px;color:var(--status-ok);margin-left:10px;display:none;">Saved!</span>
    </div>
  `;

  const showSaved = (id) => { const el = $('#'+id); if(el){ el.style.display=''; setTimeout(()=>{ el.style.display='none'; }, 2500); } };

  $('#logoutSet').onclick = doLogout;
  $('#saveThemeBtn').onclick = async () => {
    const upd = { site_theme: $('#st_theme').value };
    try { await apiPut('/api/settings', upd); showSaved('themeSaveMsg'); }
    catch(e) { alert(e.message); }
  };

  $('#saveLabNames').onclick = async () => {
    const upd = {
      lab_a_name: $('#st_la_name').value.trim() || 'Lab A',
      lab_a_room: $('#st_la_room').value.trim(),
      lab_b_name: $('#st_lb_name').value.trim() || 'Lab B',
      lab_b_room: $('#st_lb_room').value.trim(),
    };
    try { await apiPut('/api/settings', upd); Object.assign(LAB_NAMES, upd); showSaved('labSaveMsg'); }
    catch(e) { alert(e.message); }
  };

  $('#savePageHeaders').onclick = async () => {
    const upd = {
      research_section_title: $('#st_res_sec').value.trim(),
      research_eyebrow:       $('#st_res_ey').value.trim(),
      hero_metric_research_label: $('#st_metric_res').value.trim(),
      hero_metric_publications_label: $('#st_metric_pub').value.trim(),
      research_page_title:    $('#st_res_pt').value.trim(),
      research_page_intro:    $('#st_res_pi').value.trim(),
      hero_metric_people_label: $('#st_metric_people').value.trim(),
      hero_metric_facilities_label: $('#st_metric_fac').value.trim(),
      people_page_title:      $('#st_ppl_pt').value.trim(),
      people_page_intro:      $('#st_ppl_pi').value.trim(),
      facilities_page_title:  $('#st_fac_pt').value.trim(),
      facilities_page_intro:  $('#st_fac_pi').value.trim(),
      downloads_page_title:   $('#st_dl_pt').value.trim(),
      downloads_page_intro:   $('#st_dl_pi').value.trim(),
    };
    try { await apiPut('/api/settings', upd); Object.assign(LAB_NAMES, upd); showSaved('pageHdrMsg'); }
    catch(e) { alert(e.message); }
  };

  $('#savePlatformSubs').onclick = async () => {
    const upd = {
      platform_dashboard_sub: $('#st_pl_dash').value.trim(),
      platform_schedule_sub:  $('#st_pl_sched').value.trim(),
      platform_tasks_sub:     $('#st_pl_tasks').value.trim(),
      platform_meetings_sub:  $('#st_pl_meet').value.trim(),
      platform_equipment_sub: $('#st_pl_equip').value.trim(),
      platform_issues_sub:    $('#st_pl_iss').value.trim(),
      platform_inventory_sub: $('#st_pl_inv').value.trim(),
      platform_profile_sub:   $('#st_pl_prof').value.trim(),
      platform_members_sub:   $('#st_pl_mem').value.trim(),
    };
    try { await apiPut('/api/settings', upd); Object.assign(LAB_NAMES, upd); showSaved('platSubMsg'); }
    catch(e) { alert(e.message); }
  };

  if (window.lucide) window.lucide.createIcons();
}

async function renderOverview(root){
  const [people, news, pubs, gallery, downloads, apps] = await Promise.all([
    apiGet('/api/people').catch(()=>[]),
    apiGet('/api/news').catch(()=>[]),
    apiGet('/api/publications').catch(()=>[]),
    apiGet('/api/gallery').catch(()=>[]),
    apiGet('/api/downloads/all').catch(()=>[]),
    apiGet('/api/apps/all').catch(()=>[])
  ]);
  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <div class="eyebrow" style="color:var(--gold-700)">Website admin</div>
        <h1 class="p-h1">Content overview</h1>
        <p class="p-h1-sub">This panel manages the public LATFS website. For day-to-day lab use, use the Lab platform.</p>
      </div>
      <div class="p-actions">
        <a class="btn-ghost-sm p-btn-tight" href="/platform" style="text-decoration:none;">Open lab platform</a>
        <button class="btn-ghost-sm p-btn-tight" id="ovLogout">Sign out</button>
      </div>
    </div>
    <div class="p-overview-grid">
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Quick edits</div></div>
        <div class="p-action-tiles">
          <button class="p-action-tile" type="button" data-ov-tab="hero">
            <div class="p-action-tile-kicker">Homepage</div>
            <div class="p-action-tile-title">Hero and front page</div>
            <div class="p-action-tile-copy">Jump straight to the homepage hero, research labels, and public-first content.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="publications">
            <div class="p-action-tile-kicker">Archive</div>
            <div class="p-action-tile-title">Publications</div>
            <div class="p-action-tile-copy">Edit the publication table, PDF links, DOI links, and year ordering from one place.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="downloads">
            <div class="p-action-tile-kicker">Library</div>
            <div class="p-action-tile-title">Downloads</div>
            <div class="p-action-tile-copy">Manage PDFs, documents, media, and any public file you want visitors to download.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="gallery">
            <div class="p-action-tile-kicker">Media</div>
            <div class="p-action-tile-title">Gallery</div>
            <div class="p-action-tile-copy">Keep the homepage carousel and gallery page synced to the latest uploaded lab images.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="apps">
            <div class="p-action-tile-kicker">Apps</div>
            <div class="p-action-tile-title">Apps and calculators</div>
            <div class="p-action-tile-copy">Add linked tools, paste inline HTML, or import a standalone HTML calculator file.</div>
          </button>
        </div>
      </div>
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Content status</div></div>
        <div class="p-link-stack">
          <div class="p-link-item"><strong>${people.length}</strong> people profiles are currently published on the public site.</div>
          <div class="p-link-item"><strong>${pubs.length}</strong> publications are live in the public archive table.</div>
          <div class="p-link-item"><strong>${gallery.length}</strong> gallery images, <strong>${downloads.length}</strong> downloads, and <strong>${apps.length}</strong> apps are ready to manage.</div>
          <div class="p-link-item"><strong>${news.length}</strong> public news items are available for homepage and news-page surfacing.</div>
        </div>
      </div>
    </div>
  `;
  $('#ovLogout').onclick = doLogout;
  root.querySelectorAll('[data-ov-tab]').forEach(btn => btn.onclick = () => { _adminTab = btn.dataset.ovTab; navigate('content'); });
}

const ROUTES = { overview: renderOverview, content: renderAdmin, schedule: renderSchedule, tasks: renderTasks, meetings: renderMeetings, inventory: renderInventory, projects: renderProjects };

async function doLogout() {
  await fetch('/admin/logout',{method:'POST',credentials:'same-origin', headers:{'x-csrf-token': CSRF||''}}).catch(()=>{});
  CSRF = '';
  _resetAdminLogin();
  $('#appShell').style.display = 'none';
  $('#loginScreen').style.display = 'flex';
}

async function boot() {
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    $('#lErr').textContent = '';
    try {
      let result;
      if (_adminLoginState.step === 1) {
        _adminLoginState.username  = $('#lUser').value;
        _adminLoginState.password  = $('#lPass').value;
        _adminLoginState.rememberMe = $('#adminRemember').checked;
        result = await doLogin(_adminLoginState.username, _adminLoginState.password, null, _adminLoginState.rememberMe);
      } else {
        result = await doLogin(_adminLoginState.username, _adminLoginState.password, $('#lTotp').value.trim(), _adminLoginState.rememberMe);
      }
      if (result && result.totp_required) {
        _adminLoginState.step = 2;
        $('#adminStep1').style.display = 'none';
        $('#adminStep2').style.display = '';
        $('#adminSubmitBtn').textContent = 'Verify';
        $('#lTotp').focus();
        return;
      }
      $('#loginScreen').style.display = 'none';
      $('#appShell').style.display = 'flex';
      $('#userInitials').textContent = SESSION_USER.initials;
      $('#userName').textContent = SESSION_USER.name;
      $('#userRole').textContent = SESSION_USER.role;
      renderNav();
      navigate('overview');
    } catch(err) { $('#lErr').textContent = err.message; }
  };
  $('#adminBackBtn').onclick = () => { $('#lErr').textContent = ''; _resetAdminLogin(); };
  $('#logoutBtn').onclick = doLogout;
  const ok = await checkAuth();
  if (ok) {
    // Load lab names from settings before rendering
    try { const s = await apiGet('/api/settings'); Object.assign(LAB_NAMES, s); } catch(_){}
    $('#loginScreen').style.display = 'none';
    $('#appShell').style.display = 'flex';
    $('#userInitials').textContent = SESSION_USER.initials;
    $('#userName').textContent = SESSION_USER.name;
    $('#userRole').textContent = SESSION_USER.role;
    renderNav();
    navigate('overview');
  }
  if (window.lucide) window.lucide.createIcons();
}

boot();
