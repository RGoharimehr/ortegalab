import { applyBackgrounds } from './backgrounds.mjs';
import { h } from './dom.mjs';
import { DATA, contentStatus, loadAll } from './data.mjs';
import { state, startRouter } from './router.mjs';
import { Nav, PageBanner, PublicFooter, applySiteTheme } from './layout.mjs';
import { Home, restartHeroTimer } from './home.mjs';
import { closeInlineApp } from './overlays.mjs';
import {
  PageResearch,
  PageResearchDetail,
  PagePeople,
  PagePersonDetail,
  PagePublications,
  PageFacilities,
  PageFacilityDetail,
  PageApps,
  PageGallery,
  PageDownloads,
  PageNews,
  PageNewsDetail,
  PageJoin,
  PageContact,
} from './pages.mjs';

const pages = {
  home: Home,
  research: PageResearch,
  people: PagePeople,
  publications: PagePublications,
  facilities: PageFacilities,
  gallery: PageGallery,
  apps: PageApps,
  downloads: PageDownloads,
  news: PageNews,
  join: PageJoin,
  contact: PageContact,
};
const detailPages = {
  research: PageResearchDetail,
  person: PagePersonDetail,
  facility: PageFacilityDetail,
  news: PageNewsDetail,
};

function pageForRoute(route) {
  const [kind, id] = route.split('/');
  if (id && detailPages[kind]) return detailPages[kind](id);
  if (pages[route]) return pages[route]();
  return h(
    'div',
    null,
    PageBanner('404', 'Page not found', 'This page does not exist.'),
    h(
      'section',
      { class: 'w-page-content max-w' },
      h('a', { href: '#home', class: 'w-link-gold' }, 'Return to home'),
    ),
  );
}

function updateMetadata(main) {
  const heading =
    main.querySelector('h1')?.textContent || 'Laboratory for Advanced Thermal & Fluid Systems';
  document.title =
    state.route === 'home'
      ? 'Laboratory for Advanced Thermal and Fluid Systems'
      : `${heading} · LATFS`;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', document.title);
}

let sectionObserver;
function observeSections(root) {
  sectionObserver?.disconnect();
  if (
    !globalThis.IntersectionObserver ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
    return;
  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.add('w-section-enter');
          sectionObserver.unobserve(entry.target);
        }
    },
    { threshold: 0.12 },
  );
  root
    .querySelectorAll('.w-home > section:not(:first-child)')
    .forEach((section) => sectionObserver.observe(section));
}

export function render({ focus = false } = {}) {
  closeInlineApp();
  applySiteTheme(DATA.settings.site_theme);
  const root = document.getElementById('app');
  const main = h('main', { id: 'main-content', tabindex: '-1' });
  if (contentStatus.loading) {
    main.appendChild(
      h('div', { class: 'max-w w-section', role: 'status' }, 'Loading lab content…'),
    );
  } else {
    if (contentStatus.failed.length) {
      const labels = { pubs: 'publications', hero: 'hero slides', settings: 'site settings' };
      const unavailable = contentStatus.failed.map((key) => labels[key] || key).join(', ');
      main.appendChild(
        h(
          'div',
          { class: 'w-content-status max-w', role: 'status' },
          h(
            'p',
            null,
            `Some content is temporarily unavailable (${unavailable}). Please try again.`,
          ),
          h('button', { class: 'btn-ghost', type: 'button', onclick: reloadContent }, 'Retry'),
        ),
      );
    }
    main.appendChild(pageForRoute(state.route));
  }
  root.classList.toggle(
    'w-home-immersive',
    state.route === 'home' && !contentStatus.loading && contentStatus.failed.length === 0,
  );
  root.replaceChildren(Nav(), main, PublicFooter());
  applyBackgrounds(root, DATA.settings, state.route);
  observeSections(root);
  root.setAttribute('aria-busy', String(contentStatus.loading));
  updateMetadata(main);
  if (state.route === 'home' && !contentStatus.loading) restartHeroTimer();
  else {
    clearInterval(state.heroTimer);
    state.heroTimer = null;
  }
  if (focus) main.focus({ preventScroll: true });
}

async function reloadContent() {
  const loading = loadAll();
  render();
  await loading;
  render();
}

startRouter(render);
await reloadContent();
