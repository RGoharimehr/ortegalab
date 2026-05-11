/* ============================================================
   LATFS Platform — vanilla JS app
   ============================================================ */
let ME = null;
let CSRF = null;

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function escapeHTML(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(d){ if(!d) return ''; const x = new Date(d); if(isNaN(x)) return d; return x.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
function fmtDT(d){ if(!d) return ''; const x = new Date(d); if(isNaN(x)) return d; return x.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }
function initials(name){ if(!name) return '??'; return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(); }
function setAvatarContent(el, user){
  if(!el) return;
  const name = user?.name || user?.username || 'User';
  if(user?.photo_url){
    const img = document.createElement('img');
    img.src = user.photo_url;
    img.alt = name;
    img.className = 'p-avatar-img';
    if(user.photo_position) img.style.objectPosition = user.photo_position;
    el.replaceChildren(img);
    el.style.background = 'rgba(212,169,66,.14)';
    return;
  }
  el.replaceChildren(document.createTextNode(initials(name)));
  el.style.background = 'var(--gold-600)';
}
function formatUsTimeZones(now = new Date()){
  const zones = [
    ['ET', 'America/New_York'],
    ['CT', 'America/Chicago'],
    ['MT', 'America/Denver'],
    ['PT', 'America/Los_Angeles'],
    ['AK', 'America/Anchorage'],
    ['HI', 'Pacific/Honolulu']
  ];
  return zones.map(([label, zone]) => {
    const value = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone }).format(now);
    return `${label} ${value}`;
  }).join(' · ');
}
function formatDashboardCoastTimes(now = new Date()){
  const east = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }).format(now);
  const west = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' }).format(now);
  return `East Coast ${east} ET | West Coast ${west} PT`;
}
async function downloadFile(url, filename){
  const resp = await fetch(url, { credentials:'same-origin' });
  if(!resp.ok) throw new Error('Download failed');
  const blob = await resp.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

async function api(path, opts={}){
  const o = Object.assign({ credentials:'same-origin', headers:{} }, opts);
  if(o.body && typeof o.body !== 'string') { o.body = JSON.stringify(o.body); o.headers['Content-Type']='application/json'; }
  if(['POST','PUT','PATCH','DELETE'].includes((o.method||'GET').toUpperCase()) && CSRF) o.headers['x-csrf-token'] = CSRF;
  const r = await fetch(path, o);
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await r.json() : await r.text();
  if(!r.ok) throw new Error((data && data.error) || ('HTTP '+r.status));
  return data;
}

/** Unwrap paginated list responses { total, rows } → plain array.
 *  Falls back gracefully for endpoints that still return an array directly. */
function unwrap(res){ return Array.isArray(res) ? res : (res && res.rows ? res.rows : []); }
function summaryOf(res){ return (res && typeof res === 'object' && res.summary) ? res.summary : {}; }
function n0(v){ return Number(v || 0); }
function buildQS(values){
  const qs = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => {
    if(value === undefined || value === null || value === '' || value === false) return;
    qs.set(key, value === true ? '1' : String(value));
  });
  return qs.toString();
}
function statCard(value, label, cls=''){
  return `<div class="p-stat-card ${cls}"><div class="p-stat-num">${escapeHTML(value)}</div><div class="p-stat-lbl">${escapeHTML(label)}</div></div>`;
}

function platformEntryUrl(){
  return 'http://127.0.0.1:3000/platform';
}

function showFileModeNotice(){
  const mount = $('#loginScreen');
  mount.innerHTML = `
    <div class="login-card" style="width:min(460px,92vw);">
      <h1 class="display-serif">Open the served platform</h1>
      <p>This page cannot run correctly from a local <code>file://</code> path because the platform needs the backend API and login session.</p>
      <p style="margin-bottom:18px;">Use the live local URL below when you want to review or annotate the platform UI.</p>
      <div style="padding:12px 14px;background:var(--bg-2);border:1px solid var(--border-1);border-radius:12px;font-family:var(--font-mono);font-size:12px;color:var(--fg-2);word-break:break-all;">${platformEntryUrl()}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
        <a href="${platformEntryUrl()}" style="display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:10px;background:var(--gold-600);color:#fff;font-weight:700;text-decoration:none;">Open platform</a>
        <button type="button" class="p-bigbtn ghost" id="copyPlatformUrlBtn">Copy URL</button>
      </div>
    </div>`;
  const copyBtn = $('#copyPlatformUrlBtn');
  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(platformEntryUrl());
        copyBtn.textContent = 'Copied';
      } catch(_){
        copyBtn.textContent = platformEntryUrl();
      }
    });
  }
}

function isLabStaffRole(role){
  return role === 'admin' || role === 'professor';
}

function isSiteModeratorRole(role){
  return isLabStaffRole(role) || role === 'moderator';
}

function canApproveReservationsRole(role){
  return role === 'professor';
}

function trainingTagMarkup(row){
  if(!n0(row?.requires_training)) return '';
  if(row.training_state === 'active') {
    return `<span class="p-tag-sm p-tag-ok">${row.user_training_expires_at ? `clear until ${fmtDate(row.user_training_expires_at)}` : 'training clear'}</span>`;
  }
  if(row.training_state === 'expired') {
    return `<span class="p-tag-sm p-tag-warn">${row.user_training_expires_at ? `expired ${fmtDate(row.user_training_expires_at)}` : 'training expired'}</span>`;
  }
  return `<span class="p-tag-sm p-tag-alert">${escapeHTML(row.training_requirement || 'training required')}</span>`;
}

function canOperateEquipment(row){
  return !n0(row?.requires_training) || n0(row?.user_active_training_count) > 0 || isLabStaffRole(ME?.role);
}

