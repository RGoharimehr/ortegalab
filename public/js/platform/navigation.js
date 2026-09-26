/* Platform: navigation. Loaded in order by platform.html. */

/* ---------- Mobile sidebar (hamburger) ---------- */
function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebarOverlay').classList.add('open');
  $('#hamburgerBtn').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('open');
  $('#hamburgerBtn').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
$('#hamburgerBtn').addEventListener('click', openSidebar);
$('#sidebarOverlay').addEventListener('click', closeSidebar);
// Close sidebar when nav item is clicked on mobile
document.addEventListener('click', (e) => {
  if (e.target.closest('.p-nav-item') && window.innerWidth <= 768) closeSidebar();
});

/* ---------- Routing ---------- */
function goRoute(name, { replace = false, updateHistory = true } = {}) {
  const loaders = {
    dashboard: loadDashboard,
    schedule: loadSchedule,
    tasks: loadTasks,
    meetings: loadMeetings,
    equipment: loadEquipment,
    inventory: loadInventory,
    issues: loadIssues,
    samples: loadSamples,
    'lab-notebook': loadNotebook,
    training: loadTraining,
    profile: loadProfile,
    'people-admin': loadUsers,
  };
  if (!Object.hasOwn(loaders, name) || (name === 'people-admin' && !isLabStaffRole(ME?.role)))
    name = 'dashboard';
  $$('.p-section').forEach((s) => s.classList.toggle('active', s.dataset.section === name));
  $$('.p-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.route === name);
    if (b.dataset.route === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (updateHistory && location.hash !== '#' + name) {
    history[replace ? 'replaceState' : 'pushState'](null, '', '#' + name);
  }
  loaders[name]();
}

window.addEventListener('hashchange', () => {
  if (ME) goRoute(location.hash.slice(1) || 'dashboard', { updateHistory: false });
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('.p-nav-item');
  if (t && t.dataset.route) {
    e.preventDefault();
    goRoute(t.dataset.route);
  }
});
