import { h } from './dom.mjs';
import { RES, NAV, platformHref } from './config.mjs';
import { state, activeSection } from './router.mjs';

export function Nav() {
  const links = NAV.map(([id, label]) =>
    h(
      'a',
      {
        class: 'w-nav-link' + (activeSection(state.route) === id ? ' active' : ''),
        href: '#' + id,
        'aria-current': activeSection(state.route) === id ? 'page' : null,
      },
      label,
    ),
  );
  const menu = h(
    'div',
    { id: 'site-navigation', class: 'w-nav-links' },
    ...links,
    h('a', { class: 'w-nav-signin', href: platformHref() }, 'Sign in'),
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
        state.navOpen = !state.navOpen;
        menu.classList.toggle('open', state.navOpen);
        toggle.setAttribute('aria-expanded', String(state.navOpen));
      },
    },
    '☰',
  );
  return h(
    'nav',
    {
      class: 'w-nav',
      'aria-label': 'Main navigation',
      onkeydown: (event) => {
        if (event.key === 'Escape' && state.navOpen) {
          state.navOpen = false;
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      },
    },
    h(
      'div',
      { class: 'w-nav-inner' },
      h(
        'a',
        { class: 'w-brand', href: '#home', 'aria-label': 'LATFS home' },
        h('img', { src: RES.logoColor, alt: 'LATFS', class: 'w-brand-img' }),
      ),
      menu,
      toggle,
    ),
  );
}

export function SectionHeader(title, action) {
  const inner = h(
    'div',
    { class: 'w-sh-inner' },
    h('div', { class: 'w-sh-bar' }),
    h('h2', { class: 'w-sh-title' }, title),
  );
  return action
    ? h(
        'div',
        { class: 'w-sh' },
        inner,
        h('button', { class: 'w-link-gold', onclick: action.onClick }, action.label + ' →'),
      )
    : h('div', { class: 'w-sh' }, inner);
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

export function PublicFooter() {
  return h(
    'footer',
    { class: 'w-footer' },
    h(
      'div',
      { class: 'max-w w-footer-anchor' },
      h('div', { class: 'w-anchor-label' }, 'Home institutions'),
      h(
        'div',
        { class: 'w-anchor-row' },
        h(
          'a',
          {
            class: 'w-anchor-logo-link',
            href: 'http://www.es2.villanova.edu/',
            target: '_blank',
            rel: 'noopener',
          },
          h('img', {
            src: RES.spEs2,
            alt: 'ES2 Center for Energy-Smart Electronic Systems',
            class: 'w-anchor-logo is-es2',
          }),
        ),
        h('div', { class: 'w-anchor-div' }),
        h(
          'a',
          {
            class: 'w-anchor-logo-link',
            href: 'https://www.nsf.gov/eng/iip/iucrc/home.jsp',
            target: '_blank',
            rel: 'noopener',
          },
          h('img', {
            src: RES.spNsf,
            alt: 'National Science Foundation',
            class: 'w-anchor-logo is-nsf',
          }),
        ),
        h('div', { class: 'w-anchor-div' }),
        h(
          'a',
          {
            class: 'w-anchor-logo-link',
            href: 'https://www1.villanova.edu/university/engineering.html',
            target: '_blank',
            rel: 'noopener',
          },
          h('img', {
            src: RES.spVillanova,
            alt: 'Villanova University College of Engineering',
            class: 'w-anchor-logo is-villanova',
          }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'max-w w-footer-grid' },
      h(
        'div',
        null,
        h('img', { src: RES.latfsWhite, alt: 'LATFS', class: 'w-foot-logo' }),
        h(
          'p',
          { class: 'w-foot-sub' },
          'Laboratory for Advanced Thermal & Fluid Systems - Villanova University - 800 Lancaster Ave, Villanova PA 19085',
        ),
      ),
      h(
        'div',
        null,
        h('h4', { class: 'w-foot-h' }, 'Explore'),
        h(
          'ul',
          null,
          h('li', null, h('a', { href: '#research' }, 'Research')),
          h('li', null, h('a', { href: '#people' }, 'People')),
          h('li', null, h('a', { href: '#apps' }, 'Apps')),
          h('li', null, h('a', { href: '#gallery' }, 'Gallery')),
          h('li', null, h('a', { href: '#downloads' }, 'Downloads')),
        ),
      ),
      h(
        'div',
        null,
        h('h4', { class: 'w-foot-h' }, 'Resources'),
        h(
          'ul',
          null,
          h('li', null, h('a', { href: '#publications' }, 'Publications')),
          h('li', null, h('a', { href: '#facilities' }, 'Facilities')),
          h('li', null, h('a', { href: '#news' }, 'News')),
          h('li', null, h('a', { href: '#join' }, 'Join the lab')),
        ),
      ),
      h(
        'div',
        null,
        h('h4', { class: 'w-foot-h' }, 'Contact'),
        h(
          'ul',
          null,
          h('li', null, h('a', { href: 'mailto:aortega@villanova.edu' }, 'aortega@villanova.edu')),
          h('li', null, h('a', { href: 'tel:+16105194996' }, '+1 (610) 519-4996')),
          h('li', null, 'Tolentine Hall 344'),
          h('li', null, h('a', { href: '#contact' }, 'Contact page')),
        ),
      ),
    ),
    h(
      'div',
      { class: 'w-footer-bottom' },
      `© ${new Date().getFullYear()} LATFS - Villanova University - College of Engineering`,
    ),
  );
}

export function applySiteTheme(theme) {
  const nextTheme = theme === 'navy-copper' ? 'navy-copper' : 'navy-gold';
  document.body.dataset.theme = nextTheme;
}
