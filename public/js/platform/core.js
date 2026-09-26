/* Platform: core. Loaded in order by platform.html. */

/* ============================================================
   LATFS Platform — vanilla JS app
   ============================================================ */
let ME = null;
let CSRF = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const escapeHTML = LabUI.escapeHTML;
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return d;
  return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDT(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return d;
  return x.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
function initials(name) {
  if (!name) return '??';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}
function setAvatarContent(el, user) {
  if (!el) return;
  const name = user?.name || user?.username || 'User';
  if (user?.photo_url) {
    const img = document.createElement('img');
    img.src = user.photo_url;
    img.alt = name;
    img.className = 'p-avatar-img';
    if (user.photo_position) img.style.objectPosition = user.photo_position;
    el.replaceChildren(img);
    el.style.background = 'rgba(212,169,66,.14)';
    return;
  }
  el.replaceChildren(document.createTextNode(initials(name)));
  el.style.background = 'var(--gold-600)';
}
function formatUsTimeZones(now = new Date()) {
  const zones = [
    ['ET', 'America/New_York'],
    ['CT', 'America/Chicago'],
    ['MT', 'America/Denver'],
    ['PT', 'America/Los_Angeles'],
    ['AK', 'America/Anchorage'],
    ['HI', 'Pacific/Honolulu'],
  ];
  return zones
    .map(([label, zone]) => {
      const value = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: zone,
      }).format(now);
      return `${label} ${value}`;
    })
    .join(' · ');
}
function formatDashboardCoastTimes(now = new Date()) {
  const east = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).format(now);
  const west = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  }).format(now);
  return `East Coast ${east} ET | West Coast ${west} PT`;
}
async function downloadFile(url, filename) {
  const resp = await fetch(url, { credentials: 'same-origin' });
  if (!resp.ok) throw new Error('Download failed');
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

const api = LabHttp.createClient({ getCsrfToken: () => CSRF });

/** Unwrap paginated list responses { total, rows } → plain array.
 *  Falls back gracefully for endpoints that still return an array directly. */
function unwrap(res) {
  return Array.isArray(res) ? res : res && res.rows ? res.rows : [];
}
function summaryOf(res) {
  return res && typeof res === 'object' && res.summary ? res.summary : {};
}
function n0(v) {
  return Number(v || 0);
}
function buildQS(values) {
  const qs = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    qs.set(key, value === true ? '1' : String(value));
  });
  return qs.toString();
}
function statCard(value, label, cls = '') {
  return `<div class="p-stat-card ${cls}"><div class="p-stat-num">${escapeHTML(value)}</div><div class="p-stat-lbl">${escapeHTML(label)}</div></div>`;
}

function platformEntryUrl() {
  return 'http://127.0.0.1:3000/platform';
}

function showFileModeNotice() {
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
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(platformEntryUrl());
        copyBtn.textContent = 'Copied';
      } catch (_) {
        copyBtn.textContent = platformEntryUrl();
      }
    });
  }
}

function isLabStaffRole(role) {
  return role === 'admin' || role === 'professor';
}

function isSiteModeratorRole(role) {
  return isLabStaffRole(role) || role === 'moderator';
}

function canApproveReservationsRole(role) {
  return role === 'professor';
}

function trainingTagMarkup(row) {
  if (!n0(row?.requires_training)) return '';
  if (row.training_state === 'active') {
    return `<span class="p-tag-sm p-tag-ok">${row.user_training_expires_at ? `clear until ${fmtDate(row.user_training_expires_at)}` : 'training clear'}</span>`;
  }
  if (row.training_state === 'expired') {
    return `<span class="p-tag-sm p-tag-warn">${row.user_training_expires_at ? `expired ${fmtDate(row.user_training_expires_at)}` : 'training expired'}</span>`;
  }
  return `<span class="p-tag-sm p-tag-alert">${escapeHTML(row.training_requirement || 'training required')}</span>`;
}

function canOperateEquipment(row) {
  return (
    !n0(row?.requires_training) ||
    n0(row?.user_active_training_count) > 0 ||
    isLabStaffRole(ME?.role)
  );
}
