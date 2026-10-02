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
    window.location.hash && window.location.hash !== '#main-content'
      ? window.location.hash
      : window.location.pathname.replace(/^\/|\/$/g, ''),
  );
  const onPopState = () => {
    if (window.location.hash && window.location.hash !== '#main-content') return;
    state.route = normalizeRoute(
      window.location.hash && window.location.hash !== '#main-content'
        ? window.location.hash
        : window.location.pathname.replace(/^\/|\/$/g, ''),
    );
    state.navOpen = false;
    renderPage({ focus: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const onClick = (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self'))
      return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.hash || url.search) return;
    const route = normalizeRoute(url.pathname.replace(/^\/|\/$/g, ''));
    if (route === 'not-found') return;
    event.preventDefault();
    if (url.pathname !== window.location.pathname || window.location.hash)
      window.history.pushState(null, '', url.pathname);
    onPopState();
  };
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', onClick);
  return () => {
    window.removeEventListener('hashchange', onHashChange);
    window.removeEventListener('popstate', onPopState);
    document.removeEventListener('click', onClick);
  };
}
