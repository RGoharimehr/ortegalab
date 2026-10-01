import { NAV } from './config.mjs';

const routes = new Set(NAV.map(([id]) => id));
export const state = {
  route: 'home',
  heroSlides: [],
  heroIdx: 0,
  heroTimer: null,
  heroPaused: false,
  navOpen: false,
};
let renderPage = () => {};

export function normalizeRoute(hash) {
  const route = String(hash || '').replace(/^#/, '') || 'home';
  if (routes.has(route) || /^(person|facility|news|research)\/[^/]+$/.test(route)) return route;
  return 'not-found';
}

export function activeSection(route) {
  if (route.startsWith('research/')) return 'research';
  if (route.startsWith('person/')) return 'people';
  if (route.startsWith('facility/')) return 'facilities';
  if (route.startsWith('news/')) return 'news';
  return route;
}

export function startRouter(render) {
  renderPage = render;
  const onHashChange = () => {
    // The skip link is a document anchor, not a page route.
    if (window.location.hash === '#main-content') {
      document.getElementById('main-content')?.focus();
      return;
    }
    state.route = normalizeRoute(window.location.hash);
    state.navOpen = false;
    renderPage({ focus: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  state.route = normalizeRoute(
    window.location.hash === '#main-content' ? '' : window.location.hash,
  );
  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
}
