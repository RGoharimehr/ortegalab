import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { DATA, ENDPOINTS, contentStatus, loadAll } from '../public/js/site/data.mjs';
import { h } from '../public/js/site/dom.mjs';
import { Nav } from '../public/js/site/layout.mjs';
import { Home, Hero, ResearchFeature } from '../public/js/site/home.mjs';
import { LAB_PHOTOS, HERO_PHOTOS } from '../public/js/site/photography.mjs';
import { galleryEntries } from '../public/js/site/collections.mjs';
import * as pages from '../public/js/site/pages.mjs';
import { closeInlineApp, openGalleryPreview, openInlineApp } from '../public/js/site/overlays.mjs';
import { activeSection, normalizeRoute, startRouter, state } from '../public/js/site/router.mjs';

let dom;
let stopRouter;
const originalFetch = globalThis.fetch;
const globals = new Map(
  ['window', 'document', 'location'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);

beforeEach(() => {
  dom = new JSDOM(
    '<!doctype html><html><head><title>LATFS</title></head><body><div id="app"></div></body></html>',
    { url: 'https://latfs.test/#home' },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  window.scrollTo = () => {};
  state.route = 'home';
  state.heroPaused = true;
  state.navOpen = false;
  for (const key of Object.keys(ENDPOINTS)) DATA[key] = key === 'settings' ? {} : [];
  contentStatus.loading = false;
  contentStatus.failed = [];
});

afterEach(() => {
  stopRouter?.();
  stopRouter = null;
  closeInlineApp();
  clearInterval(state.heroTimer);
  dom.window.close();
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

function response(value) {
  return { ok: true, json: async () => value };
}
function move(action) {
  return new Promise((resolve) => {
    window.addEventListener('hashchange', resolve, { once: true });
    action();
  });
}

test('empty API collections stay empty while supplied lab photographs remain available', async () => {
  await loadAll({ fetchImpl: async (url) => response(url === ENDPOINTS.settings ? {} : []) });
  assert.deepEqual(contentStatus.failed, []);
  for (const key of Object.keys(ENDPOINTS).filter((key) => key !== 'settings'))
    assert.deepEqual(DATA[key], []);
  const home = Home();
  assert.match(home.textContent, /No news published yet/);
  assert.match(home.textContent, /No publications published yet/);
  assert.match(
    home.querySelector('.w-research-feature').textContent,
    /No research areas published yet/,
  );
  assert.equal(home.querySelectorAll('.w-sponsor-logo').length, 9);
  assert.equal(home.querySelectorAll('.w-gallery-slide').length, 3);
  for (const img of home.querySelectorAll('.w-gallery-slide img'))
    assert.match(img.getAttribute('src'), /^\/assets\/lab\//);
});

test('partial API failures remain visible while independent collections load', async () => {
  await loadAll({
    fetchImpl: async (url) => {
      if (url === ENDPOINTS.news) return { ok: false, status: 503 };
      if (url === ENDPOINTS.people) return response({ invalid: true });
      if (url === ENDPOINTS.pubs) return response([{ id: 11, title: 'Published result' }]);
      return response(url === ENDPOINTS.settings ? {} : []);
    },
  });
  assert.deepEqual(contentStatus.failed, ['news', 'people']);
  assert.equal(contentStatus.loading, false);
  assert.equal(DATA.pubs[0].title, 'Published result');
  assert.deepEqual(DATA.news, []);
  assert.deepEqual(DATA.people, []);
});

test('all public page modules render with empty content and named search controls', () => {
  for (const [name, Page] of Object.entries(pages)) {
    const page = name.endsWith('Detail') ? Page('missing') : Page();
    assert.ok(page.querySelector('h1'), name);
    for (const field of page.querySelectorAll('input, select'))
      assert.ok(field.getAttribute('aria-label'), name);
    for (const anchor of page.querySelectorAll('a')) assert.ok(anchor.hasAttribute('href'), name);
  }
  assert.equal(
    pages.PageContact().querySelector('a[href^="tel:"]').textContent,
    '+1 (610) 519-4996',
  );
});

test('a small real roster renders only its real members and supports unknown categories', () => {
  DATA.people = [
    { id: 47, name: 'Actual Member', category: 'new-category', active: true },
    { id: 48, name: 'Inactive Member', active: false },
  ];
  const page = pages.PagePeople();
  const profiles = page.querySelectorAll('.w-person-v2');
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].getAttribute('href'), '#person/47');
  assert.match(profiles[0].textContent, /Actual Member/);
  assert.doesNotMatch(page.textContent, /Maya|Alejandro|Inactive Member/);
  assert.match(pages.PagePersonDetail(47).textContent, /Actual Member/);
  const search = page.querySelector('input');
  search.value = 'no-match';
  search.dispatchEvent(new window.Event('input'));
  assert.equal(page.querySelectorAll('.w-person-v2').length, 0);
});

test('native navigation preserves Back and Forward history and marks detail sections', async () => {
  const visited = [];
  stopRouter = startRouter(() => visited.push(state.route));
  document.getElementById('app').appendChild(Nav());
  const initialHistoryLength = window.history.length;
  await move(() => document.querySelector('a[href="#people"]').click());
  assert.equal(state.route, 'people');
  await move(() => {
    window.location.hash = '#publications';
  });
  assert.equal(state.route, 'publications');
  assert.equal(window.history.length, initialHistoryLength + 2);
  await move(() => window.history.back());
  assert.equal(state.route, 'people');
  await move(() => window.history.forward());
  assert.equal(state.route, 'publications');
  assert.deepEqual(visited, ['people', 'publications', 'people', 'publications']);
  assert.equal(activeSection('person/47'), 'people');
  assert.equal(normalizeRoute('#unknown/path'), 'not-found');
});

test('gallery dialogs close on Escape and restore focus; app iframes use an isolated origin', () => {
  const launcher = h('button', {}, 'Open photo');
  document.getElementById('app').appendChild(launcher);
  launcher.focus();
  openGalleryPreview({ src: '/assets/hero-2.png', title: 'Lab image' });
  assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-modal'), 'true');
  assert.equal(document.getElementById('app').inert, true);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, launcher);
  openInlineApp({ title: 'Calculator', embed_html: '<p>Calculator</p>' });
  assert.ok(
    !document.querySelector('iframe').getAttribute('sandbox').includes('allow-same-origin'),
  );
  document.querySelector('[data-dialog-close]').click();
  assert.equal(document.querySelector('iframe'), null);
  assert.equal(document.activeElement, launcher);
});

test('content-managed URLs cannot execute scripts and strings render as text', () => {
  const link = h('a', { href: 'java\nscript:alert(1)' }, '<img src=x onerror=alert(1)>');
  assert.equal(link.hasAttribute('href'), false);
  assert.equal(link.querySelector('img'), null);
  assert.equal(
    h('a', { href: 'mailto:lab@example.org' }).getAttribute('href'),
    'mailto:lab@example.org',
  );
});

test('entrypoint loads real modules, handles populated routes and exposes retry on content failure', async () => {
  DATA.people = [];
  globalThis.fetch = async (url) => {
    if (url === ENDPOINTS.people)
      return response([{ id: 1, name: 'Actual Member', category: 'phd', active: true }]);
    if (url === ENDPOINTS.news) return { ok: false, status: 503 };
    return response(url === ENDPOINTS.settings ? {} : []);
  };
  const { render } = await import('../public/js/site/app.mjs');
  assert.equal(document.getElementById('app').getAttribute('aria-busy'), 'false');
  assert.match(document.querySelector('.w-content-status').textContent, /news/);
  assert.ok(document.querySelector('main'));
  const root = document.getElementById('app');
  assert.equal(root.classList.contains('w-home-immersive'), false);
  contentStatus.failed = [];
  render();
  assert.equal(root.classList.contains('w-home-immersive'), true);
  contentStatus.loading = true;
  render();
  assert.equal(root.classList.contains('w-home-immersive'), false);
  contentStatus.loading = false;
  state.route = 'person/1';
  render();
  assert.equal(document.querySelector('h1').textContent, 'Actual Member');
  assert.equal(document.title, 'Actual Member · LATFS');
  assert.equal(root.classList.contains('w-home-immersive'), false);
  assert.equal(document.querySelector('[aria-current="page"]').getAttribute('href'), '#people');
});

test('published collections render their details and filter publications and downloads', () => {
  DATA.research = [{ id: 1, title: 'Research topic', summary: 'Measured results' }];
  DATA.pubs = [
    { id: 1, title: 'Published study', year: 2026, authors: 'Lab Author', pdf_url: '/study.pdf' },
  ];
  DATA.facilities = [
    { id: 1, name: 'Lab facility', description: 'Test rig', doc_url: '/manual.pdf' },
  ];
  DATA.news = [{ id: 1, title: 'Lab news', date: '2026-09-25', body: 'News content' }];
  DATA.gallery = [{ id: 1, image_url: '/photo.jpg', caption: 'Real lab photo' }];
  DATA.downloads = [
    { id: 1, title: 'Lab manual', category: 'Manual', file_url: '/manual.pdf', file_size: 2048 },
  ];
  DATA.apps = [{ id: 1, title: 'Lab calculator', url: '/calculator' }];
  DATA.sponsors = [{ id: 1, name: 'Actual partner', logo_url: '/logo.png' }];
  assert.match(Home().textContent, /Research topic/);
  assert.match(Home().textContent, /SEP 25, 2026/);
  assert.equal(Home().querySelector('.w-research-story h2').textContent, 'Research topic');
  assert.equal(Home().querySelectorAll('.w-research-card').length, 0);
  assert.match(pages.PageFacilityDetail(1).textContent, /Test rig/);
  assert.match(pages.PageNewsDetail(1).textContent, /News content/);
  for (const Page of [
    pages.PageResearch,
    pages.PageFacilities,
    pages.PageNews,
    pages.PageGallery,
    pages.PageDownloads,
    pages.PagePublications,
    pages.PageApps,
  ])
    assert.ok(Page().querySelector('h1'));
  for (const Page of [pages.PagePublications, pages.PageDownloads]) {
    const page = Page();
    const input = page.querySelector('input');
    input.value = 'no-match';
    input.dispatchEvent(new window.Event('input'));
    assert.equal(page.querySelectorAll('article').length, 0);
    assert.match(page.querySelector('[role="status"]').textContent, /^0 /);
  }
});

test('join advertisement shows availability and safely renders editable position details', () => {
  assert.match(pages.PageJoin().textContent, /NO OPEN POSITIONS ADVERTISED/);
  DATA.settings = {
    join_openings_status: 'open',
    join_openings_title: 'PhD researcher',
    join_openings_details: '<script>unsafe()</script>\nApply by October 30.',
  };
  const page = pages.PageJoin();
  assert.match(page.textContent, /APPLICATIONS OPEN/);
  assert.match(page.textContent, /PhD researcher/);
  assert.match(page.textContent, /Apply by October 30/);
  assert.equal(page.querySelector('script'), null);
});

test('research feature changes topic, description and photograph without losing its link', () => {
  const feature = ResearchFeature([
    {
      title: 'Cooling research',
      summary: 'Measured cooling performance.',
      image_url: '/uploads/cooling.jpg',
    },
    {
      title: 'Fluid research',
      summary: 'Measured fluid behavior.',
      image_url: '/uploads/fluids.jpg',
    },
  ]);
  assert.equal(feature.querySelector('h2').textContent, 'Cooling research');
  feature.querySelector('[aria-label="Next research topic"]').click();
  assert.equal(feature.querySelector('h2').textContent, 'Fluid research');
  assert.match(feature.textContent, /Measured fluid behavior/);
  assert.equal(feature.querySelector('img').getAttribute('src'), '/uploads/fluids.jpg');
  assert.equal(feature.querySelector('a').getAttribute('href'), '#research');
  feature.querySelector('[aria-label="Next research topic"]').click();
  assert.equal(feature.querySelector('h2').textContent, 'Cooling research');
  feature.querySelector('[aria-label="Previous research topic"]').click();
  assert.equal(feature.querySelector('h2').textContent, 'Fluid research');
});

test('homepage places unboxed collaborators after research and before publications and news', () => {
  const home = Home();
  const sections = [...home.children];
  assert.ok(sections[1].classList.contains('w-research-feature'));
  assert.ok(sections[2].classList.contains('w-partners'));
  assert.ok(sections[3].classList.contains('w-updates'));
  assert.equal(sections[2].querySelectorAll('.w-sponsor-item').length, 0);
  assert.equal(sections[2].querySelectorAll('.w-sponsor-logo').length, 9);
});

test('supplied photography replaces legacy slides and is available in the gallery without duplicates', () => {
  const hero = Hero([{ image_url: '/assets/hero-1.png', title: 'Old panorama' }]);
  assert.equal(hero.querySelector('img').getAttribute('src'), HERO_PHOTOS[0].image_url);
  assert.equal(
    Hero([{ image_url: '/uploads/custom.jpg' }])
      .querySelector('img')
      .getAttribute('src'),
    '/uploads/custom.jpg',
  );
  const gallery = galleryEntries([
    { image_url: LAB_PHOTOS[0].image_url, caption: 'Custom caption' },
  ]);
  assert.equal(gallery.length, 13);
  assert.equal(gallery[0].title, 'Custom caption');
  assert.equal(new Set(gallery.map((photo) => photo.src)).size, 13);
});
