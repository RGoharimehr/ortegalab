/* Admin: navigation. Loaded in order by admin.html. */

/* ── Sidebar nav ───────────────────────────────────────── */
let activeRoute = 'overview';

function renderNav() {
  const items = allowedNavItems();
  if (!items.some(([id]) => id === activeRoute)) activeRoute = items[0][0];
  $('#navMain').innerHTML = items
    .map(
      ([id, label, icon]) =>
        `<button class="p-nav-item${id === activeRoute ? ' active' : ''}" data-route="${id}"${id === activeRoute ? ' aria-current="page"' : ''}>
      <i data-lucide="${icon}" class="p-nav-icon"></i><span>${label}</span>
    </button>`,
    )
    .join('');
  document.querySelectorAll('.p-sidebar [data-route]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === activeRoute);
    btn.onclick = () => navigate(btn.dataset.route);
  });
}

async function navigate(route, { replace = false, updateHistory = true } = {}) {
  const items = allowedNavItems();
  if (!items.some(([id]) => id === route)) route = 'overview';
  activeRoute = route;
  if (updateHistory && location.hash !== '#' + route) {
    history[replace ? 'replaceState' : 'pushState'](null, '', '#' + route);
  }
  renderNav();
  const main = $('#mainContent');
  main.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const renderer = ROUTES[route];
    if (!renderer) {
      main.innerHTML = '<div class="p-card"><em style="color:var(--fg-4)">Unknown route</em></div>';
      return;
    }
    await renderer(main);
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="p-card"><strong>Error loading ${escHtml(route)}:</strong> ${escHtml(e.message)}</div>`;
  }
}

window.addEventListener('hashchange', () => {
  if (canAccessAdminSurface(SESSION_USER.role))
    navigate(location.hash.slice(1) || 'overview', { updateHistory: false });
});
