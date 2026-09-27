import { h } from './dom.mjs';
import { RES, NAV, platformHref } from './config.mjs';
import { state, activeSection } from './router.mjs';

function navLink(id, label) {
  return h(
    'a',
    {
      class: 'w-nav-link' + (activeSection(state.route) === id ? ' active' : ''),
      href: '#' + id,
      'aria-current': activeSection(state.route) === id ? 'page' : null,
    },
    label,
  );
}

export function Nav() {
  const resourceIds = new Set(['facilities', 'gallery', 'apps', 'downloads', 'news']);
  const resources = h(
    'details',
    { class: 'w-nav-resources' },
    h(
      'summary',
      { class: 'w-nav-link' + (resourceIds.has(activeSection(state.route)) ? ' active' : '') },
      'Resources',
      h('span', { 'aria-hidden': 'true' }, '⌄'),
    ),
    h(
      'div',
      { class: 'w-resource-menu' },
      ...NAV.filter(([id]) => resourceIds.has(id)).map(([id, label]) => navLink(id, label)),
    ),
  );
  const menu = h(
    'div',
    { id: 'site-navigation', class: 'w-nav-links' },
    navLink('research', 'Research'),
    navLink('people', 'People'),
    navLink('publications', 'Publications'),
    resources,
    navLink('join', 'Join the lab'),
    h(
      'a',
      { class: 'w-nav-signin', href: platformHref() },
      'Lab platform',
      h('span', { 'aria-hidden': 'true' }, '↗'),
    ),
  );
  const toggle = h(
    'button',
    {
      class: 'w-nav-toggle',
      type: 'button',
      'aria-label': 'Toggle menu',
      'aria-expanded': 'false',
      'aria-controls': 'site-navigation',
      onclick: () => {
        state.navOpen = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(state.navOpen));
      },
    },
    h('span', { 'aria-hidden': 'true' }, '☰'),
  );
  return h(
    'nav',
    {
      class: 'w-nav',
      'aria-label': 'Main navigation',
      onkeydown: (event) => {
        if (event.key !== 'Escape') return;
        if (resources.open) {
          resources.open = false;
          resources.querySelector('summary').focus();
        } else if (state.navOpen) {
          state.navOpen = false;
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      },
      onfocusout: (event) => {
        if (!resources.contains(event.relatedTarget)) resources.open = false;
      },
    },
    h(
      'div',
      { class: 'w-nav-inner' },
      h(
        'a',
        { class: 'w-brand', href: '#home', 'aria-label': 'LATFS home' },
        h(
          'span',
          { class: 'w-brand-mark' },
          h('img', { src: RES.latfsWhite, alt: '', class: 'w-brand-img' }),
        ),
        h(
          'span',
          { class: 'w-brand-copy' },
          h('strong', null, 'LATFS'),
          h('span', { class: 'w-brand-sub' }, 'VILLANOVA UNIVERSITY'),
        ),
      ),
      menu,
      toggle,
    ),
  );
}

export function SectionHeader(title, action) {
  return h(
    'div',
    { class: 'w-sh' },
    h('div', { class: 'w-sh-inner' }, h('h2', { class: 'w-sh-title' }, title)),
    action
      ? h('button', { class: 'w-link-gold', onclick: action.onClick }, action.label + ' →')
      : null,
  );
}

export function PageBanner(eyebrow, title, intro) {
  return h(
    'div',
    { class: 'w-page-banner' },
    h(
      'div',
      { class: 'max-w' },
      h(
        'div',
        { class: 'w-page-banner-copy' },
        h('span', { class: 'eyebrow' }, eyebrow),
        h('h1', { class: 'w-page-banner-title' }, title),
        intro ? h('p', { class: 'w-page-banner-intro' }, intro) : null,
      ),
    ),
  );
}

function footerColumn(title, links) {
  return h(
    'div',
    null,
    h('h3', { class: 'w-foot-h' }, title),
    h('ul', null, ...links.map(([href, label]) => h('li', null, h('a', { href }, label)))),
  );
}

export function PublicFooter() {
  return h(
    'footer',
    { class: 'w-footer' },
    h(
      'div',
      { class: 'max-w w-footer-grid' },
      h(
        'div',
        { class: 'w-footer-identity' },
        h(
          'a',
          { href: '#home', 'aria-label': 'LATFS home' },
          h(
            'span',
            { class: 'w-brand-mark w-foot-logo' },
            h('img', { src: RES.latfsWhite, alt: 'LATFS', class: 'w-brand-img' }),
          ),
        ),
        h('p', { class: 'w-foot-sub' }, 'Laboratory for Advanced Thermal & Fluid Systems'),
        h(
          'p',
          { class: 'w-foot-address' },
          'Villanova University',
          h('br'),
          '800 Lancaster Avenue',
          h('br'),
          'Villanova, PA 19085',
        ),
      ),
      footerColumn('Discover', [
        ['#research', 'Research'],
        ['#people', 'People'],
        ['#publications', 'Publications'],
        ['#facilities', 'Facilities'],
      ]),
      footerColumn('Resources', [
        ['#news', 'Lab news'],
        ['#gallery', 'Gallery'],
        ['#apps', 'Research tools'],
        ['#downloads', 'Downloads'],
        [platformHref(), 'Lab platform ↗'],
      ]),
      footerColumn('Connect', [
        ['#join', 'Join the lab'],
        ['#contact', 'Contact'],
        ['mailto:aortega@villanova.edu', 'aortega@villanova.edu'],
        ['tel:+16105194996', '+1 (610) 519-4996'],
      ]),
    ),
    h(
      'div',
      { class: 'max-w w-footer-institutions' },
      h('span', null, 'Part of a wider research community'),
      h(
        'div',
        { class: 'w-anchor-row' },
        h(
          'a',
          {
            href: 'https://www1.villanova.edu/university/engineering.html',
            target: '_blank',
            rel: 'noopener',
          },
          h('img', {
            src: RES.spVillanova,
            alt: 'Villanova University College of Engineering',
            class: 'w-anchor-logo',
          }),
        ),
        h(
          'a',
          { href: 'http://www.es2.villanova.edu/', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spEs2, alt: 'ES2 Center', class: 'w-anchor-logo is-es2' }),
        ),
        h(
          'a',
          { href: 'https://www.nsf.gov/', target: '_blank', rel: 'noopener' },
          h('img', {
            src: RES.spNsf,
            alt: 'National Science Foundation',
            class: 'w-anchor-logo is-nsf',
          }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'max-w w-footer-bottom' },
      h('span', null, `© ${new Date().getFullYear()} LATFS · Villanova University`),
      h('span', null, 'Thermal science. Shared discovery.'),
    ),
  );
}

export function applySiteTheme() {
  // The public identity is consistently dark, including databases with legacy theme settings.
  document.body.dataset.theme = 'graphite';
}
