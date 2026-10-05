/* Admin: core. Loaded in order by admin.html. */

/* ===========================================================
   LATFS Platform — vanilla JS port of the React UI Kit
   =========================================================== */

let CSRF = '';
let SESSION_USER = { name: '', role: '', initials: '', first: '' };
let LAB_NAMES = {
  lab_a_name: 'Lab A',
  lab_a_room: 'Tolentine 344',
  lab_b_name: 'Lab B',
  lab_b_room: 'Mendel 270',
};
const labLabel = (ab) =>
  ab === 'A'
    ? `${LAB_NAMES.lab_a_name}${LAB_NAMES.lab_a_room ? ' · ' + LAB_NAMES.lab_a_room : ''}`
    : `${LAB_NAMES.lab_b_name}${LAB_NAMES.lab_b_room ? ' · ' + LAB_NAMES.lab_b_room : ''}`;

const $ = (s, root = document) => root.querySelector(s);
const escHtml = LabUI.escapeHTML;
const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
const fmtDT = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return d;
  return x.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
const ADMIN_SURFACE_ROLES = new Set(['admin', 'professor', 'moderator']);
const LAB_STAFF_ROLES = new Set(['admin', 'professor']);
const ALL_NAV_ITEMS = [
  ['overview', 'Overview', 'home'],
  ['content', 'Site content', 'edit-3'],
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
      ['people', 'People', 'users'],
      ['news', 'News', 'megaphone'],
      ['publications', 'Publications', 'book-open'],
      ['white-papers', 'White Papers', 'file-text'],
      ['research', 'Research', 'flask-conical'],
      ['facilities', 'Facilities', 'building-2'],
      ['hero', 'Hero / homepage', 'image'],
      ['gallery', 'Gallery', 'images'],
      ['downloads', 'Downloads', 'download'],
      ['sponsors', 'Sponsors', 'briefcase'],
      ['apps', 'Apps', 'grid'],
      ['settings', 'Settings', 'settings'],
    ];
  }
  return [
    ['news', 'News', 'megaphone'],
    ['hero', 'Hero / homepage', 'image'],
    ['gallery', 'Gallery', 'images'],
  ];
}

const api = LabHttp.createClient({ getCsrfToken: () => CSRF });
const apiGet = (p) => api(p);
const apiPost = (p, body) => api(p, { method: 'POST', body });
const apiPut = (p, body) => api(p, { method: 'PUT', body });
const apiDel = (p) => api(p, { method: 'DELETE' });
async function apiRows(p) {
  const data = await apiGet(p);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.rows)) return data.rows;
  return [];
}

async function uploadPhoto(file) {
  return uploadContentPhoto(file);
}
async function uploadDoc(file) {
  const fd = new FormData();
  fd.append('document', file);
  return api('/api/upload/document', { method: 'POST', body: fd });
}
async function uploadGallery(file, caption = '', sort_order = 0, category = 'Inside LATFS') {
  const fd = new FormData();
  fd.append('photo', file);
  fd.append('caption', caption);
  fd.append('category', category);
  fd.append('sort_order', sort_order);
  return api('/api/gallery', { method: 'POST', body: fd });
}
async function uploadHeroSlide(file, title = '', caption = '', sort_order = 0) {
  const fd = new FormData();
  fd.append('photo', file);
  fd.append('title', title);
  fd.append('caption', caption);
  fd.append('sort_order', sort_order);
  return api('/api/hero-slides', { method: 'POST', body: fd });
}