function renderInventoryActionQueue(data){
  const mount = $('#invActionQueue');
  const meta = $('#invQueueMeta');
  if(!mount) return;
  if(data && data.error){
    mount.innerHTML = `<div class="empty">${escapeHTML(data.error)}</div>`;
    if(meta) meta.textContent = 'Could not load the replenishment queue.';
    return;
  }
  const rows = unwrap(data).slice(0, 8);
  const summary = summaryOf(data);
  if(meta){
    meta.textContent = rows.length
      ? `${n0(summary.critical)} critical, ${n0(summary.with_links)} with direct reorder links, ${n0(summary.expiring_soon)} expiring soon.`
      : 'Nothing currently needs a restock or expiry review.';
  }
  if(!rows.length){
    mount.innerHTML = '<div class="empty">Nothing currently needs a restock or expiry review.</div>';
    return;
  }
  mount.innerHTML = `<div class="p-action-grid">${rows.map(item => {
    const stateClass = item.action_state === 'expired' || item.action_state === 'out_of_stock' ? 'critical' : '';
    const qtyLine = `${n0(item.qty)} ${escapeHTML(item.unit || 'each')} on hand • min ${n0(item.min_qty)} ${escapeHTML(item.unit || 'each')}`;
    const suggestion = n0(item.suggested_reorder_qty) > 0 ? `Suggested receipt ${n0(item.suggested_reorder_qty)} ${escapeHTML(item.unit || 'each')}` : 'Expiry review needed';
    const stateLabel = String(item.action_state || 'review').replace(/_/g, ' ');
    return `<div class="p-action-card ${stateClass}">
      <div class="p-action-top">
        <div>
          <div class="p-action-title">${escapeHTML(item.name)}</div>
          <div class="p-action-meta">${escapeHTML(item.sku || 'No SKU')} • ${escapeHTML(item.lab || 'Lab')} ${item.location ? `• ${escapeHTML(item.location)}` : ''}</div>
        </div>
        <span class="p-tag-sm ${item.action_state === 'expired' || item.action_state === 'out_of_stock' ? 'p-tag-alert' : item.action_state === 'low_stock' ? 'p-tag-warn' : 'p-tag-info'}">${escapeHTML(stateLabel)}</span>
      </div>
      <div class="p-chip-row">
        <span class="p-chip ${item.stock_state === 'out' ? 'alert' : item.stock_state === 'low' ? 'warn' : 'info'}">${escapeHTML(String(item.stock_state || 'review').replace(/_/g, ' '))}</span>
        ${item.supplier_name ? `<span class="p-chip">${escapeHTML(item.supplier_name)}</span>` : ''}
        ${item.expiry_date ? `<span class="p-chip ${item.days_until_expiry < 0 ? 'alert' : item.days_until_expiry <= 30 ? 'warn' : ''}">${item.days_until_expiry < 0 ? 'Expired' : `Exp ${fmtDate(item.expiry_date)}`}</span>` : ''}
      </div>
      <div class="p-action-copy">${escapeHTML(qtyLine)}</div>
      <div class="p-action-copy">${escapeHTML(suggestion)}</div>
      <div class="p-action-foot">
        <button class="btn-ghost-sm" data-queue-receive="${item.id}">Receive</button>
        <button class="btn-ghost-sm" data-queue-focus="${item.id}">Focus item</button>
        <button class="btn-ghost-sm" data-queue-request="${item.id}">Request</button>
        ${item.reorder_url ? `<a class="btn-ghost-sm" href="${escapeHTML(item.reorder_url)}" target="_blank">Order</a>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
  mount.querySelectorAll('[data-queue-receive]').forEach(btn => btn.addEventListener('click', async () => {
    const item = rows.find(row => String(row.id) === btn.dataset.queueReceive);
    try { await receiveInventoryStock(btn.dataset.queueReceive, item?.name || 'item'); }
    catch(err){ alert(err.message); }
  }));
  mount.querySelectorAll('[data-queue-focus]').forEach(btn => btn.addEventListener('click', () => {
    const item = rows.find(row => String(row.id) === btn.dataset.queueFocus);
    INV_QUERY = item?.sku || item?.name || '';
    $('#invSearch').value = INV_QUERY;
    loadInventory();
  }));
  mount.querySelectorAll('[data-queue-request]').forEach(btn => btn.addEventListener('click', () => {
    const item = rows.find(row => String(row.id) === btn.dataset.queueRequest);
    openIssueModal({ category:'supplies', inventory:item });
  }));
}

async function receiveInventoryStock(itemId, itemName){
  const amountRaw = prompt(`How many units of ${itemName} were received?`, '1');
  if(amountRaw == null) return;
  const delta = parseInt(amountRaw, 10);
  if(!Number.isFinite(delta) || delta <= 0) throw new Error('Enter a positive whole number');
  const reason = prompt('Optional receipt note:', 'received stock') || 'received stock';
  await api(`/api/inventory/${itemId}/adjust`, { method:'PATCH', body:{ delta, reason } });
  loadInventory();
}

/* ---------- Auth ---------- */
async function checkAuth(){
  try {
    const me = await api('/api/me');
    ME = me;
    CSRF = me.csrfToken;
    return true;
  } catch(e){
    return false;
  }
}

let _loginState = { step: 1, username: '', password: '', rememberMe: false };

function _resetLoginForm() {
  _loginState = { step: 1, username: '', password: '', rememberMe: false };
  $('#loginStep1').style.display = '';
  $('#loginStep2').style.display = 'none';
  $('#loginTotp').value = '';
  $('#loginSubmitBtn').textContent = 'Sign in';
  $('#loginUser').focus();
}

async function doLogin(ev){
  ev.preventDefault();
  $('#loginErr').textContent = '';
  try {
    let body;
    if (_loginState.step === 1) {
      _loginState.username  = $('#loginUser').value.trim();
      _loginState.password  = $('#loginPass').value;
      _loginState.rememberMe = $('#loginRemember').checked;
      if (!_loginState.username || !_loginState.password) {
        $('#loginErr').textContent = 'Username and password are required'; return;
      }
      body = { username: _loginState.username, password: _loginState.password, remember_me: _loginState.rememberMe };
    } else {
      body = { username: _loginState.username, password: _loginState.password,
               totp_code: $('#loginTotp').value.trim(), remember_me: _loginState.rememberMe };
    }
    const r = await fetch('/admin/login', {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const data = await r.json();
    // Server signals TOTP is required — switch to step 2
    if (data.totp_required) {
      _loginState.step = 2;
      $('#loginStep1').style.display = 'none';
      $('#loginStep2').style.display = '';
      $('#loginSubmitBtn').textContent = 'Verify';
      $('#loginTotp').focus();
      return;
    }
    if(!r.ok || !data.success){ $('#loginErr').textContent = data.error || 'Login failed'; return; }
    await checkAuth();
    showApp();
  } catch(e){ $('#loginErr').textContent = e.message; }
}

async function doLogout(){
  try { await fetch('/admin/logout',{method:'POST',credentials:'same-origin', headers:{'x-csrf-token':CSRF||''}}); } catch(e){}
  location.reload();
}

function showApp(){
  $('#loginScreen').style.display = 'none';
  $('#appShell').classList.remove('hidden');
  $('#userName').textContent = ME.name || ME.username;
  $('#userRole').textContent = (ME.role || 'member').toUpperCase();
  setAvatarContent($('#userAv'), ME);
  if(isLabStaffRole(ME.role)){
    $$('.staff-only').forEach(el => el.classList.remove('hidden'));
  }
  // Load editable section subtitles from settings
  api('/api/settings').then(s => {
    const apply = (id, key) => {
      const el = document.getElementById(id);
      if (el && s[key]) {
        el.textContent = s[key];
        el.dataset.baseText = s[key];
      }
    };
    apply('dashSub',      'platform_dashboard_sub');
    apply('schedSub',     'platform_schedule_sub');
    apply('tasksSub',     'platform_tasks_sub');
    apply('meetingsSub',  'platform_meetings_sub');
    apply('equipmentSub', 'platform_equipment_sub');
    apply('issuesSub',    'platform_issues_sub');
    apply('inventorySub', 'platform_inventory_sub');
    apply('profileSub',   'platform_profile_sub');
    apply('membersSub',   'platform_members_sub');
  }).catch(()=>{});
  goRoute('dashboard');
  loadDashboard();
}

/* ---------- Mobile sidebar (hamburger) ---------- */
function openSidebar(){
  $('#sidebar').classList.add('open');
  $('#sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar(){
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
$('#hamburgerBtn').addEventListener('click', openSidebar);
$('#sidebarOverlay').addEventListener('click', closeSidebar);
// Close sidebar when nav item is clicked on mobile
document.addEventListener('click', e => {
  if(e.target.closest('.p-nav-item') && window.innerWidth <= 768) closeSidebar();
});

/* ---------- Routing ---------- */
function goRoute(name){
  $$('.p-section').forEach(s => s.classList.toggle('active', s.dataset.section === name));
  $$('.p-nav-item').forEach(b => b.classList.toggle('active', b.dataset.route === name));
  if(name === 'dashboard')    loadDashboard();
  if(name === 'schedule')     loadSchedule();
  if(name === 'tasks')        loadTasks();
  if(name === 'meetings')     loadMeetings();
  if(name === 'equipment')    loadEquipment();
  if(name === 'inventory')    loadInventory();
  if(name === 'issues')       loadIssues();
  if(name === 'samples')      loadSamples();
  if(name === 'lab-notebook') loadNotebook();
  if(name === 'training')     loadTraining();
  if(name === 'profile')      loadProfile();
  if(name === 'people-admin') loadUsers();
}

document.addEventListener('click', e => {
  const t = e.target.closest('.p-nav-item');
  if(t && t.dataset.route){ e.preventDefault(); goRoute(t.dataset.route); }
});

function renderResourceDashboard(overview){
  const pulse = $('#resourcePulse');
  const alerts = $('#resourceAlerts');
  if(!pulse || !alerts) return;
  const equipmentDue = n0(overview?.equipment?.maintenance_due_soon) + n0(overview?.equipment?.maintenance_overdue) +
    n0(overview?.equipment?.calibration_due_soon) + n0(overview?.equipment?.calibration_overdue);
  const sampleApprovalLoad = isSiteModeratorRole(ME?.role) ? n0(overview?.samples?.pending_approval) : 0;
  const cards = [
    {
      title: 'Inventory',
      total: n0(overview?.inventory?.total),
      badge: n0(overview?.inventory?.out_of_stock) + n0(overview?.inventory?.low_stock) + n0(overview?.inventory?.expired),
      meta: `${n0(overview?.inventory?.low_stock)} low | ${n0(overview?.inventory?.out_of_stock)} out | ${n0(overview?.inventory?.expiring_soon)} expiring`,
      route: 'inventory'
    },
    {
      title: 'Equipment',
      total: n0(overview?.equipment?.total),
      badge: equipmentDue + n0(overview?.reservations?.pending),
      meta: `${n0(overview?.equipment?.in_use)} in use | ${equipmentDue} due soon | ${n0(overview?.reservations?.pending)} pending`,
      route: 'equipment'
    },
    {
      title: 'Samples',
      total: n0(overview?.samples?.total),
      badge: n0(overview?.samples?.expired) + n0(overview?.samples?.depleted) + sampleApprovalLoad,
      meta: `${n0(overview?.samples?.active)} active | ${n0(overview?.samples?.expired)} expired | ${sampleApprovalLoad ? `${sampleApprovalLoad} awaiting approval` : `${n0(overview?.samples?.expiring_soon)} expiring`}`,
      route: 'samples'
    },
    {
      title: 'Training',
      total: n0(overview?.training?.total),
      badge: n0(overview?.training?.expired) + n0(overview?.training?.expiring_soon),
      meta: `${n0(overview?.training?.covered_members)} members covered | ${n0(overview?.training?.expired)} expired | ${n0(overview?.training?.expiring_soon)} expiring`,
      route: 'training'
    }
  ];
  pulse.innerHTML = cards.map(card => `
    <div class="p-resource-card">
      <div class="p-resource-head">
        <div>
          <div class="p-resource-title">${escapeHTML(card.title)}</div>
          <div class="p-resource-meta">${escapeHTML(card.meta)}</div>
        </div>
        <span class="p-tag-sm ${card.badge > 0 ? 'p-tag-warn' : 'p-tag-ok'}">${card.badge > 0 ? `${card.badge} need review` : 'stable'}</span>
      </div>
      <div class="p-resource-num">${card.total}</div>
      <div style="margin-top:10px;">
        <button class="btn-ghost-sm" onclick="goRoute('${card.route}')">Open ${escapeHTML(card.title.toLowerCase())}</button>
      </div>
    </div>`).join('');

  const attention = [];
  (overview?.alerts?.inventory || []).slice(0, 2).forEach(item => {
    const parts = [];
    if(item.stock_state === 'out') parts.push('Out of stock');
    else if(item.stock_state === 'low') parts.push('Low stock');
    if(item.days_until_expiry < 0) parts.push(`Expired ${Math.abs(item.days_until_expiry)}d`);
    else if(item.days_until_expiry <= 30) parts.push(`Expires in ${item.days_until_expiry}d`);
    attention.push({ bucket: 'Inventory', title: item.name, meta: parts.join(' | ') || item.sku || 'Needs review', route: 'inventory' });
  });
  (overview?.alerts?.equipment || []).slice(0, 2).forEach(item => {
    const parts = [];
    if(item.status) parts.push(String(item.status).replace('_', ' '));
    if(item.maintenance_state && item.maintenance_state !== 'ok') parts.push(`Maintenance ${item.maintenance_state}`);
    if(item.calibration_state && item.calibration_state !== 'ok') parts.push(`Calibration ${item.calibration_state}`);
    attention.push({ bucket: 'Equipment', title: item.name, meta: parts.join(' | ') || item.sku || 'Needs review', route: 'equipment' });
  });
  (overview?.alerts?.training || []).slice(0, 2).forEach(item => {
    const parts = [];
    if(item.days_until_expiry < 0) parts.push(`Expired ${Math.abs(item.days_until_expiry)}d`);
    else if(item.days_until_expiry <= 60) parts.push(`Expires in ${item.days_until_expiry}d`);
    if(item.user_name) parts.push(item.user_name);
    if(item.equipment_name) parts.push(item.equipment_name);
    attention.push({ bucket: 'Training', title: item.training_name, meta: parts.join(' | '), route: 'training' });
  });
  (overview?.alerts?.issues || []).slice(0, 2).forEach(item => {
    attention.push({ bucket: 'Issues', title: item.title, meta: `${item.category || 'issue'} | ${item.priority || 'normal'} priority`, route: 'issues' });
  });
  (overview?.alerts?.reservations || []).slice(0, 2).forEach(item => {
    attention.push({ bucket: 'Reservations', title: item.equipment_name, meta: `${item.status} | ${item.user_name} | ${fmtDT(item.start_at)}`, route: 'equipment' });
  });

  alerts.innerHTML = attention.length ? `<div class="p-alert-list">${attention.slice(0, 8).map(item => `
    <div class="p-alert-row">
      <div class="p-alert-kicker">${escapeHTML(item.bucket)}</div>
      <div style="flex:1;min-width:0;">
        <div class="p-alert-title">${escapeHTML(item.title)}</div>
        <div class="p-alert-meta">${escapeHTML(item.meta)}</div>
      </div>
      <button class="btn-ghost-sm" onclick="goRoute('${item.route}')">Open</button>
    </div>`).join('')}</div>` : '<div class="empty">No urgent resource alerts.</div>';
}

/* ---------- Dashboard ---------- */
async function loadDashboard(){
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#dashGreeting').textContent = `${greet}, ${(ME.name||ME.username).split(' ')[0]}`;
  const dashSub = $('#dashSub');
  const dashZones = $('#dashZones');
  if (dashSub) {
    const stamp = now.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
    const localTime = now.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'});
    const base = dashSub.dataset.baseText || "Here is today's snapshot.";
    const zones = document.createElement('span');
    zones.className = 'p-zone-line';
    zones.id = 'dashZones';
    zones.textContent = formatDashboardCoastTimes(now);
    dashSub.replaceChildren(document.createTextNode(`${stamp}, ${localTime} - ${base}`), zones);
  }
  // tasks
  try {
    const tasks = await api('/api/tasks/full?mine=1');
    const open = tasks.filter(t => t.status !== 'done');
    if ($('#stMyTasks')) $('#stMyTasks').textContent = open.length;
    $('#dashTasks').innerHTML = open.length ? open.slice(0,5).map(t => `
      <div class="p-task">
        <input class="p-check" type="checkbox" ${t.status==='done'?'checked':''} disabled>
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(t.title)}</div>
          <div class="p-task-due">${t.due_date ? 'Due '+fmtDate(t.due_date) : 'No due date'} · ${escapeHTML(t.status)}</div>
        </div>
      </div>`).join('') : '<div class="empty">No open tasks.</div>';
  } catch(e){ $('#dashTasks').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
  // meetings (events)
  try {
    const events = await api('/api/events');
    const now = new Date();
    const upcoming = events.filter(ev => new Date(ev.start_time) >= now).sort((a,b)=> new Date(a.start_time)-new Date(b.start_time));
    if ($('#stMyMeetings')) $('#stMyMeetings').textContent = upcoming.length;
    $('#dashMeetings').innerHTML = upcoming.length ? upcoming.slice(0,5).map(ev => `
      <div class="p-slot">
        <div class="p-slot-time">${new Date(ev.start_time).toLocaleString(undefined,{weekday:'short'})}</div>
        <div style="flex:1;">
          <div class="p-slot-title">${escapeHTML(ev.title)}</div>
          <div class="p-slot-room">${fmtDT(ev.start_time)} · ${escapeHTML(ev.location||'')}</div>
        </div>
      </div>`).join('') : '<div class="empty">No upcoming events.</div>';
  } catch(e){ $('#dashMeetings').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
  // equipment checked out to me
  try {
    const mine = unwrap(await api('/api/equipment?mine=1&limit=20'));
    if ($('#stMyEq')) $('#stMyEq').textContent = mine.length;
    $('#dashEquip').innerHTML = mine.length ? mine.map(x => `
      <div class="p-task">
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(x.name)}</div>
          <div class="p-task-due">SKU ${escapeHTML(x.sku||'—')} · since ${fmtDT(x.last_used_at)}</div>
        </div>
        <button class="btn-ghost-sm" data-checkin-id="${x.id}">Return</button>
      </div>`).join('') : '<div class="empty">Nothing checked out.</div>';
  } catch(e){ $('#dashEquip').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
  // issues
  try {
    const issues = unwrap(await api('/api/issues?status=open'));
    // Keep sidebar badge in sync
    const badge = $('#issuesBadge');
    if(badge) badge.textContent = issues.length || '';
    $('#dashIssues').innerHTML = issues.length ? issues.slice(0,5).map(it => `
      <div class="p-task">
        <div class="p-dot" style="background: ${it.priority==='high'?'var(--status-alert)':it.priority==='low'?'var(--status-info)':'var(--status-warn)'};"></div>
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(it.title)}</div>
          <div class="p-task-due">${escapeHTML(it.category)} · ${escapeHTML(it.reporter_name||'')}</div>
        </div>
      </div>`).join('') : '<div class="empty">No open issues.</div>';
  } catch(e){ $('#dashIssues').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
  try {
    renderResourceDashboard(await api('/api/resources/overview'));
  } catch(e){
    const pulse = $('#resourcePulse');
    const alerts = $('#resourceAlerts');
    if(pulse) pulse.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
    if(alerts) alerts.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  // PI panel — only for staff
  if(ME.role === 'admin' || ME.role === 'professor') loadPIDashboard();
}

/* ---------- PI / Director dashboard ---------- */
async function loadPIDashboard(){
  try {
    const d = await api('/api/dashboard/pi');
    $('#piStats').innerHTML = [
      { label:'Lab members', val: d.totalMembers, cls:'' },
      { label:'Open issues', val: d.openIssues, cls: d.openIssues > 0 ? 'warn' : '' },
      { label:'High-priority issues', val: d.highIssues, cls: d.highIssues > 0 ? 'alert' : '' },
      { label:'Equipment in use', val: d.equipmentInUse, cls:'' },
      { label:'Overdue tasks', val: d.overdueTasks, cls: d.overdueTasks > 0 ? 'warn' : '' },
    ].map(s => `<div class="pi-stat ${s.cls}"><div class="pi-stat-num">${s.val}</div><div class="pi-stat-lbl">${s.label}</div></div>`).join('');

    $('#piIssues').innerHTML = d.recentIssues.length ? d.recentIssues.map(it => `
      <div class="pi-row">
        <span class="pi-badge ${it.priority==='high'?'high':''}">${escapeHTML(it.priority)}</span>
        <span style="flex:1;">${escapeHTML(it.title)}</span>
        <span style="color:var(--fg-3);font-size:12px;">${escapeHTML(it.reporter_name||'')}</span>
      </div>`).join('') : '<div class="empty">No open issues.</div>';

    $('#piEquip').innerHTML = d.checkedOutEq.length ? d.checkedOutEq.map(e => `
      <div class="pi-row">
        <span style="flex:1;font-weight:600;">${escapeHTML(e.name)}</span>
        <span style="color:var(--fg-3);font-size:12px;">${escapeHTML(e.held_by||'—')}</span>
        <span style="color:var(--fg-4);font-size:11px;margin-left:6px;">${e.last_used_at?fmtDT(e.last_used_at):''}</span>
      </div>`).join('') : '<div class="empty">No equipment checked out.</div>';

    $('#piOverdue').innerHTML = d.overdueTasksList.length ? d.overdueTasksList.map(t => `
      <div class="pi-row">
        <span style="flex:1;">${escapeHTML(t.title)}</span>
        <span style="color:var(--status-alert);font-size:12px;font-weight:600;">${escapeHTML(t.due_date||'')}</span>
        <span style="color:var(--fg-3);font-size:12px;margin-left:6px;">${escapeHTML(t.assignee_name||'—')}</span>
      </div>`).join('') : '<div class="empty">No overdue tasks.</div>';

    $('#piEvents').innerHTML = d.upcomingEvents.length ? d.upcomingEvents.map(ev => `
      <div class="pi-row">
        <span style="flex:1;">${escapeHTML(ev.title)}</span>
        <span style="color:var(--fg-3);font-size:12px;">${fmtDT(ev.start_time)}</span>
      </div>`).join('') : '<div class="empty">No upcoming events.</div>';
  } catch(e){
    $('#piStats').innerHTML = `<div class="p-banner">Could not load director overview: ${escapeHTML(e.message)}</div>`;
  }
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-checkin-id]');
  if(!b) return;
  const id = b.dataset.checkinId;
  const note = prompt('Optional return note:') || '';
  try { await api(`/api/equipment/${id}/checkin`, {method:'POST', body:{note}}); loadDashboard(); loadEquipment(); }
  catch(err){ alert(err.message); }
});

/* ---------- Schedule ---------- */
let SCHED_SCOPE = 'mine';
async function loadSchedule(){
  try {
    const now = new Date();
    // Fetch events, meetings and tasks in parallel
    const [events, meetings, tasks] = await Promise.all([
      api('/api/events'),
      api('/api/meetings').catch(()=>[]),
      api('/api/tasks/full?all=1').catch(()=>[]),
    ]);

    // Normalise events
    const evItems = events
      .filter(ev => ev.start_time)
      .map(ev => ({
        _type: 'event',
        _id: ev.id,
        _owner: ev.owner_user_id,
        _attendees: ev.attendees || '',
        sortKey: ev.start_time,
        date: ev.start_time,
        title: ev.title,
        subtitle: `${fmtDT(ev.start_time)}${ev.end_time?' → '+fmtDT(ev.end_time):''}${ev.location?' · '+ev.location:''}`,
        badge: ev.event_type || 'event',
        badgeColor: 'var(--navy-700)',
        canEdit: (ev.owner_user_id===ME.id) || isLabStaffRole(ME.role),
      }));

    // Normalise meetings (from the meetings table)
    const meetItems = meetings
      .filter(m => m.scheduled_at)
      .map(m => ({
        _type: 'meeting',
        _id: m.id,
        _owner: null,
        _attendees: '',
        sortKey: m.scheduled_at,
        date: m.scheduled_at,
        title: m.title,
        subtitle: `${fmtDT(m.scheduled_at)}${m.location?' · '+m.location:''}`,
        badge: m.meeting_type || 'meeting',
        badgeColor: 'var(--gold-700)',
        canEdit: isLabStaffRole(ME.role),
      }));

    // Normalise task deadlines
    const deadlineItems = tasks
      .filter(t => t.due_date && t.status !== 'done')
      .map(t => ({
        _type: 'deadline',
        _id: t.id,
        _owner: t.assignee_user_id,
        _attendees: '',
        sortKey: t.due_date,
        date: t.due_date,
        title: t.title,
        subtitle: `Due ${fmtDate(t.due_date)}${t.assignee_name?' · '+t.assignee_name:''}`,
        badge: 'deadline',
        badgeColor: 'var(--status-alert)',
        canEdit: false,
      }));

    // Merge + filter by scope
    let all = [...evItems, ...meetItems, ...deadlineItems];
    if(SCHED_SCOPE === 'mine'){
      all = all.filter(item => {
        if(item._type === 'event') return item._owner === ME.id || item._attendees.includes(ME.username);
        if(item._type === 'deadline') return item._owner === ME.id;
        return true; // meetings always visible to all
      });
    }

    // Sort by date, upcoming only
    const upcoming = all
      .filter(item => new Date(item.date) >= now)
      .sort((a,b) => new Date(a.sortKey) - new Date(b.sortKey));

    if(!upcoming.length){ $('#schedList').innerHTML = '<div class="empty">No upcoming events.</div>'; return; }
    $('#schedList').innerHTML = upcoming.map(item => `
      <div class="p-slot">
        <div class="p-slot-time">${new Date(item.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</div>
        <div style="flex:1;">
          <div class="p-slot-title">${escapeHTML(item.title)}</div>
          <div class="p-slot-room">${escapeHTML(item.subtitle)}</div>
        </div>
        <div class="p-slot-tag" style="background:${item.badgeColor};">${escapeHTML(item.badge)}</div>
        ${item._type === 'event' && item.canEdit ? `<button class="btn-ghost-sm" data-event-edit="${item._id}">Edit</button>
        <button class="btn-ghost-sm" data-event-del="${item._id}">Delete</button>` : ''}
        ${item._type === 'meeting' && item.canEdit ? `<button class="btn-ghost-sm" data-meet-edit="${item._id}">Edit</button>` : ''}
      </div>`).join('');
  } catch(e){ $('#schedList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-event-edit]');
  const dl = e.target.closest('[data-event-del]');
  const med = e.target.closest('[data-meet-edit]');
  if(ed){
    try { const ev = (await api('/api/events')).find(x => x.id == ed.dataset.eventEdit); if(ev) openEventModal(ev); }
    catch(err){ alert(err.message); }
  }
  if(dl){
    if(!confirm('Delete this event?')) return;
    try { await api('/api/events/'+dl.dataset.eventDel, {method:'DELETE'}); loadSchedule(); loadDashboard(); }
    catch(err){ alert(err.message); }
  }
  if(med){
    try { const m = (await api('/api/meetings')).find(x => x.id == med.dataset.meetEdit); if(m) openMeetingModal(m); }
    catch(err){ alert(err.message); }
  }
});
$('#schedScope').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  $$('#schedScope button').forEach(x=>x.classList.toggle('active', x===b));
  SCHED_SCOPE = b.dataset.scope; loadSchedule();
});

$('#addEventBtn').addEventListener('click', () => openEventModal());
function openEventModal(ev){
  const isEdit = !!ev;
  modal(`<h2>${isEdit?'Edit':'New'} event</h2>
    <label>Title<input id="evTitle" value="${escapeHTML(ev?.title||'')}"></label>
    <label>Type<select id="evType"><option value="meeting">Meeting</option><option value="seminar">Seminar</option><option value="reservation">Reservation</option><option value="other">Other</option></select></label>
    <label>Start<input id="evStart" type="datetime-local" value="${ev?.start_time?ev.start_time.slice(0,16):''}"></label>
    <label>End<input id="evEnd" type="datetime-local" value="${ev?.end_time?ev.end_time.slice(0,16):''}"></label>
    <label>Location<input id="evLoc" value="${escapeHTML(ev?.location||'')}"></label>
    <label>Visibility<select id="evVis"><option value="public" ${ev?.visibility!=='private'?'selected':''}>Public</option><option value="private" ${ev?.visibility==='private'?'selected':''}>Private (just me)</option></select></label>`,
    async () => {
      const body = {
        title: $('#evTitle').value.trim(),
        event_type: $('#evType').value,
        start_time: $('#evStart').value,
        end_time: $('#evEnd').value,
        location: $('#evLoc').value,
        visibility: $('#evVis').value
      };
      if(!body.title || !body.start_time) throw new Error('Title and start required');
      if(isEdit) await api('/api/events/'+ev.id,{method:'PUT', body});
      else await api('/api/events',{method:'POST', body});
      loadSchedule(); loadDashboard();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delEv">Delete</button>` : '');
  if(isEdit){
    $('#delEv').addEventListener('click', async () => {
      if(!confirm('Delete this event?')) return;
      try { await api('/api/events/'+ev.id, {method:'DELETE'}); closeModal(); loadSchedule(); loadDashboard(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Tasks ---------- */
let TASK_SCOPE='mine';
async function loadTasks(){
  try {
    const tasks = await api('/api/tasks/full?'+(TASK_SCOPE==='mine'?'mine=1':'all=1'));
    const cols = [
      ['todo','To do'],
      ['in_progress','In progress'],
      ['blocked','Blocked'],
      ['done','Done']
    ];
    const root = $('#kanbanRoot');
    root.innerHTML = cols.map(([k,t])=>{
      const items = tasks.filter(x => (x.status||'todo')===k);
      return `<div class="p-col"><div class="p-col-head"><div class="p-col-title">${t}</div><div class="p-col-count">${items.length}</div></div>
        ${items.map(x => `
          <div class="p-task-card" data-task-id="${x.id}">
            <div class="p-task-card-title">${escapeHTML(x.title)}</div>
            <div class="p-task-card-foot">
              <span class="p-tag-sm ${prioClass(x.priority)}">${escapeHTML(x.priority||'normal')}</span>
              <div class="p-task-meta">
                <span class="p-task-due-sm">${x.due_date?fmtDate(x.due_date):''}</span>
                <span class="p-task-av" title="${escapeHTML(x.assignee_name||'')}">${initials(x.assignee_name||x.assignee||'')}</span>
              </div>
            </div>
          </div>`).join('')}
        <button class="p-col-add" data-add-status="${k}">+ Add task</button></div>`;
    }).join('');
  } catch(e){ $('#kanbanRoot').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
function prioClass(p){ if(p==='high') return 'p-tag-alert'; if(p==='low') return 'p-tag-info'; if(p==='normal') return 'p-tag-outline'; return 'p-tag-warn'; }

$('#taskScope').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  $$('#taskScope button').forEach(x=>x.classList.toggle('active', x===b));
  TASK_SCOPE = b.dataset.scope; loadTasks();
});
$('#addTaskBtn').addEventListener('click', () => openTaskModal());
document.addEventListener('click', async e => {
  const add = e.target.closest('[data-add-status]');
  if(add){ openTaskModal({status: add.dataset.addStatus}); return; }
  const card = e.target.closest('.p-task-card');
  if(card && card.dataset.taskId){
    try { const t = (await api('/api/tasks/full?all=1')).find(x=>x.id==card.dataset.taskId); if(t) openTaskModal(t); }
    catch(err){ alert(err.message); }
  }
});

async function openTaskModal(t){
  const isEdit = !!(t && t.id);
  const canAssign = ME.role === 'admin' || ME.role === 'professor';
  let users = [];
  if(canAssign) try { users = await api('/api/users'); } catch(e){ users = []; }
  modal(`<h2>${isEdit?'Edit task':'New task'}</h2>
    <label>Title<input id="tTitle" value="${escapeHTML(t?.title||'')}"></label>
    <label>Description<textarea id="tDesc">${escapeHTML(t?.description||'')}</textarea></label>
    <label>Priority<select id="tPri">
      ${['low','normal','high'].map(p=>`<option value="${p}" ${t?.priority===p?'selected':''}>${p}</option>`).join('')}
    </select></label>
    <label>Status<select id="tSt">
      ${['todo','in_progress','blocked','done'].map(p=>`<option value="${p}" ${(t?.status||'todo')===p?'selected':''}>${p.replace('_',' ')}</option>`).join('')}
    </select></label>
    <label>Due date<input id="tDue" type="date" value="${t?.due_date?t.due_date.slice(0,10):''}"></label>
    ${canAssign ? `<label>Assigned to<select id="tAss"><option value="">—</option>
      ${users.map(u=>`<option value="${u.id}" ${t?.assignee_user_id===u.id?'selected':''}>${escapeHTML(u.name||u.username)}</option>`).join('')}
    </select></label>` : ''}`,
    async () => {
      const body = {
        title: $('#tTitle').value.trim(),
        description: $('#tDesc').value,
        priority: $('#tPri').value,
        status: $('#tSt').value,
        due_date: $('#tDue').value || null,
        assignee_user_id: canAssign && $('#tAss') ? (Number($('#tAss').value) || null) : null
      };
      if(!body.title) throw new Error('Title required');
      if(isEdit) await api('/api/tasks/'+t.id,{method:'PUT', body});
      else await api('/api/tasks',{method:'POST', body});
      loadTasks(); loadDashboard();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delTask">Delete</button>` : ''
  );
  if(isEdit){
    $('#delTask').addEventListener('click', async () => {
      if(!confirm('Delete this task?')) return;
      try { await api('/api/tasks/'+t.id,{method:'DELETE'}); closeModal(); loadTasks(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Meetings ---------- */
async function loadMeetings(){
  try {
    const meetings = await api('/api/meetings');
    const now = new Date();
    const upcoming = meetings
      .filter(m => m.scheduled_at)
      .sort((a,b)=> new Date(a.scheduled_at)-new Date(b.scheduled_at))
      .concat(meetings.filter(m => !m.scheduled_at)
        .sort((a,b)=> new Date(a.created_at||0)-new Date(b.created_at||0)));
    if(!upcoming.length){ $('#meetList').innerHTML='<div class="empty">No meetings yet.</div>'; return; }
    const isStaff = isLabStaffRole(ME.role);
    $('#meetList').innerHTML = upcoming.map(m => {
      const d = new Date(m.scheduled_at||m.created_at);
      return `<div class="p-meet-card">
        <div class="p-meet-day">
          <div class="p-meet-day-lbl">${d.toLocaleString(undefined,{weekday:'short'}).toUpperCase()}</div>
          <div class="p-meet-day-time">${d.toLocaleString(undefined,{month:'short',day:'numeric'})}</div>
          <div class="p-meet-day-time">${d.toLocaleString(undefined,{hour:'numeric',minute:'2-digit'})}</div>
        </div>
        <div class="p-meet-body">
          <div class="p-meet-title">${escapeHTML(m.title)}</div>
          <div class="p-meet-room">${escapeHTML(m.location||'')}</div>
          <div style="font-size:13px;color:var(--fg-2); margin-top:6px;">${escapeHTML(m.description||m.notes||'')}</div>
        </div>
        <div class="p-meet-tag-col">
          <div class="p-meet-tag" style="background: var(--navy-700);">${escapeHTML(m.meeting_type||'meeting')}</div>
          ${isStaff ? `<div style="display:flex; gap:6px;">
            <button class="btn-ghost-sm" data-meet-edit="${m.id}">Edit</button>
            <button class="btn-ghost-sm" data-meet-del="${m.id}">Delete</button>
          </div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e){ $('#meetList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-meet-edit]');
  const dl = e.target.closest('[data-meet-del]');
  if(ed){
    try { const m = (await api('/api/meetings')).find(x => x.id == ed.dataset.meetEdit); if(m) openMeetingModal(m); }
    catch(err){ alert(err.message); }
  }
  if(dl){
    if(!confirm('Delete this meeting?')) return;
    try { await api('/api/meetings/'+dl.dataset.meetDel, {method:'DELETE'}); loadMeetings(); }
    catch(err){ alert(err.message); }
  }
});
$('#addMeetingBtn').addEventListener('click', () => openMeetingModal());
function openMeetingModal(m){
  const isEdit = !!m;
  modal(`<h2>${isEdit?'Edit':'New'} meeting / announcement</h2>
    <label>Title<input id="mTitle" value="${escapeHTML(m?.title||'')}"></label>
    <label>Type<select id="mType">
      ${['group','seminar','announcement'].map(v=>`<option value="${v}" ${m?.meeting_type===v?'selected':''}>${v}</option>`).join('')}
    </select></label>
    <label>Date & time<input id="mWhen" type="datetime-local" value="${m?.scheduled_at?String(m.scheduled_at).slice(0,16):''}"></label>
    <label>Location<input id="mLoc" value="${escapeHTML(m?.location||'')}"></label>
    <label>Notes / description<textarea id="mDesc">${escapeHTML(m?.description||m?.notes||'')}</textarea></label>`,
    async () => {
      const body = {
        title: $('#mTitle').value.trim(),
        meeting_type: $('#mType').value,
        scheduled_at: $('#mWhen').value || null,
        location: $('#mLoc').value,
        description: $('#mDesc').value
      };
      if(!body.title) throw new Error('Title required');
      if(isEdit) await api('/api/meetings/'+m.id, {method:'PUT', body});
      else await api('/api/meetings', {method:'POST', body});
      loadMeetings();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delMeet">Delete</button>` : '');
  if(isEdit){
    $('#delMeet').addEventListener('click', async () => {
      if(!confirm('Delete this meeting?')) return;
      try { await api('/api/meetings/'+m.id, {method:'DELETE'}); closeModal(); loadMeetings(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Equipment ---------- */
let EQ_CAT='', EQ_STATUS='', EQ_QUERY='', EQ_DUE='', EQ_SORT='', EQ_TRAINING='', EQ_MINE_ONLY=false, EQ_PENDING_ONLY=false;

function _eqMaintBadge(x){
  const badges = [];
  if(x.maintenance_state === 'overdue') badges.push('<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 5px;border-radius:3px;margin-left:4px;">Maintenance overdue</span>');
  else if(x.maintenance_state === 'due_soon') badges.push('<span style="font-size:10px;background:#fff7ed;color:#c2410c;padding:2px 5px;border-radius:3px;margin-left:4px;">Maintenance due soon</span>');
  if(x.calibration_state === 'overdue') badges.push('<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 5px;border-radius:3px;margin-left:4px;">Calibration overdue</span>');
  else if(x.calibration_state === 'due_soon') badges.push('<span style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:2px 5px;border-radius:3px;margin-left:4px;">Calibration due soon</span>');
  if(n0(x.pending_reservations) > 0) badges.push(`<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 5px;border-radius:3px;margin-left:4px;">${n0(x.pending_reservations)} pending</span>`);
  return badges.join('');
}

async function loadEquipment(){
  try {
    const res = await api('/api/equipment?' + buildQS({
      category: EQ_CAT,
      status: EQ_STATUS,
      search: EQ_QUERY,
      due: EQ_DUE,
      mine: EQ_MINE_ONLY,
      reservations: EQ_PENDING_ONLY ? 'pending' : '',
      training: EQ_TRAINING,
      sort: EQ_SORT,
      limit: 200
    }));
    const eq = unwrap(res);
    const summary = summaryOf(res);
    $('#eqSummary').innerHTML = [
      statCard(n0(summary.total), 'Tracked equipment'),
      statCard(`${n0(summary.available)} available`, 'Ready right now', n0(summary.available) ? '' : 'warn'),
      statCard(`${n0(summary.in_use)} active`, 'Checked out or in use', n0(summary.pending_reservations) ? 'info' : ''),
      statCard(`${n0(summary.training_blocked)} blocked`, 'Training clearance missing', n0(summary.training_blocked) ? 'warn' : ''),
      statCard(`${n0(summary.maintenance_overdue) + n0(summary.calibration_overdue)} overdue`, 'Maintenance or calibration', (n0(summary.maintenance_overdue) + n0(summary.calibration_overdue)) ? 'alert' : '')
    ].join('');
    const list = $('#eqList');
    if(!eq.length){ list.innerHTML='<div class="empty">No equipment matches these filters.</div>'; return; }
    const isStaff = isLabStaffRole(ME.role);
    list.innerHTML = eq.map(x => {
      const trainingBlocked = n0(x.requires_training) && !canOperateEquipment(x);
      const statusCls = x.status==='available' ? 'p-eq-status-available'
                       : x.status==='in_use' ? 'p-eq-status-out'
                       : x.status==='broken' ? 'p-eq-status-broken'
                       : 'p-eq-status-maint';
      const reservationMeta = x.next_reservation_at ? `Next reservation ${fmtDT(x.next_reservation_at)}` : 'No upcoming reservations';
      const trainingMeta = !n0(x.requires_training) ? 'No training gate'
        : x.training_state === 'active' ? `Cleared${x.user_training_expires_at ? ` until ${fmtDate(x.user_training_expires_at)}` : ''}`
        : x.training_state === 'expired' ? `Training expired${x.user_training_expires_at ? ` ${fmtDate(x.user_training_expires_at)}` : ''}`
        : `Requires ${x.training_requirement || 'active training'}`;
      return `<div class="p-inv-row">
        <div style="flex:2;">
          <div class="p-inv-name">${escapeHTML(x.name)} ${trainingTagMarkup(x)}${_eqMaintBadge(x)}</div>
          <div class="p-eq-meta">${escapeHTML(x.location||'')}${x.manufacturer?` · ${escapeHTML(x.manufacturer)}`:''}${x.model?` ${escapeHTML(x.model)}`:''}</div>
          <div class="p-eq-meta p-eq-meta-soft" style="margin-top:3px;">${escapeHTML(reservationMeta)}</div>
          <div class="p-eq-meta p-eq-meta-soft" style="margin-top:3px;">${escapeHTML(trainingMeta)}</div>
        </div>
        <div style="flex:1;"><span class="p-mono">${escapeHTML(x.sku||'—')}</span></div>
        <div style="flex:1;" class="p-inv-cat">${escapeHTML(x.category||'')}</div>
        <div style="flex:1;font-size:12px;">${x.last_used_user_name?escapeHTML(x.last_used_user_name):'<span style="color:var(--fg-4);">never</span>'}<br>
          <span style="font-size:11px;color:var(--fg-4);">${x.last_used_at?fmtDT(x.last_used_at):''}</span></div>
        <div style="flex:1;"><span class="${statusCls}">${escapeHTML((x.status||'').replace('_',' '))}</span></div>
        <div style="width:200px; display:flex; gap:5px; flex-wrap:wrap;">
          ${x.status==='available' && !trainingBlocked ? `<button class="btn-ghost-sm" data-eq-action="checkout" data-eq-id="${x.id}">Check out</button>` : ''}
          ${x.status==='available' && !trainingBlocked ? `<button class="btn-ghost-sm" data-eq-action="reserve"  data-eq-id="${x.id}">Reserve</button>` : ''}
          ${x.status==='available' && trainingBlocked ? `<button class="btn-ghost-sm" data-eq-action="training" data-eq-id="${x.id}">Open training</button>` : ''}
          ${x.status==='in_use' && x.current_user_id===ME.id ? `<button class="btn-ghost-sm" data-eq-action="checkin" data-eq-id="${x.id}">Return</button>` : ''}
          ${isStaff && x.status==='in_use' ? `<button class="btn-ghost-sm" data-eq-action="checkin" data-eq-id="${x.id}">Force return</button>` : ''}
          <button class="btn-ghost-sm" data-eq-action="log" data-eq-id="${x.id}">History</button>
          ${isStaff ? `<button class="btn-ghost-sm" data-eq-action="maint" data-eq-id="${x.id}">Maint.</button>` : ''}
          ${isStaff ? `<button class="btn-ghost-sm" data-eq-action="edit" data-eq-id="${x.id}">Edit</button>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e){ $('#eqList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
$('#eqTabs').addEventListener('click', e => {
  const b = e.target.closest('.p-tab'); if(!b) return;
  $$('#eqTabs .p-tab').forEach(x=>x.classList.toggle('active', x===b));
  EQ_CAT = b.dataset.eqcat||''; loadEquipment();
});
$('#eqStatus').addEventListener('change', e => { EQ_STATUS = e.target.value; loadEquipment(); });
$('#eqSearch').addEventListener('input', e => { EQ_QUERY = e.target.value; loadEquipment(); });
$('#eqDue').addEventListener('change', e => { EQ_DUE = e.target.value; loadEquipment(); });
$('#eqSort').addEventListener('change', e => { EQ_SORT = e.target.value; loadEquipment(); });
$('#eqTraining').addEventListener('change', e => { EQ_TRAINING = e.target.value; loadEquipment(); });
$('#eqMineOnly').addEventListener('change', e => { EQ_MINE_ONLY = e.target.checked; loadEquipment(); });
$('#eqPendingOnly').addEventListener('change', e => { EQ_PENDING_ONLY = e.target.checked; loadEquipment(); });
$('#addEquipBtn').addEventListener('click', () => openEquipModal());
$('#myResvBtn').addEventListener('click', async () => {
  try {
    const resvs = await api(`/api/equipment/reservations?user_id=${ME.id}&upcoming=1`);
    modal(`<h2>My equipment reservations</h2>
      ${resvs.length ? resvs.map(r=>`
        <div class="p-log-row" style="flex-direction:column;align-items:flex-start;gap:4px;padding:8px 0;">
          <div style="font-weight:600;">${escapeHTML(r.equipment_name)}</div>
          <div style="font-size:12px;color:var(--fg-3);">${fmtDate(r.start_at)} → ${fmtDate(r.end_at)}</div>
          <div style="font-size:12px;">${escapeHTML(r.purpose||'—')}</div>
          <span class="p-tag-sm p-tag-outline">${escapeHTML(r.status)}</span>
          ${r.status==='pending'||r.status==='approved' ? `<button class="btn-ghost-sm" data-resv-cancel="${r.id}" style="margin-top:2px;">Cancel</button>` : ''}
        </div>`).join('') : '<div class="empty">No upcoming reservations.</div>'}`,
      null, '', 'Close');
    document.querySelectorAll('[data-resv-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await api(`/api/equipment/reservations/${btn.dataset.resvCancel}`,{method:'PUT',body:{status:'cancelled'}}); closeModal(); loadEquipment(); }
        catch(err){ alert(err.message); }
      });
    });
  } catch(err){ alert(err.message); }
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-eq-action]'); if(!b) return;
  const id = b.dataset.eqId; const action = b.dataset.eqAction;
  if(action==='checkout'){
    const note = prompt('Optional note (e.g. project, expected return):')||'';
    try { await api('/api/equipment/'+id+'/checkout',{method:'POST', body:{note}}); loadEquipment(); loadDashboard(); }
    catch(err){ alert(err.message); }
  } else if(action==='checkin'){
    const note = prompt('Optional return note:')||'';
    try { await api('/api/equipment/'+id+'/checkin',{method:'POST', body:{note}}); loadEquipment(); loadDashboard(); }
    catch(err){ alert(err.message); }
  } else if(action==='reserve'){
    const today = new Date().toISOString().slice(0,16);
    modal(`<h2>Reserve equipment</h2>
      <label>Start date/time<input id="resvStart" type="datetime-local" value="${today}"></label>
      <label>End date/time<input id="resvEnd"   type="datetime-local"></label>
      <label>Purpose<input id="resvPurpose" placeholder="e.g. Experiment XYZ"></label>`,
      async () => {
        const s = $('#resvStart').value, en = $('#resvEnd').value;
        if(!s||!en) throw new Error('Start and end are required');
        if(s >= en) throw new Error('End must be after start');
        await api(`/api/equipment/${id}/reservations`,{method:'POST', body:{start_at:s, end_at:en, purpose:$('#resvPurpose').value}});
        alert('Reservation requested. The professor will review and approve it.');
      });
  } else if(action==='training'){
    goRoute('training');
  } else if(action==='log'){
    try {
      const [log, maint, resvs, eq] = await Promise.all([
        api('/api/equipment/'+id+'/log'),
        api('/api/equipment/'+id+'/maintenance'),
        api('/api/equipment/'+id+'/reservations'),
        api('/api/equipment').then(r => unwrap(r).find(x => x.id == id))
      ]);
      const isStaff = isLabStaffRole(ME.role);
      const canApproveReservations = canApproveReservationsRole(ME.role);
      modal(`<h2>${escapeHTML(eq?.name||'Equipment')} — history</h2>
        <p style="font-size:12px;color:var(--fg-3);">SKU ${escapeHTML(eq?.sku||'—')} · ${escapeHTML(eq?.manufacturer||'')} ${escapeHTML(eq?.model||'')}</p>
        <div class="p-tabs" style="margin-bottom:12px;">
          <button type="button" class="p-tab active" data-htab="usage">Usage log</button>
          <button type="button" class="p-tab" data-htab="maint">Maintenance</button>
          <button type="button" class="p-tab" data-htab="resvs">Reservations</button>
        </div>
        <div id="htUsage">
          ${log.length ? log.map(l=>`<div class="p-log-row">
            <span class="p-log-when">${fmtDT(l.started_at||l.created_at)}</span>
            <span class="p-log-act ${l.action}">${escapeHTML(l.action)}</span>
            <span class="p-log-who">${escapeHTML(l.user_name||l.username||'?')}</span>
            <span class="p-log-note">${escapeHTML(l.note||'')}</span>
          </div>`).join('') : '<div class="empty">No usage history.</div>'}
        </div>
        <div id="htMaint" style="display:none;">
          ${isStaff ? `<button type="button" class="btn-ghost-sm" id="addMaintBtn" style="margin-bottom:10px;">+ Add maintenance record</button>` : ''}
          ${maint.length ? maint.map(m=>`<div class="p-log-row">
            <span class="p-log-when">${fmtDate(m.completed_at||m.scheduled_at)}</span>
            <span class="p-log-act">${escapeHTML(m.maint_type)}</span>
            <span class="p-log-who">${escapeHTML(m.performed_by||'—')}</span>
            <span class="p-log-note">${escapeHTML(m.notes||'')}${m.next_due_at?' · Next: '+fmtDate(m.next_due_at):''}</span>
          </div>`).join('') : '<div class="empty">No maintenance records.</div>'}
        </div>
        <div id="htResvs" style="display:none;">
          ${resvs.length ? resvs.map(r=>`<div class="p-log-row">
            <span class="p-log-when">${fmtDate(r.start_at)}</span>
            <span class="p-log-act">${escapeHTML(r.status)}</span>
            <span class="p-log-who">${escapeHTML(r.user_name||r.username||'?')}</span>
            <span class="p-log-note">${escapeHTML(r.purpose||'')}
              ${canApproveReservations && r.status==='pending' ? `<button type="button" class="btn-ghost-sm" data-approve-resv="${r.id}">✓ Approve</button> <button type="button" class="btn-ghost-sm" data-deny-resv="${r.id}">✗ Deny</button>` : ''}
            </span>
          </div>`).join('') : '<div class="empty">No reservations.</div>'}
        </div>`,
        null, '', 'Close');
      // Tab switching
      document.querySelectorAll('[data-htab]').forEach(t => t.addEventListener('click', ev => {
        ev.preventDefault();
        document.querySelectorAll('[data-htab]').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('htUsage').style.display = t.dataset.htab==='usage'?'':'none';
        document.getElementById('htMaint').style.display = t.dataset.htab==='maint'?'':'none';
        document.getElementById('htResvs').style.display = t.dataset.htab==='resvs'?'':'none';
      }));
      // Approve/deny reservations (staff)
      document.querySelectorAll('[data-approve-resv],[data-deny-resv]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const rid = btn.dataset.approveResv || btn.dataset.denyResv;
          const st  = btn.dataset.approveResv ? 'approved' : 'denied';
          try { await api(`/api/equipment/reservations/${rid}`,{method:'PUT',body:{status:st}}); closeModal(); loadEquipment(); }
          catch(err){ alert(err.message); }
        });
      });
      // Add maintenance record
      const addMaintBtn = document.getElementById('addMaintBtn');
      if(addMaintBtn) addMaintBtn.addEventListener('click', () => openMaintModal(id));
    } catch(err){ alert(err.message); }
  } else if(action==='maint'){
    openMaintModal(id);
  } else if(action==='edit'){
    try { const eq = (unwrap(await api('/api/equipment'))).find(x=>x.id==id); openEquipModal(eq); }
    catch(err){ alert(err.message); }
  }
});

function openMaintModal(equipId, rec){
  const today = new Date().toISOString().slice(0,10);
  modal(`<h2>${rec?'Edit':'Add'} maintenance record</h2>
    <label>Type<select id="mType">
      ${['maintenance','calibration','repair','inspection'].map(t=>`<option value="${t}" ${rec?.maint_type===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>Scheduled date<input id="mSched" type="date" value="${rec?.scheduled_at?.slice(0,10)||''}"></label>
    <label>Completed date<input id="mComp" type="date" value="${rec?.completed_at?.slice(0,10)||today}"></label>
    <label>Performed by<input id="mPerf" value="${escapeHTML(rec?.performed_by||'')}"></label>
    <label>Cost (USD)<input id="mCost" type="number" step="0.01" value="${rec?.cost||''}"></label>
    <label>Next due date<input id="mNextDue" type="date" value="${rec?.next_due_at?.slice(0,10)||''}"></label>
    <label>Notes<textarea id="mNotes">${escapeHTML(rec?.notes||'')}</textarea></label>`,
    async () => {
      const body = {
        maint_type: $('#mType').value,
        scheduled_at: $('#mSched').value||null,
        completed_at: $('#mComp').value||null,
        performed_by: $('#mPerf').value,
        cost: Number($('#mCost').value)||null,
        next_due_at: $('#mNextDue').value||null,
        notes: $('#mNotes').value
      };
      if(rec) await api(`/api/equipment/maintenance/${rec.id}`,{method:'PUT',body});
      else    await api(`/api/equipment/${equipId}/maintenance`,{method:'POST',body});
      loadEquipment();
    });
}

function openEquipModal(eq){
  const isEdit = !!eq;
  modal(`<h2>${isEdit?'Edit':'New'} equipment</h2>
    <label>Name<input id="eqName" value="${escapeHTML(eq?.name||'')}"></label>
    <label>SKU / asset #<input id="eqTag" value="${escapeHTML(eq?.sku||'')}"></label>
    <label>Category<select id="eqCat">
      ${['rig','instrument','supply','tool'].map(c=>`<option value="${c}" ${eq?.category===c?'selected':''}>${c}</option>`).join('')}
    </select></label>
    <label>Location<input id="eqLoc" value="${escapeHTML(eq?.location||'')}"></label>
    <label>Manufacturer<input id="eqMfr" value="${escapeHTML(eq?.manufacturer||'')}"></label>
    <label>Model<input id="eqModel" value="${escapeHTML(eq?.model||'')}"></label>
    <label>Serial number<input id="eqSerial" value="${escapeHTML(eq?.serial_number||'')}"></label>
    <label>Purchase date<input id="eqPurch" type="date" value="${eq?.purchase_date||''}"></label>
    <label>Maintenance interval (days, 0=none)<input id="eqMaintInt" type="number" min="0" value="${eq?.maintenance_interval_days||0}"></label>
    <label>Last calibrated<input id="eqCalLast" type="date" value="${eq?.last_calibrated_at?.slice(0,10)||''}"></label>
    <label>Next calibration due<input id="eqCalNext" type="date" value="${eq?.next_calibration_at?.slice(0,10)||''}"></label>
    <label class="p-inline-check"><input id="eqReqTraining" type="checkbox" style="width:auto;" ${n0(eq?.requires_training) ? 'checked' : ''}> Requires active training</label>
    <label>Training requirement / course name<input id="eqTrainingReq" value="${escapeHTML(eq?.training_requirement||'')}" placeholder="e.g. Confocal microscope certification"></label>
    <label>Status<select id="eqSt">
      ${['available','in_use','maintenance','broken'].map(c=>`<option value="${c}" ${eq?.status===c?'selected':''}>${c.replace('_',' ')}</option>`).join('')}
    </select></label>
    <label>Notes<textarea id="eqNotes">${escapeHTML(eq?.notes||'')}</textarea></label>`,
    async () => {
      const body = {
        name: $('#eqName').value.trim(),
        sku: $('#eqTag').value,
        category: $('#eqCat').value,
        location: $('#eqLoc').value,
        manufacturer: $('#eqMfr').value,
        model: $('#eqModel').value,
        serial_number: $('#eqSerial').value,
        purchase_date: $('#eqPurch').value||null,
        maintenance_interval_days: Number($('#eqMaintInt').value)||0,
        last_calibrated_at: $('#eqCalLast').value||null,
        next_calibration_at: $('#eqCalNext').value||null,
        requires_training: $('#eqReqTraining').checked,
        training_requirement: $('#eqReqTraining').checked ? $('#eqTrainingReq').value.trim() : '',
        status: $('#eqSt').value,
        notes: $('#eqNotes').value
      };
      if(!body.name) throw new Error('Name required');
      if(isEdit) await api('/api/equipment/'+eq.id,{method:'PUT', body});
      else await api('/api/equipment',{method:'POST', body});
      loadEquipment();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delEq">Delete</button>` : ''
  );
  const reqToggle = $('#eqReqTraining');
  const reqInput = $('#eqTrainingReq');
  const syncTrainingRequirement = () => {
    reqInput.disabled = !reqToggle.checked;
    if(!reqToggle.checked) reqInput.value = '';
  };
  reqToggle.addEventListener('change', syncTrainingRequirement);
  syncTrainingRequirement();
  if(isEdit){
    $('#delEq').addEventListener('click', async () => {
      if(!confirm('Delete this equipment? Its usage log will be lost.')) return;
      try { await api('/api/equipment/'+eq.id,{method:'DELETE'}); closeModal(); loadEquipment(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Inventory ---------- */
let INV_LAB = '', INV_QUERY = '', INV_CAT = '', INV_SUPPLIER = '', INV_STATUS = '', INV_SORT = '', INV_LOW_STOCK = false, INV_EXPIRING = false;

function _expiryBadge(expiry_date){
  if(!expiry_date) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(expiry_date);
  const days  = Math.round((exp - today) / 86400000);
  if(days < 0)   return `<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 5px;border-radius:3px;">Expired</span>`;
  if(days <= 30) return `<span style="font-size:10px;background:#fff7ed;color:#c2410c;padding:2px 5px;border-radius:3px;">Exp ${days}d</span>`;
  return `<span style="font-size:10px;color:var(--fg-4);">Exp ${fmtDate(expiry_date)}</span>`;
}

function _hazardBadge(h, sds){
  if(!h && !sds) return '';
  const icon = { 'flammable':'🔥','corrosive':'⚗','toxic':'☠','explosive':'💥','oxidizer':'🌀','irritant':'⚠','environmental':'🌿' }[h?.toLowerCase()] || '⚠';
  const badges = [];
  if(h)   badges.push(`<span title="Hazard: ${escapeHTML(h)}" style="font-size:11px;cursor:default;">${icon} ${escapeHTML(h)}</span>`);
  if(sds) badges.push(`<a href="${escapeHTML(sds)}" target="_blank" style="font-size:11px;color:var(--gold-700);" title="Safety Data Sheet">SDS ↗</a>`);
  return `<span style="display:inline-flex;gap:6px;">${badges.join('')}</span>`;
}

async function loadInventory(){
  try {
    const [res, suppliers, queue] = await Promise.all([
      api('/api/inventory?' + buildQS({
        search: INV_QUERY,
        lab: INV_LAB,
        category: INV_CAT,
        supplier_id: INV_SUPPLIER,
        status: INV_STATUS,
        sort: INV_SORT,
        low_stock: INV_LOW_STOCK,
        expiring_soon: INV_EXPIRING,
        limit: 300
      })),
      api('/api/suppliers').catch(() => []),
      api('/api/inventory/reorder-queue?' + buildQS({
        lab: INV_LAB,
        supplier_id: INV_SUPPLIER,
        limit: 8
      })).catch(err => ({ error: err.message, rows: [], summary: {} }))
    ]);
    const items = unwrap(res);
    const summary = summaryOf(res);
    // populate lab filter
    const labs = [...new Set(items.map(x=>x.lab||'').filter(Boolean))];
    const sel = $('#invLab');
    const curLab = INV_LAB || sel.value;
    sel.innerHTML = '<option value="">All labs</option>' + labs.map(l=>`<option value="${l}" ${l===curLab?'selected':''}>${escapeHTML(l)}</option>`).join('');
    // populate category filter
    const cats = [...new Set(items.map(x=>x.category||'').filter(Boolean))].sort();
    const catSel = $('#invCatFilter');
    const curCat = INV_CAT || catSel.value;
    catSel.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option value="${c}" ${c===curCat?'selected':''}>${escapeHTML(c)}</option>`).join('');
    const supplierSel = $('#invSupplier');
    const curSupplier = INV_SUPPLIER || supplierSel.value;
    supplierSel.innerHTML = '<option value="">All suppliers</option>' + suppliers.map(s=>`<option value="${s.id}" ${String(s.id)===String(curSupplier)?'selected':''}>${escapeHTML(s.name)}</option>`).join('');
    $('#invSummary').innerHTML = [
      statCard(n0(summary.total), 'Tracked items'),
      statCard(`${n0(summary.low_stock)} low`, 'Below reorder threshold', n0(summary.low_stock) ? 'warn' : ''),
      statCard(`${n0(summary.out_of_stock)} out`, 'Unavailable now', n0(summary.out_of_stock) ? 'alert' : ''),
      statCard(`${n0(summary.expired) + n0(summary.expiring_soon)} at risk`, 'Expiry and safety watch', (n0(summary.expired) + n0(summary.expiring_soon)) ? 'alert' : '')
    ].join('');
    renderInventoryActionQueue(queue);
    const isStaff = isLabStaffRole(ME.role);
    if(!items.length){ $('#invList').innerHTML='<div class="empty">No inventory items match.</div>'; return; }
    $('#invList').innerHTML = `
      <div class="p-inv-table">
        <div class="p-inv-row p-inv-head">
          <div style="flex:2.5;">Item</div>
          <div style="flex:1;">SKU · Lab</div>
          <div style="flex:1.5;">Qty</div>
          <div style="width:130px;"></div>
        </div>
        ${items.map(x => {
          const pct = x.min_qty > 0 ? Math.min(100, Math.round((x.qty/x.min_qty)*100)) : 100;
          const fillColor = x.qty <= 0 ? 'var(--status-alert)' : x.qty < x.min_qty ? 'var(--status-warn)' : 'var(--status-ok)';
          return `<div class="p-inv-row">
            <div style="flex:2.5;">
              <div class="p-inv-name">${escapeHTML(x.name)} <span class="p-tag-sm ${x.stock_state==='out'?'p-tag-alert':x.stock_state==='low'?'p-tag-warn':'p-tag-ok'}">${escapeHTML(String(x.stock_state||'ok').replace('_',' '))}</span></div>
              <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(x.category||'')}${x.supplier_name?` · ${escapeHTML(x.supplier_name)}`:''}${x.supplier_email?` · ${escapeHTML(x.supplier_email)}`:''}</div>
              <div style="margin-top:2px;display:flex;gap:6px;align-items:center;">
                ${_hazardBadge(x.hazard_class, x.sds_url)}
                ${_expiryBadge(x.expiry_date)}
              </div>
            </div>
            <div style="flex:1;">
              <div><span class="p-mono" style="font-size:12px;">${escapeHTML(x.sku||'—')}</span></div>
              <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(x.lab||'—')}${x.location?' · '+escapeHTML(x.location):''}${x.last_adjusted_at?` · adjusted ${fmtDT(x.last_adjusted_at)}`:''}</div>
            </div>
            <div style="flex:1.5;">
              <div class="p-qty-control">
                <button class="btn-ghost-sm" data-inv-adj="${x.id}" data-adj-delta="-1" title="Decrease by 1">-</button>
                <span class="p-qty-num">${x.qty}</span>
                <span class="p-qty-min" style="font-size:11px;"> ${escapeHTML(x.unit||'each')}</span>
                <button class="btn-ghost-sm" data-inv-adj="${x.id}" data-adj-delta="1" title="Increase by 1">+</button>
              </div>
              <div style="font-size:11px;color:var(--fg-4);">min ${x.min_qty} ${escapeHTML(x.unit||'each')}</div>
              <div class="p-qty-bar"><div class="p-qty-fill" style="width:${pct}%;background:${fillColor};"></div></div>
            </div>
            <div style="width:130px;display:flex;gap:4px;flex-wrap:wrap;">
              <button class="btn-ghost-sm" data-inv-log="${x.id}">Log</button>
              <button class="btn-ghost-sm" data-inv-receive="${x.id}">Receive</button>
              <button class="btn-ghost-sm" data-inv-request="${x.id}">Request</button>
              ${isStaff ? `<button class="btn-ghost-sm" data-inv-edit="${x.id}">Edit</button>` : ''}
              ${x.reorder_url ? `<a class="btn-ghost-sm" href="${escapeHTML(x.reorder_url)}" target="_blank">Order</a>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    // Wire ± adjust buttons
    $('#invList').querySelectorAll('[data-inv-adj]').forEach(b => b.addEventListener('click', async () => {
      const delta = parseInt(b.dataset.adjDelta, 10);
      const reason = delta < 0 ? (prompt('Reason for decrease (optional):')||'manual adjust') : 'manual adjust';
      try {
        const res = await api(`/api/inventory/${b.dataset.invAdj}/adjust`, {method:'PATCH', body:{delta, reason}});
        // Update qty in place
        const numEl = b.closest('.p-inv-row').querySelector('.p-qty-num');
        if(numEl) numEl.textContent = res.qty;
        loadInventory(); // refresh to update bar colours and min display
      } catch(err){ alert(err.message); }
    }));
    $('#invList').querySelectorAll('[data-inv-request]').forEach(b => b.addEventListener('click', () => {
      const item = items.find(x => String(x.id) === b.dataset.invRequest);
      openIssueModal({ category:'supplies', inventory:item });
    }));
    // Wire log buttons
    $('#invList').querySelectorAll('[data-inv-log]').forEach(b => b.addEventListener('click', async () => {
      const it = items.find(x => x.id == b.dataset.invLog); if(!it) return;
      try {
        const log = await api(`/api/inventory/${it.id}/log`);
        modal(`<h2>${escapeHTML(it.name)} — adjustment log</h2>
          <p style="font-size:12px;color:var(--fg-3);">SKU ${escapeHTML(it.sku||'—')} · Current qty: ${it.qty} ${escapeHTML(it.unit||'each')}</p>
          ${log.length ? log.map(l=>`<div class="p-log-row">
            <span class="p-log-when">${fmtDT(l.created_at)}</span>
            <span class="p-log-act" style="color:${l.delta>=0?'var(--status-ok)':'var(--status-alert)'}">${l.delta>=0?'+':''}${l.delta}</span>
            <span class="p-log-who">${escapeHTML(l.user_name||l.username||'?')}</span>
            <span class="p-log-note">${escapeHTML(l.reason||'')} → ${l.qty_after}</span>
          </div>`).join('') : '<div class="empty">No adjustment history.</div>'}`,
          null, '', 'Close');
      } catch(err){ alert(err.message); }
    }));
    $('#invList').querySelectorAll('[data-inv-receive]').forEach(b => b.addEventListener('click', async () => {
      const it = items.find(x => x.id == b.dataset.invReceive); if(!it) return;
      try { await receiveInventoryStock(it.id, it.name); }
      catch(err){ alert(err.message); }
    }));
    // Wire edit buttons
    $('#invList').querySelectorAll('[data-inv-edit]').forEach(b => b.addEventListener('click', async () => {
      const it = items.find(x => x.id == b.dataset.invEdit); if(it) openInvModal(it);
    }));
  } catch(e){ $('#invList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}

$('#invSearch').addEventListener('input', e => { INV_QUERY = e.target.value; loadInventory(); });
$('#invLab').addEventListener('change', e => { INV_LAB = e.target.value; loadInventory(); });
$('#invCatFilter').addEventListener('change', e => { INV_CAT = e.target.value; loadInventory(); });
$('#invSupplier').addEventListener('change', e => { INV_SUPPLIER = e.target.value; loadInventory(); });
$('#invStatus').addEventListener('change', e => { INV_STATUS = e.target.value; loadInventory(); });
$('#invSort').addEventListener('change', e => { INV_SORT = e.target.value; loadInventory(); });
$('#invLowStock').addEventListener('change', e => { INV_LOW_STOCK = e.target.checked; loadInventory(); });
$('#invExpiring').addEventListener('change', e => { INV_EXPIRING = e.target.checked; loadInventory(); });
$('#addInvBtn').addEventListener('click', () => openInvModal());
$('#invExportBtn').addEventListener('click', async () => {
  try {
    await downloadFile('/api/inventory/export.csv', 'latfs-inventory.csv');
  } catch (err) {
    alert(err.message);
  }
});

async function openInvModal(it){
  const isEdit = !!it;
  let suppliers = [];
  try { suppliers = await api('/api/suppliers'); } catch(_){}
  modal(`<h2>${isEdit?'Edit inventory item':'Add inventory item'}</h2>
    <label>Name<input id="ivName" value="${escapeHTML(it?.name||'')}"></label>
    <label>SKU / part # (required, unique)<input id="ivSku" value="${escapeHTML(it?.sku||'')}" placeholder="SN-LAT-00000"></label>
    <label>Category<input id="ivCat" value="${escapeHTML(it?.category||'')}" placeholder="Chemicals / Consumables / Hardware…"></label>
    <label>Lab<select id="ivLab">
      <option value="A" ${it?.lab==='A'||!it?'selected':''}>Lab A</option>
      <option value="B" ${it?.lab==='B'?'selected':''}>Lab B</option>
    </select></label>
    <label>Location (shelf / cabinet)<input id="ivLoc" value="${escapeHTML(it?.location||'')}" placeholder="e.g. Shelf B3, Fridge 2"></label>
    <label>Qty on hand<input id="ivQty" type="number" value="${it?.qty??0}" min="0"></label>
    <label>Min qty (reorder threshold)<input id="ivMin" type="number" value="${it?.min_qty??1}" min="0"></label>
    <label>Unit<input id="ivUnit" value="${escapeHTML(it?.unit||'each')}" placeholder="each / mL / g / box…"></label>
    <label>Supplier<select id="ivSupplier">
      <option value="">— none —</option>
      ${suppliers.map(s=>`<option value="${s.id}" ${it?.supplier_id==s.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}
    </select></label>
    <label>Reorder URL<input id="ivReorder" type="url" value="${escapeHTML(it?.reorder_url||'')}" placeholder="https://…"></label>
    <label>Expiry date<input id="ivExpiry" type="date" value="${it?.expiry_date||''}"></label>
    <label>Chemical CAS # (optional)<input id="ivCas" value="${escapeHTML(it?.chemical_cas||'')}" placeholder="e.g. 7732-18-5"></label>
    <label>Hazard class<input id="ivHazard" value="${escapeHTML(it?.hazard_class||'')}" placeholder="flammable / corrosive / toxic…"></label>
    <label>SDS URL<input id="ivSds" type="url" value="${escapeHTML(it?.sds_url||'')}" placeholder="https://…"></label>
    <label>Notes<textarea id="ivNotes">${escapeHTML(it?.notes||'')}</textarea></label>`,
    async () => {
      const body = {
        name: $('#ivName').value.trim(),
        sku: $('#ivSku').value.trim(),
        category: $('#ivCat').value,
        lab: $('#ivLab').value,
        location: $('#ivLoc').value,
        qty: Number($('#ivQty').value)||0,
        min_qty: Number($('#ivMin').value)||0,
        unit: $('#ivUnit').value||'each',
        supplier_id: $('#ivSupplier').value||null,
        reorder_url: $('#ivReorder').value,
        expiry_date: $('#ivExpiry').value||null,
        chemical_cas: $('#ivCas').value,
        hazard_class: $('#ivHazard').value,
        sds_url: $('#ivSds').value,
        notes: $('#ivNotes').value,
        sort_order: it?.sort_order||0
      };
      if(!body.name) throw new Error('Name required');
      if(!body.sku) throw new Error('SKU required');
      if(isEdit) await api('/api/inventory/'+it.id,{method:'PUT', body});
      else await api('/api/inventory',{method:'POST', body});
      loadInventory();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delInv">Delete</button>` : ''
  );
  if(isEdit){
    $('#delInv').addEventListener('click', async () => {
      if(!confirm('Delete this item?')) return;
      try { await api('/api/inventory/'+it.id,{method:'DELETE'}); closeModal(); loadInventory(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Samples ---------- */
let SAMPLE_QUERY='', SAMPLE_STATUS='', SAMPLE_APPROVAL='', SAMPLE_EXPIRING_SOON=false, SAMPLE_EXPIRED=false, SAMPLE_LOW_QTY=false;

function canEditSampleEntry(sample){
  if(isSiteModeratorRole(ME.role)) return true;
  return Number(sample?.created_by_id) === Number(ME.id) && sample?.approval_status !== 'approved';
}

async function reviewSampleEntry(sample, approvalStatus){
  let reviewNote = '';
  if(approvalStatus === 'denied'){
    reviewNote = prompt(
      `Optional note for ${sample.name}:`,
      sample.review_note || 'Please update the sample details and resubmit.'
    ) || '';
  }
  await api(`/api/samples/${sample.id}/review`, {
    method:'POST',
    body:{ approval_status: approvalStatus, review_note: reviewNote }
  });
  loadSamples();
  loadDashboard();
}

async function loadSamples(){
  try {
    const res = await api('/api/samples?' + buildQS({
      status: SAMPLE_STATUS,
      approval_status: SAMPLE_APPROVAL,
      search: SAMPLE_QUERY,
      expiring_soon: SAMPLE_EXPIRING_SOON,
      expired: SAMPLE_EXPIRED,
      low_qty: SAMPLE_LOW_QTY
    }));
    const items = unwrap(res);
    const summary = summaryOf(res);
    const canReview = isSiteModeratorRole(ME.role);
    $('#sampleSummary').innerHTML = (canReview
      ? [
          statCard(n0(summary.total), 'Visible to approvers'),
          statCard(`${n0(summary.pending)} pending`, 'Awaiting approval', n0(summary.pending) ? 'warn' : ''),
          statCard(`${n0(summary.approved)} live`, 'Approved samples'),
          statCard(`${n0(summary.expired) + n0(summary.depleted)} blocked`, 'Expired or depleted approved', (n0(summary.expired) + n0(summary.depleted)) ? 'alert' : '')
        ]
      : [
          statCard(`${n0(summary.approved)} live`, 'Approved samples'),
          statCard(`${n0(summary.pending)} pending`, 'My submissions awaiting approval', n0(summary.pending) ? 'info' : ''),
          statCard(`${n0(summary.denied)} revise`, 'Returned for changes', n0(summary.denied) ? 'warn' : ''),
          statCard(`${n0(summary.expired) + n0(summary.depleted)} blocked`, 'Expired or depleted approved', (n0(summary.expired) + n0(summary.depleted)) ? 'alert' : '')
        ]).join('');
    if(!items.length){ $('#sampleList').innerHTML='<div class="empty">No samples found.</div>'; return; }
    const today = new Date(); today.setHours(0,0,0,0);
    const isStaff = isLabStaffRole(ME.role);
    $('#sampleList').innerHTML = `
      <div class="p-inv-row p-inv-head">
        <div style="flex:2;">Sample</div>
        <div style="flex:1;">Type · Location</div>
        <div style="flex:1;">Qty</div>
        <div style="flex:1;">Expiry</div>
        <div style="width:220px;"></div>
      </div>
      ${items.map(s=>{
        const exp = s.expiry_date ? new Date(s.expiry_date) : null;
        const days = exp ? Math.round((exp-today)/86400000) : null;
        const expStyle = days===null ? '' : days<0 ? 'color:#dc2626;font-weight:600;' : days<=30 ? 'color:#c2410c;' : 'color:var(--fg-3);';
        const approvalClass = s.approval_status==='approved' ? 'p-tag-ok' : s.approval_status==='denied' ? 'p-tag-warn' : 'p-tag-info';
        const lifecycleClass = s.status==='active' ? 'p-tag-ok' : s.status==='depleted' ? 'p-tag-warn' : 'p-tag-outline';
        const approvalMeta = s.approval_status==='approved'
          ? `${s.approved_by_name ? `Approved by ${s.approved_by_name}` : 'Approved'}${s.approved_at ? ` - ${fmtDT(s.approved_at)}` : ''}`
          : s.approval_status==='denied'
            ? (s.review_note || 'Needs updates before approval')
            : (Number(s.created_by_id)===Number(ME.id)
              ? 'Awaiting approval - only you and approvers can see this entry right now.'
              : 'Awaiting approval');
        return `<div class="p-inv-row">
          <div style="flex:2;">
            <div class="p-inv-name">${escapeHTML(s.name)} <span class="p-tag-sm ${approvalClass}">${escapeHTML(s.approval_status||'pending')}</span> <span class="p-tag-sm ${lifecycleClass}">${escapeHTML(s.status||'active')}</span></div>
            <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(s.project_title||'')} - ${escapeHTML(s.created_by_name||'?')}</div>
            <div style="font-size:11px;color:${s.approval_status==='approved' ? '#dbe8ff' : s.approval_status==='denied' ? '#f6ad55' : '#d7e5fb'};font-weight:600;margin-top:3px;">${escapeHTML(approvalMeta)}</div>
          </div>
          <div style="flex:1;font-size:12px;">${escapeHTML(s.sample_type||'—')}<br><span style="font-size:11px;color:var(--fg-4);">${escapeHTML(s.location||'')}</span></div>
          <div style="flex:1;font-size:13px;">${s.qty} ${escapeHTML(s.unit||'')} ${n0(s.qty) <= 0 ? '<span class="p-tag-sm p-tag-alert">empty</span>' : ''}</div>
          <div style="flex:1;font-size:12px;${expStyle}">${s.expiry_date ? (days<0 ? `Expired ${fmtDate(s.expiry_date)}` : `${fmtDate(s.expiry_date)}`) : '—'}</div>
          <div style="width:220px;display:flex;gap:4px;flex-wrap:wrap;">
            ${canEditSampleEntry(s) ? `<button class="btn-ghost-sm" data-sample-edit="${s.id}">Edit</button>` : ''}
            ${canReview && s.approval_status!=='approved' ? `<button class="btn-ghost-sm" data-sample-approve="${s.id}">Approve</button><button class="btn-ghost-sm" data-sample-deny="${s.id}">Changes</button>` : ''}
            ${isStaff?`<button class="btn-ghost-sm" data-sample-del="${s.id}">Del</button>`:''}
          </div>
        </div>`;
      }).join('')}`;
    $('#sampleList').querySelectorAll('[data-sample-edit]').forEach(b=>b.addEventListener('click',()=>{
      const s=items.find(x=>x.id==b.dataset.sampleEdit); if(s) openSampleModal(s);
    }));
    $('#sampleList').querySelectorAll('[data-sample-approve]').forEach(b=>b.addEventListener('click', async ()=>{
      const sample = items.find(x=>x.id==b.dataset.sampleApprove);
      if(!sample) return;
      try { await reviewSampleEntry(sample, 'approved'); }
      catch(err){ alert(err.message); }
    }));
    $('#sampleList').querySelectorAll('[data-sample-deny]').forEach(b=>b.addEventListener('click', async ()=>{
      const sample = items.find(x=>x.id==b.dataset.sampleDeny);
      if(!sample) return;
      try { await reviewSampleEntry(sample, 'denied'); }
      catch(err){ alert(err.message); }
    }));
    $('#sampleList').querySelectorAll('[data-sample-del]').forEach(b=>b.addEventListener('click',async()=>{
      if(!confirm('Delete this sample?')) return;
      try { await api(`/api/samples/${b.dataset.sampleDel}`,{method:'DELETE'}); loadSamples(); }
      catch(err){ alert(err.message); }
    }));
  } catch(e){ $('#sampleList').innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`; }
}
$('#sampleSearch').addEventListener('input', e=>{ SAMPLE_QUERY=e.target.value; loadSamples(); });
$('#sampleStatus').addEventListener('change', e=>{ SAMPLE_STATUS=e.target.value; loadSamples(); });
$('#sampleApproval').addEventListener('change', e=>{ SAMPLE_APPROVAL=e.target.value; loadSamples(); });
$('#sampleExpiringSoon').addEventListener('change', e=>{ SAMPLE_EXPIRING_SOON=e.target.checked; if(e.target.checked) { SAMPLE_EXPIRED = false; $('#sampleExpired').checked = false; } loadSamples(); });
$('#sampleExpired').addEventListener('change', e=>{ SAMPLE_EXPIRED=e.target.checked; if(e.target.checked) { SAMPLE_EXPIRING_SOON = false; $('#sampleExpiringSoon').checked = false; } loadSamples(); });
$('#sampleLowQty').addEventListener('change', e=>{ SAMPLE_LOW_QTY=e.target.checked; loadSamples(); });
$('#addSampleBtn').addEventListener('click', ()=>openSampleModal());

async function openSampleModal(s){
  const isEdit=!!s;
  const canReview = isSiteModeratorRole(ME.role);
  if(isEdit && !canEditSampleEntry(s)) { alert('Approved samples can only be edited by an admin, professor, or moderator.'); return; }
  let projs=[];
  try { projs = await api('/api/projects'); } catch(_){}
  modal(`<h2>${isEdit?'Edit sample':'New sample'}</h2>
    ${!canReview ? `<p style="font-size:12px;color:var(--fg-3);margin-top:-4px;">Your sample stays hidden until approved by an admin, professor, or moderator.</p>` : ''}
    ${isEdit && s?.approval_status==='denied' && s?.review_note ? `<div class="p-card" style="margin-bottom:10px;background:#fff7ed;border-color:#fdba74;"><div style="font-size:12px;color:#9a3412;"><strong>Reviewer note:</strong> ${escapeHTML(s.review_note)}</div></div>` : ''}
    <label>Name<input id="smName" value="${escapeHTML(s?.name||'')}"></label>
    <label>Type<select id="smType">
      ${['solid','liquid','gas','biological','chemical','other'].map(t=>`<option value="${t}" ${s?.sample_type===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>Location (freezer / shelf / cabinet)<input id="smLoc" value="${escapeHTML(s?.location||'')}"></label>
    <label>Project<select id="smProj"><option value="">— none —</option>${projs.map(p=>`<option value="${p.id}" ${s?.project_id==p.id?'selected':''}>${escapeHTML(p.title)}</option>`).join('')}</select></label>
    <label>Qty<input id="smQty" type="number" step="0.001" value="${s?.qty??1}"></label>
    <label>Unit<input id="smUnit" value="${escapeHTML(s?.unit||'mL')}" placeholder="mL / g / vial…"></label>
    <label>Expiry date<input id="smExp" type="date" value="${s?.expiry_date||''}"></label>
    <label>Status<select id="smSt">
      ${['active','depleted','disposed','archived'].map(t=>`<option value="${t}" ${s?.status===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>Description<textarea id="smDesc">${escapeHTML(s?.description||'')}</textarea></label>
    <label>Handling notes<textarea id="smNotes">${escapeHTML(s?.notes||'')}</textarea></label>`,
    async()=>{
      const body={name:$('#smName').value.trim(), sample_type:$('#smType').value, location:$('#smLoc').value,
        project_id:$('#smProj').value||null, qty:Number($('#smQty').value)||0, unit:$('#smUnit').value||'mL',
        expiry_date:$('#smExp').value||null, status:$('#smSt').value, description:$('#smDesc').value, notes:$('#smNotes').value};
      if(!body.name) throw new Error('Name required');
      if(isEdit) await api('/api/samples/'+s.id,{method:'PUT',body});
      else await api('/api/samples',{method:'POST',body});
      loadSamples();
      loadDashboard();
    });
}

/* ---------- Lab Notebook ---------- */
let NOTEBOOK_QUERY='';
async function loadNotebook(){
  try {
  const isStaff = isLabStaffRole(ME.role);
    const qs = new URLSearchParams();
    if(!isStaff) qs.set('mine','1');
    if(NOTEBOOK_QUERY) qs.set('search',NOTEBOOK_QUERY);
    const entries = await api('/api/lab-notebooks?'+qs);
    if(!entries.length){ $('#notebookList').innerHTML='<div class="empty">No notebook entries found.</div>'; return; }
    const STATUS_COLOR = {draft:'var(--fg-4)', complete:'var(--status-ok)', reviewed:'var(--gold-700)'};
    $('#notebookList').innerHTML = entries.map(n=>`
      <div class="p-card" style="margin-bottom:12px;cursor:pointer;" data-nb-open="${n.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="font-weight:600;font-size:15px;">${escapeHTML(n.title)}</div>
            <div style="font-size:12px;color:var(--fg-3);margin-top:2px;">
              ${fmtDate(n.experiment_date)} · ${escapeHTML(n.author_name||'?')}
              ${n.project_title?`· ${escapeHTML(n.project_title)}`:''}
            </div>
            ${n.tags?`<div style="margin-top:4px;">${n.tags.split(',').map(t=>`<span style="font-size:11px;background:var(--bg-2);padding:2px 6px;border-radius:10px;margin-right:4px;">${escapeHTML(t.trim())}</span>`).join('')}</div>`:''}
          </div>
          <span style="font-size:11px;color:${STATUS_COLOR[n.status]||'var(--fg-4)'};">${escapeHTML(n.status)}</span>
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--fg-3);white-space:pre-wrap;max-height:60px;overflow:hidden;">${escapeHTML((n.content||'').slice(0,200))}${(n.content||'').length>200?'…':''}</div>
      </div>`).join('');
    $('#notebookList').querySelectorAll('[data-nb-open]').forEach(card=>{
      card.addEventListener('click', async()=>{
        const n = entries.find(x=>x.id==card.dataset.nbOpen); if(!n) return;
        openNotebookModal(n);
      });
    });
  } catch(e){ $('#notebookList').innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`; }
}
$('#notebookSearch').addEventListener('input', e=>{ NOTEBOOK_QUERY=e.target.value; loadNotebook(); });
$('#addNotebookBtn').addEventListener('click', ()=>openNotebookModal());

async function openNotebookModal(n){
  const isEdit=!!n;
  const today = new Date().toISOString().slice(0,10);
  let projs=[];
  try { projs = await api('/api/projects'); } catch(_){}
  modal(`<h2>${isEdit?'Edit entry':'New notebook entry'}</h2>
    <label>Title<input id="nbTitle" value="${escapeHTML(n?.title||'')}"></label>
    <label>Experiment date<input id="nbDate" type="date" value="${n?.experiment_date||today}"></label>
    <label>Project<select id="nbProj"><option value="">— none —</option>${projs.map(p=>`<option value="${p.id}" ${n?.project_id==p.id?'selected':''}>${escapeHTML(p.title)}</option>`).join('')}</select></label>
    <label>Tags (comma-separated)<input id="nbTags" value="${escapeHTML(n?.tags||'')}" placeholder="protocol, measurement, synthesis…"></label>
    <label>Status<select id="nbSt">
      ${['draft','complete','reviewed'].map(t=>`<option value="${t}" ${n?.status===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>Notes / observations<textarea id="nbContent" style="min-height:160px;">${escapeHTML(n?.content||'')}</textarea></label>`,
    async()=>{
      const body={title:$('#nbTitle').value.trim(), experiment_date:$('#nbDate').value,
        project_id:$('#nbProj').value||null, tags:$('#nbTags').value,
        status:$('#nbSt').value, content:$('#nbContent').value};
      if(!body.title||!body.experiment_date) throw new Error('Title and date required');
      if(isEdit) await api('/api/lab-notebooks/'+n.id,{method:'PUT',body});
      else await api('/api/lab-notebooks',{method:'POST',body});
      loadNotebook();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delNb">Delete</button>` : '');
  if(isEdit){
    $('#delNb').addEventListener('click', async()=>{
      if(!confirm('Delete this notebook entry?')) return;
      try { await api('/api/lab-notebooks/'+n.id,{method:'DELETE'}); closeModal(); loadNotebook(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Training & Certifications ---------- */
let TRAINING_USER='', TRAINING_TYPE='', TRAINING_EXPIRING=false, TRAINING_EXPIRED=false, TRAINING_QUERY='';
async function loadTraining(){
  try {
    // populate user filter
    let users=[];
    try { users = await api('/api/users'); } catch(_){}
    const uSel = $('#trainingUserFilter');
    const curU = TRAINING_USER || uSel.value;
    uSel.innerHTML = '<option value="">All members</option>' + users.map(u=>`<option value="${u.id}" ${u.id==curU?'selected':''}>${escapeHTML(u.name||u.username)}</option>`).join('');

    const res = await api('/api/training?' + buildQS({
      user_id: TRAINING_USER,
      training_type: TRAINING_TYPE,
      expiring_soon: TRAINING_EXPIRING,
      expired: TRAINING_EXPIRED,
      search: TRAINING_QUERY
    }));
    const records = unwrap(res);
    const summary = summaryOf(res);
  const isStaff = isLabStaffRole(ME.role);
    const today = new Date(); today.setHours(0,0,0,0);
    $('#trainingSummary').innerHTML = [
      statCard(n0(summary.total), 'Training records'),
      statCard(`${n0(summary.members)} members`, 'People covered'),
      statCard(`${n0(summary.expiring_soon)} expiring`, 'Needs renewal soon', n0(summary.expiring_soon) ? 'warn' : ''),
      statCard(`${n0(summary.expired)} expired`, 'Expired certifications', n0(summary.expired) ? 'alert' : '')
    ].join('');
    if(!records.length){ $('#trainingList').innerHTML='<div class="empty">No training records found.</div>'; return; }
    $('#trainingList').innerHTML = `
      <div class="p-inv-row p-inv-head">
        <div style="flex:2;">Training / Certification</div>
        <div style="flex:1;">Member</div>
        <div style="flex:1;">Equipment</div>
        <div style="flex:1;">Completed · Expires</div>
        ${isStaff?'<div style="width:80px;"></div>':''}
      </div>
      ${records.map(r=>{
        const exp = r.expires_at ? new Date(r.expires_at) : null;
        const days = exp ? Math.round((exp-today)/86400000) : null;
        const expStyle = days===null ? '' : days<0 ? 'color:#dc2626;font-weight:600;' : days<=60 ? 'color:#c2410c;' : '';
        return `<div class="p-inv-row">
          <div style="flex:2;">
            <div class="p-inv-name">${escapeHTML(r.training_name)} <span class="p-tag-sm ${days!==null && days<0?'p-tag-alert':days!==null && days<=60?'p-tag-warn':'p-tag-ok'}">${days===null?'no expiry':days<0?'expired':'active'}</span></div>
            <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(r.training_type)}${r.certified_by?` · cert. by ${escapeHTML(r.certified_by)}`:''}</div>
          </div>
          <div style="flex:1;font-size:13px;">${escapeHTML(r.user_name||r.username||'?')}</div>
          <div style="flex:1;font-size:12px;color:var(--fg-3);">${escapeHTML(r.equipment_name||'—')}</div>
          <div style="flex:1;font-size:12px;">
            <div>${fmtDate(r.completed_at)}</div>
            <div style="${expStyle}">${r.expires_at ? (days<0?`⚠ Expired ${fmtDate(r.expires_at)}`:`Exp ${fmtDate(r.expires_at)}`) : 'No expiry'}</div>
          </div>
          ${isStaff?`<div style="width:80px;display:flex;gap:4px;">
            <button class="btn-ghost-sm" data-tr-edit="${r.id}">Edit</button>
            <button class="btn-ghost-sm" data-tr-del="${r.id}">Del</button>
          </div>`:''}
        </div>`;
      }).join('')}`;
    if(isStaff){
      $('#trainingList').querySelectorAll('[data-tr-edit]').forEach(b=>b.addEventListener('click',()=>{
        const r=records.find(x=>x.id==b.dataset.trEdit); if(r) openTrainingModal(r);
      }));
      $('#trainingList').querySelectorAll('[data-tr-del]').forEach(b=>b.addEventListener('click',async()=>{
        if(!confirm('Delete this record?')) return;
        try { await api(`/api/training/${b.dataset.trDel}`,{method:'DELETE'}); loadTraining(); }
        catch(err){ alert(err.message); }
      }));
    }
  } catch(e){ $('#trainingList').innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`; }
}
$('#trainingUserFilter').addEventListener('change', e=>{ TRAINING_USER=e.target.value; loadTraining(); });
$('#trainingTypeFilter').addEventListener('change', e=>{ TRAINING_TYPE=e.target.value; loadTraining(); });
$('#trainingExpiringFilter').addEventListener('change', e=>{ TRAINING_EXPIRING=e.target.checked; if(e.target.checked) { TRAINING_EXPIRED = false; $('#trainingExpiredFilter').checked = false; } loadTraining(); });
$('#trainingExpiredFilter').addEventListener('change', e=>{ TRAINING_EXPIRED=e.target.checked; if(e.target.checked) { TRAINING_EXPIRING = false; $('#trainingExpiringFilter').checked = false; } loadTraining(); });
$('#trainingSearch').addEventListener('input', e=>{ TRAINING_QUERY=e.target.value; loadTraining(); });
$('#addTrainingBtn').addEventListener('click', ()=>openTrainingModal());

async function openTrainingModal(r){
  const isEdit=!!r;
  let users=[], equip=[];
  try { [users, equip] = await Promise.all([api('/api/users'), api('/api/equipment').then(unwrap)]); } catch(_){}
  modal(`<h2>${isEdit?'Edit':'Add'} training record</h2>
    <label>Member<select id="trUser">
      <option value="">— select —</option>
      ${users.map(u=>`<option value="${u.id}" ${r?.user_id==u.id?'selected':''}>${escapeHTML(u.name||u.username)}</option>`).join('')}
    </select></label>
    <label>Training name<input id="trName" value="${escapeHTML(r?.training_name||'')}"></label>
    <label>Type<select id="trType">
      ${['equipment','safety','chemical','lab','other'].map(t=>`<option value="${t}" ${r?.training_type===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>Related equipment (optional)<select id="trEquip">
      <option value="">— none —</option>
      ${equip.map(e=>`<option value="${e.id}" ${r?.equipment_id==e.id?'selected':''}>${escapeHTML(e.name)}</option>`).join('')}
    </select></label>
    <label>Completed date<input id="trComp" type="date" value="${r?.completed_at||''}"></label>
    <label>Expiry date<input id="trExp" type="date" value="${r?.expires_at||''}"></label>
    <label>Certified by<input id="trCert" value="${escapeHTML(r?.certified_by||'')}"></label>
    <label>Notes<textarea id="trNotes">${escapeHTML(r?.notes||'')}</textarea></label>`,
    async()=>{
      const body={user_id:$('#trUser').value, training_name:$('#trName').value.trim(),
        training_type:$('#trType').value, equipment_id:$('#trEquip').value||null,
        completed_at:$('#trComp').value, expires_at:$('#trExp').value||null,
        certified_by:$('#trCert').value, notes:$('#trNotes').value};
      if(!body.user_id||!body.training_name||!body.completed_at) throw new Error('Member, name, and date required');
      if(isEdit) await api('/api/training/'+r.id,{method:'PUT',body});
      else await api('/api/training',{method:'POST',body});
      loadTraining();
    });
}

/* ---------- Issues ---------- */
let ISSUE_FILTER='open';
async function loadIssues(){
  try {
    const q = ($('#issueSearch')||{}).value || '';
    const cat = ($('#issueCatFilter')||{}).value || '';
    const pri = ($('#issuePriFilter')||{}).value || '';
    const qs = new URLSearchParams();
    if(ISSUE_FILTER==='open') qs.set('status','open');
    if(q) qs.set('query', q);
    if(cat) qs.set('category', cat);
    if(pri) qs.set('priority', pri);
    const issues = unwrap(await api('/api/issues?' + qs.toString()));
    // Update sidebar badge
    if(ISSUE_FILTER==='open' && !q && !cat && !pri){
      const badge = $('#issuesBadge');
      if(badge) badge.textContent = issues.length || '';
    }
    if(!issues.length){ $('#issueList').innerHTML='<div class="empty">No issues to show.</div>'; return; }
    $('#issueList').innerHTML = issues.map(it => `
      <div class="p-issue-card priority-${escapeHTML(it.priority||'medium')}">
        <div class="p-issue-head">
          <div>
            <span class="p-tag-sm ${{open:'p-tag-warn',in_progress:'p-tag-info',resolved:'p-tag-ok'}[it.status]||'p-tag-outline'}">${escapeHTML((it.status||'').replace('_',' '))}</span>
            <span class="p-tag-sm p-tag-outline">${escapeHTML(it.category||'')}</span>
            <span class="p-tag-sm p-tag-outline">${escapeHTML(it.priority||'')}</span>
          </div>
          <button class="btn-ghost-sm" data-issue-id="${it.id}" data-act="open">Open</button>
        </div>
        <div class="p-issue-title">${escapeHTML(it.title)}</div>
        ${(body => `<div class="p-issue-body">${escapeHTML(body.slice(0,200))}${body.length>200?'...':''}</div>`)(it.body||'')}
        <div class="p-issue-meta">Reported by ${escapeHTML(it.reporter_name||it.reporter_username||'?')} - ${fmtDT(it.created_at)}${it.equipment_name?' - re: '+escapeHTML(it.equipment_name):''}</div>
      </div>`).join('');
  } catch(e){ $('#issueList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
// Debounced search input
let _issueDebounce;
function onIssueSearch(){ clearTimeout(_issueDebounce); _issueDebounce = setTimeout(loadIssues, 300); }
document.addEventListener('input', e => {
  if(e.target.id==='issueSearch' || e.target.id==='issueCatFilter' || e.target.id==='issuePriFilter') onIssueSearch();
});
$('#issueFilter').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  $$('#issueFilter button').forEach(x=>x.classList.toggle('active', x===b));
  ISSUE_FILTER = b.dataset.filter; loadIssues();
});
$('#addIssueBtn').addEventListener('click', () => openIssueModal());
$('#requestSupplyBtn').addEventListener('click', () => openIssueModal({ category:'supplies' }));
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-issue-id][data-act="open"]'); if(!b) return;
  try {
    const issues = unwrap(await api('/api/issues'));
    const it = issues.find(x => x.id == b.dataset.issueId);
    if(it) openIssueDetail(it);
  } catch(err){ alert(err.message); }
});

async function openIssueModal(opts = {}){
  let equipment=[];
  try { equipment = unwrap(await api('/api/equipment')); } catch(e){}
  const isSupplyRequest = (opts.category || '') === 'supplies';
  const inventory = opts.inventory || null;
  const defaultTitle = opts.title || (inventory ? `Supply request: ${inventory.name}` : '');
  const defaultDesc = opts.description || '';
  modal(`<h2>Report an issue or request</h2>
    <label>Title<input id="iTitle" placeholder="Short summary…" value="${escapeHTML(defaultTitle)}"></label>
    <label>Category<select id="iCat">
      <option value="equipment" ${!isSupplyRequest ? 'selected' : ''}>Equipment</option>
      <option value="supplies" ${isSupplyRequest ? 'selected' : ''}>Supplies</option>
      <option value="facility">Facility</option>
      <option value="safety">Safety</option>
      <option value="other">Other</option>
    </select></label>
    <label>Priority<select id="iPri">
      <option value="low">Low</option>
      <option value="normal" ${!isSupplyRequest ? 'selected' : ''}>Normal</option>
      <option value="high" ${isSupplyRequest ? 'selected' : ''}>High</option>
    </select></label>
    <label id="iEqWrap">Related equipment (optional)<select id="iEq"><option value="">-</option>
      ${equipment.map(e=>`<option value="${e.id}">${escapeHTML(e.name)} (${escapeHTML(e.sku||'')})</option>`).join('')}
    </select></label>
    <div id="iSupplyFields" style="${isSupplyRequest ? '' : 'display:none;'}">
      <label>Requested quantity<input id="iQty" placeholder="e.g. 2 boxes or 500 mL"></label>
      <label>Preferred supplier<input id="iSupplier" value="${escapeHTML(inventory?.supplier_name || '')}" placeholder="Vendor name"></label>
      <label>Part / catalog #<input id="iPart" value="${escapeHTML(inventory?.sku || '')}" placeholder="Catalog number or SKU"></label>
      <label>Order / quote # (optional)<input id="iOrderRef" placeholder="PO, quote, or order reference"></label>
      <label>Reference URL (optional)<input id="iItemUrl" type="url" value="${escapeHTML(inventory?.reorder_url || '')}" placeholder="https://…"></label>
    </div>
    <label>Description<textarea id="iDesc" placeholder="What happened? What's needed?">${escapeHTML(defaultDesc)}</textarea></label>`,
    async () => {
      const category = $('#iCat').value;
      const supplyLines = [];
      if(category === 'supplies'){
        if(inventory?.name) supplyLines.push(`Inventory item: ${inventory.name}`);
        if($('#iQty').value.trim()) supplyLines.push(`Requested quantity: ${$('#iQty').value.trim()}`);
        if($('#iSupplier').value.trim()) supplyLines.push(`Preferred supplier: ${$('#iSupplier').value.trim()}`);
        if($('#iPart').value.trim()) supplyLines.push(`Part / catalog #: ${$('#iPart').value.trim()}`);
        if($('#iOrderRef').value.trim()) supplyLines.push(`Order / quote #: ${$('#iOrderRef').value.trim()}`);
        if($('#iItemUrl').value.trim()) supplyLines.push(`Reference URL: ${$('#iItemUrl').value.trim()}`);
      }
      const details = $('#iDesc').value.trim();
      const body = {
        title: $('#iTitle').value.trim(),
        category,
        priority: $('#iPri').value,
        related_equipment_id: category === 'equipment' ? ($('#iEq').value || null) : null,
        body: category === 'supplies'
          ? [...supplyLines, details ? '' : null, details || null].filter(v => v !== null).join('\n')
          : $('#iDesc').value
      };
      if(!body.title) body.title = category === 'supplies' ? 'Supply request' : '';
      if(!body.title) throw new Error('Title required');
      await api('/api/issues',{method:'POST', body});
      loadIssues(); loadDashboard();
    });
  const syncIssueModalFields = () => {
    const isSupplies = $('#iCat').value === 'supplies';
    $('#iSupplyFields').style.display = isSupplies ? '' : 'none';
    $('#iEqWrap').style.display = isSupplies ? 'none' : '';
  };
  $('#iCat').addEventListener('change', syncIssueModalFields);
  syncIssueModalFields();
}

async function openIssueDetail(it){
  let comments=[];
  try { comments = await api('/api/issues/'+it.id+'/comments'); } catch(e){}
  const isStaff = isLabStaffRole(ME.role);
  modal(`<h2>${escapeHTML(it.title)}</h2>
    <div class="p-issue-meta">${escapeHTML(it.category)} · ${escapeHTML(it.priority||'')} · reported by ${escapeHTML(it.reporter_name||'?')} on ${fmtDT(it.created_at)}</div>
    <div class="p-issue-body" style="margin-top:12px;">${escapeHTML(it.body||'')}</div>
    ${isStaff?`<label>Status<select id="iStatus">
      ${['open','in_progress','resolved'].map(s=>`<option value="${s}" ${it.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
    </select></label>`:''}
    <div class="p-issue-comments">
      <div class="p-card-title" style="margin-bottom:8px;">Comments</div>
      <div id="iComments">${comments.length?comments.map(c=>`
        <div class="p-comment">
          <div class="p-comment-meta">${escapeHTML(c.user_name||c.username||'?')} · ${fmtDT(c.created_at)}</div>
          <div>${escapeHTML(c.body)}</div>
        </div>`).join(''):'<div class="empty">No comments yet.</div>'}
      </div>
      <label style="margin-top:14px;">Add comment<textarea id="iCmtNew" placeholder="Reply…"></textarea></label>
      <button class="p-bigbtn ghost" id="iCmtBtn" style="margin-top:8px;">Post</button>
    </div>`,
    isStaff ? async () => {
      const body = { status: $('#iStatus').value };
      await api('/api/issues/'+it.id,{method:'PUT', body});
      loadIssues(); loadDashboard();
    } : null,
    isStaff ? `<button type="button" class="p-bigbtn danger" id="iDel">Delete</button>` : '',
    isStaff ? 'Save' : 'Close');
  $('#iCmtBtn').addEventListener('click', async () => {
    const body = $('#iCmtNew').value.trim(); if(!body) return;
    try { await api('/api/issues/'+it.id+'/comments',{method:'POST', body:{body}});
      const cs = await api('/api/issues/'+it.id+'/comments');
      $('#iComments').innerHTML = cs.map(c=>`
        <div class="p-comment">
          <div class="p-comment-meta">${escapeHTML(c.user_name||c.username||'?')} · ${fmtDT(c.created_at)}</div>
          <div>${escapeHTML(c.body)}</div>
        </div>`).join('');
      $('#iCmtNew').value='';
    } catch(err){ alert(err.message); }
  });
  if(isStaff){
    $('#iDel').addEventListener('click', async () => {
      if(!confirm('Delete this issue?')) return;
      try { await api('/api/issues/'+it.id,{method:'DELETE'}); closeModal(); loadIssues(); }
      catch(err){ alert(err.message); }
    });
  }
}

/* ---------- Profile ---------- */
async function loadProfile(){
  setAvatarContent($('#profAv'), ME);
  $('#profName').textContent = ME.name || ME.username;
  $('#profRole').textContent = (ME.role || '').toUpperCase();
  $('#profEmail').textContent = ME.email || `@${ME.username}`;
  try {
    const tasks = await api('/api/tasks/full?mine=1');
    const open = tasks.filter(t => t.status !== 'done');
    $('#profTasks').innerHTML = open.length ? open.map(t=>`
      <div class="p-task">
        <input class="p-check" type="checkbox" disabled>
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(t.title)}</div>
          <div class="p-task-due">${t.due_date?'Due '+fmtDate(t.due_date):'No due'} · ${escapeHTML(t.status)}</div>
        </div>
      </div>`).join('') : '<div class="empty">No open tasks.</div>';
  } catch(e){ $('#profTasks').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
  try {
    const eq = unwrap(await api('/api/equipment'));
    const mine = eq.filter(x => x.current_user_id === ME.id);
    $('#profEquip').innerHTML = mine.length ? mine.map(x=>`
      <div class="p-task">
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(x.name)}</div>
          <div class="p-task-due">SKU ${escapeHTML(x.sku||'—')} · since ${fmtDT(x.last_used_at)}</div>
        </div>
        <button class="btn-ghost-sm" data-checkin-id="${x.id}">Return</button>
      </div>`).join('') : '<div class="empty">Nothing checked out.</div>';
  } catch(e){ $('#profEquip').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
  loadTwoFaCard();
}

async function loadTwoFaCard(){
  const card = $('#twoFaCard');
  if(!card) return;
  try {
    const me = await api('/api/me');
    if(me.totp_enabled){
      const bcResp = await api('/api/me/totp/backup-codes').catch(()=>({ remaining: '?' }));
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--border-1);">
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--status-ok);">✔ 2FA is enabled</div>
            <div style="font-size:12px;color:var(--fg-3);">Backup codes remaining: <strong>${bcResp.remaining}</strong></div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-ghost-sm" id="regenCodesBtn">New backup codes</button>
            <button class="btn-ghost-sm" style="color:#dc2626;" id="disable2faBtn">Disable 2FA</button>
          </div>
        </div>`;
      $('#regenCodesBtn').addEventListener('click', async () => {
        if(!confirm('Generate 10 new backup codes? Your old codes will stop working.')) return;
        try {
          const r = await api('/api/me/totp/backup-codes', {method:'POST', body:{}});
          showBackupCodes(r.backup_codes);
          loadTwoFaCard();
        } catch(e){ alert(e.message); }
      });
      $('#disable2faBtn').addEventListener('click', () => {
        modal(`<h2>Disable two-factor authentication</h2>
          <p style="font-size:13px;color:var(--fg-3);">Enter your current password to confirm.</p>
          <label>Password<input id="dis2faPw" type="password" autocomplete="current-password"></label>`,
          async () => {
            await api('/api/me/totp', {method:'DELETE', body:{password:$('#dis2faPw').value}});
            loadTwoFaCard();
          });
      });
    } else {
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;">
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--fg-2);">2FA is not enabled</div>
            <div style="font-size:12px;color:var(--fg-3);">Add an extra layer of security with an authenticator app (Google Authenticator, Authy, etc.).</div>
          </div>
          <button class="btn-ghost-sm" id="enable2faBtn">Enable 2FA</button>
        </div>`;
      $('#enable2faBtn').addEventListener('click', async () => {
        try {
          const setup = await api('/api/me/totp/setup', {method:'POST', body:{}});
          modal(`<h2>Enable two-factor authentication</h2>
            <p style="font-size:13px;color:var(--fg-3);">Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div style="text-align:center;margin:12px 0;"><img src="${escapeHTML(setup.qr)}" style="width:180px;height:180px;border:1px solid var(--border-1);border-radius:var(--radius-sm);"></div>
            <details style="margin-bottom:12px;"><summary style="font-size:11px;color:var(--fg-4);cursor:pointer;">Manual entry key</summary><code style="font-size:12px;user-select:all;">${escapeHTML(setup.secret)}</code></details>
            <label>6-digit code<input id="totpVerify" type="text" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"></label>`,
            async () => {
              const result = await api('/api/me/totp/verify', {method:'POST', body:{code:$('#totpVerify').value}});
              showBackupCodes(result.backup_codes);
              loadTwoFaCard();
            });
        } catch(e){ alert(e.message); }
      });
    }
  } catch(e){ card.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}

function showBackupCodes(codes){
  modal(`<h2>Your backup codes</h2>
    <p style="font-size:13px;color:var(--fg-3);">Save these codes somewhere safe. Each code can only be used <strong>once</strong>. You can use them instead of your authenticator app if you lose access.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0;font-family:monospace;font-size:14px;">
      ${(codes||[]).map(c=>`<div style="padding:8px;background:var(--bg-2);border-radius:var(--radius-sm);text-align:center;">${escapeHTML(c)}</div>`).join('')}
    </div>
    <p style="font-size:11px;color:var(--status-alert);">These codes will not be shown again. Copy or print them now.</p>`,
    null, '', 'Close');
}
$('#profEditBtn').addEventListener('click', () => {
  modal(`<h2>Edit my details</h2>
    <label>Display name<input id="meName" value="${escapeHTML(ME.name||'')}"></label>
    <label>Email<input id="meEmail" value="${escapeHTML(ME.email||'')}"></label>
    <p style="font-size:12px;color:var(--fg-3);">Role and username are managed by an admin.</p>`,
    async () => {
      const body = { name: $('#meName').value.trim(), email: $('#meEmail').value.trim() };
      await api('/api/me/profile', {method:'PUT', body});
      ME.name = body.name; ME.email = body.email;
      $('#userName').textContent = ME.name || ME.username;
      setAvatarContent($('#userAv'), ME);
      loadProfile();
    });
});
$('#profDmToggle').addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dm');
  localStorage.setItem('latfs-theme', isDark ? 'dark' : 'light');
});
$('#profChPwBtn').addEventListener('click', () => {
  modal(`<h2>Change password</h2>
    <label>Current password<input id="cpCur" type="password" autocomplete="current-password"></label>
    <label>New password (min 12 chars)<input id="cpNew" type="password" autocomplete="new-password"></label>
    <label>Confirm new password<input id="cpConf" type="password" autocomplete="new-password"></label>`,
    async () => {
      const cur = $('#cpCur').value, np = $('#cpNew').value, conf = $('#cpConf').value;
      if(!cur || !np) throw new Error('All fields are required');
      if(np !== conf) throw new Error('New passwords do not match');
      if(np.length < 12) throw new Error('New password must be at least 12 characters');
      await api('/api/me/password', {method:'PUT', body:{current_password: cur, new_password: np}});
      alert('Password changed successfully.');
    });
});

/* ---------- Lab members (staff only) ---------- */
async function loadUsers(){
  try {
    const users = await api('/api/users');
    if(!users.length){ $('#usersList').innerHTML='<div class="empty">No members.</div>'; return; }
    $('#usersList').innerHTML = users.map(u=>`
      <div class="p-inv-row">
        <div style="flex:2;">
          <div class="p-inv-name">${escapeHTML(u.name||u.username)}</div>
          <div style="font-size:11px;color:var(--fg-4);">@${escapeHTML(u.username)} · ${escapeHTML(u.email||'')}</div>
        </div>
        <div style="flex:1;"><span class="p-tag-sm p-tag-outline">${escapeHTML(u.role||'')}</span></div>
        <div style="flex:1;color:var(--fg-3);font-size:12px;">${u.active?'active':'<span style="color:#dc2626;">disabled</span>'}</div>
        <div style="width:200px;display:flex;gap:6px;">
          <button class="btn-ghost-sm" data-user-edit="${u.id}">Edit</button>
          ${u.id !== ME.id ? `<button class="btn-ghost-sm" data-user-pw="${u.id}">Reset PW</button>` : ''}
          ${u.id !== ME.id && ME.role==='admin' ? `<button class="btn-ghost-sm" data-user-del="${u.id}">Disable</button>` : ''}
        </div>
      </div>`).join('');
  } catch(e){ $('#usersList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
$('#addUserBtn').addEventListener('click', () => openUserModal());
document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-user-edit]');
  const pw = e.target.closest('[data-user-pw]');
  const dl = e.target.closest('[data-user-del]');
  if(ed){ try { const u=(await api('/api/users')).find(x=>x.id==ed.dataset.userEdit); if(u) openUserModal(u); } catch(err){ alert(err.message); } }
  if(pw){
    const userId = pw.dataset.userPw;
    modal(`<h2>Reset password</h2>
      <label>New password (min 12 chars)<input id="pwNew" type="password" autocomplete="new-password" minlength="12" placeholder="Minimum 12 characters"></label>
      <label>Confirm new password<input id="pwConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></label>`,
      async () => {
        const np = $('#pwNew').value;
        const nc = $('#pwConfirm').value;
        if(!np || np.length < 12) throw new Error('Password must be at least 12 characters');
        if(np !== nc) throw new Error('Passwords do not match');
        await api('/api/users/'+userId,{method:'PUT', body:{password:np}});
        alert('Password reset successfully');
      });
  }
  if(dl){ if(!confirm('Disable this account?')) return;
    try { await api('/api/users/'+dl.dataset.userDel,{method:'DELETE'}); loadUsers(); } catch(err){ alert(err.message); } }
});
function openUserModal(u){
  const isEdit = !!u;
  modal(`<h2>${isEdit?'Edit member':'Add lab member'}</h2>
    <label>Username (for login)<input id="uUsr" value="${escapeHTML(u?.username||'')}" ${isEdit?'readonly':''}></label>
    <label>Display name<input id="uName" value="${escapeHTML(u?.name||'')}"></label>
    <label>Email<input id="uEmail" value="${escapeHTML(u?.email||'')}"></label>
    <label>Role<select id="uRole">
      ${['admin','professor','moderator','postdoc','student'].map(r=>`<option value="${r}" ${u?.role===r?'selected':''}>${r}</option>`).join('')}
    </select></label>
    ${!isEdit?`<label>Initial password (min 12)<input id="uPw" type="text" value=""></label>`:''}`,
    async () => {
      const body = {
        username: $('#uUsr').value.trim(),
        name: $('#uName').value.trim(),
        email: $('#uEmail').value.trim(),
        role: $('#uRole').value
      };
      if(!isEdit){ body.password = $('#uPw').value; if(!body.password||body.password.length<12) throw new Error('Password >= 12 chars'); }
      if(isEdit) await api('/api/users/'+u.id,{method:'PUT', body});
      else await api('/api/users',{method:'POST', body});
      loadUsers();
    });
}

/* ---------- Modal helper ---------- */
function modal(bodyHTML, onSave, extraFootHTML='', saveLabel='Save'){
  const root = $('#modalMount');
  root.innerHTML = `<div class="modal-bg"><form class="modal" id="modalForm" novalidate>
    ${bodyHTML}
    <div class="modal-actions">
      ${extraFootHTML}
      <button type="button" class="p-bigbtn ghost" id="modalCancel">${onSave?'Cancel':'Close'}</button>
      ${onSave?`<button type="submit" class="p-bigbtn" data-modal-submit="1">${saveLabel}</button>`:''}
    </div>
  </form></div>`;
  $('#modalCancel').addEventListener('click', closeModal);
  $('#modalForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    if(!onSave) return;
    if(ev.submitter && !ev.submitter.hasAttribute('data-modal-submit')) return;
    try { await onSave(); closeModal(); }
    catch(err){ alert(err.message); }
  });
}
function closeModal(){ $('#modalMount').innerHTML=''; }

/* ---------- Dark mode ---------- */
(function(){
  const saved = localStorage.getItem('latfs-theme');
  if(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)){
    document.body.classList.add('dm');
  }
})();
$('#dmToggle').addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dm');
  localStorage.setItem('latfs-theme', isDark ? 'dark' : 'light');
});

/* ---------- Boot ---------- */
$('#loginForm').addEventListener('submit', doLogin);
$('#loginBackBtn').addEventListener('click', () => { $('#loginErr').textContent = ''; _resetLoginForm(); });
$('#logoutBtn').addEventListener('click', doLogout);
(async function boot(){
  if(location.protocol === 'file:'){
    showFileModeNotice();
    return;
  }
  if(await checkAuth()) showApp();
})();
