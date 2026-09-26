import { h } from './dom.mjs';
import { galleryEntries } from './collections.mjs';
import { RES } from './config.mjs';
import { DATA, siteStats, heroMetricLabel } from './data.mjs';
import { SectionHeader } from './layout.mjs';
import { state } from './router.mjs';
import { formatMetricCount, latestGalleryItems, fmtNewsDate } from './utils.mjs';

export function Hero(slides) {
  const usable =
    slides && slides.length
      ? slides
      : [
          { image_url: RES.hero2, title: '', subtitle: '' },
          { image_url: RES.hero3, title: '', subtitle: '' },
        ];
  state.heroSlides = usable;
  state.heroIdx %= usable.length;
  const stats = siteStats();
  const focusAreas = (DATA.research || [])
    .map((item) => item.title || item.name || '')
    .filter(Boolean)
    .slice(0, 3);
  const highlightLines = focusAreas.length
    ? focusAreas
    : [
        'Two-phase flow and boiling heat transfer',
        'Compact thermal systems and electronics cooling',
        'Diagnostics, instrumentation, and lab-built rigs',
      ];

  const slideEls = usable.map((s, i) =>
    h('div', {
      class: 'w-hero-slide' + (i === state.heroIdx ? ' active' : ''),
      style: { backgroundImage: `url(${s.image_url || s})` },
    }),
  );

  const dotEls = usable.map((_, i) =>
    h('button', {
      class: 'w-dot' + (i === state.heroIdx ? ' active' : ''),
      'aria-label': 'Slide ' + (i + 1),
      'aria-pressed': String(i === state.heroIdx),
      onclick: () => {
        state.heroIdx = i;
        updateHeroSlides();
        restartHeroTimer();
      },
    }),
  );

  const metrics = h(
    'div',
    { class: 'w-hero-metrics' },
    metric(formatMetricCount(stats.research, '0'), heroMetricLabel('research', 'Research areas')),
    metric(
      formatMetricCount(stats.publications, '0'),
      heroMetricLabel('publications', 'Publications'),
    ),
    metric(formatMetricCount(stats.people, '0'), heroMetricLabel('people', 'Active members')),
    metric(formatMetricCount(stats.facilities, '0'), heroMetricLabel('facilities', 'Facilities')),
  );

  const hero = h(
    'section',
    { class: 'w-hero' },
    ...slideEls,
    h('div', { class: 'w-hero-overlay' }),
    h('div', { class: 'w-hero-grain' }),
    h(
      'div',
      { class: 'w-hero-content' },
      h(
        'div',
        { class: 'w-hero-grid' },
        h(
          'div',
          { class: 'w-hero-copy' },
          h(
            'div',
            { class: 'w-hero-eyebrow' },
            h('span', { class: 'w-hero-dot' }),
            'Villanova University · Department of Mechanical Engineering',
          ),
          h('h1', {
            class: 'w-hero-title',
            html: 'Laboratory for Advanced<br>Thermal <span class="w-amp">&amp;</span> Fluid Systems',
          }),
          h(
            'p',
            { class: 'w-hero-lead' },
            'LATFS studies boiling, compact thermal systems, and experimental fluid mechanics for high-power-density energy technologies through hands-on rigs, diagnostics, and modeling.',
          ),
          h(
            'div',
            { class: 'w-hero-actions' },
            h('a', { class: 'w-btn w-btn-primary', href: '#' + 'research' }, 'Explore research'),
            h('a', { class: 'w-btn w-btn-secondary', href: '#' + 'people' }, 'Meet the team'),
          ),
        ),
        h(
          'aside',
          { class: 'w-hero-panel' },
          h('div', { class: 'w-hero-panel-heading' }, 'Lab snapshot'),
          h('div', { class: 'w-hero-panel-title' }, 'Hands-on thermal-fluid systems research'),
          h(
            'p',
            { class: 'w-hero-panel-copy' },
            'The lab connects instrumentation, analysis, and translational engineering across electronics cooling, two-phase flow, and energy systems.',
          ),
          h(
            'div',
            { class: 'w-hero-panel-grid' },
            heroMini(formatMetricCount(stats.publications, '0'), 'Publications'),
            heroMini(formatMetricCount(stats.people, '0'), 'Active members'),
            heroMini(formatMetricCount(stats.facilities, '0'), 'Facilities'),
            heroMini(formatMetricCount(stats.apps, '0'), 'Live apps'),
          ),
          h(
            'div',
            { class: 'w-hero-list' },
            ...highlightLines.map((line) => h('div', { class: 'w-hero-list-item' }, line)),
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'w-hero-footer' },
      metrics,
      h(
        'div',
        { class: 'w-hero-dots' },
        ...dotEls,
        h(
          'button',
          {
            class: 'w-carousel-pause',
            type: 'button',
            'aria-pressed': String(state.heroPaused),
            onclick: (event) => {
              state.heroPaused = !state.heroPaused;
              event.currentTarget.textContent = state.heroPaused ? 'Play slides' : 'Pause slides';
              event.currentTarget.setAttribute('aria-pressed', String(state.heroPaused));
              restartHeroTimer();
            },
          },
          state.heroPaused ? 'Play slides' : 'Pause slides',
        ),
      ),
    ),
  );
  return hero;
}

export function heroMini(num, label) {
  return h(
    'div',
    { class: 'w-hero-mini' },
    h('div', { class: 'w-hero-mini-num' }, num),
    h('div', { class: 'w-hero-mini-lbl' }, label),
  );
}

export function metric(num, label, badge) {
  return h(
    'div',
    { class: 'w-metric' + (badge ? ' w-metric-badge' : '') },
    num ? h('span', { class: 'w-metric-num' }, num) : null,
    h('span', { class: 'w-metric-lbl' }, label),
  );
}

export function restartHeroTimer() {
  clearInterval(state.heroTimer);
  state.heroTimer = null;
  if (
    state.route !== 'home' ||
    state.heroPaused ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    state.heroSlides.length < 2
  )
    return;
  state.heroTimer = setInterval(() => {
    if (document.hidden) return;
    state.heroIdx = (state.heroIdx + 1) % state.heroSlides.length;
    updateHeroSlides();
  }, 6000);
}

export function updateHeroSlides() {
  document
    .querySelectorAll('.w-hero-slide')
    .forEach((el, i) => el.classList.toggle('active', i === state.heroIdx));
  document.querySelectorAll('.w-hero-dots .w-dot').forEach((el, i) => {
    el.classList.toggle('active', i === state.heroIdx);
    el.setAttribute('aria-pressed', String(i === state.heroIdx));
  });
}

export function ResearchGrid(rows) {
  if (!rows?.length)
    return h(
      'section',
      { class: 'w-section w-research' },
      h(
        'div',
        { class: 'max-w' },
        SectionHeader('Research Areas'),
        h('p', { class: 'w-empty' }, 'No research areas published yet.'),
      ),
    );
  const imgs = [RES.rDroplet, RES.rMini, RES.hero2, RES.rGeo, RES.hero3, RES.fac1];
  const areas = rows.slice(0, 6).map((r, i) => ({
    title: r.title || r.name || '',
    desc: r.summary || r.description || r.desc || '',
    meta: r.meta || r.tag || '',
    img: r.image_url || imgs[i % imgs.length],
  }));

  const peekImgs = areas.map((a, i) =>
    h('div', {
      class: 'w-research-peek-img' + (i === 0 ? ' is-active' : ''),
      style: { backgroundImage: `url(${a.img})` },
      'data-idx': i,
    }),
  );
  const labelTitle = h('div', { class: 'w-research-peek-title' }, areas[0].title);
  const peekFrame = h(
    'div',
    { class: 'w-research-peek-frame' },
    ...peekImgs,
    h('div', { class: 'w-research-peek-overlay' }),
    h('div', { class: 'w-research-peek-label' }, labelTitle),
  );

  const setHover = (i) => {
    peekImgs.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
    peekFrame.classList.add('is-row-hovered');
    labelTitle.textContent = areas[i].title;
    rowEls.forEach((el, idx) => el.classList.toggle('is-hover', idx === i));
  };

  const rowEls = areas.map((a, i) =>
    h(
      'a',
      {
        class: 'w-research-row',
        href: '#research',
        onmouseenter: () => setHover(i),
        onfocus: () => setHover(i),
      },
      h(
        'div',
        { class: 'w-research-copy' },
        h('h3', { class: 'w-research-title' }, a.title),
        h('p', { class: 'w-research-desc' }, a.desc),
        h('div', { class: 'w-research-meta' }, a.meta),
      ),
    ),
  );

  const s = DATA.settings || {};
  return h(
    'section',
    { class: 'w-section w-research' },
    h(
      'div',
      { class: 'max-w' },
      h(
        'div',
        { class: 'w-sh', style: { marginBottom: '32px' } },
        h(
          'div',
          { class: 'w-sh-inner' },
          h('div', { class: 'w-sh-bar' }),
          h('h2', { class: 'w-sh-title' }, s.research_section_title || 'Research Areas'),
        ),
        h(
          'div',
          { class: 'w-research-eyebrow' },
          s.research_eyebrow || 'Thermal and fluid systems',
        ),
      ),
      h(
        'div',
        { class: 'w-research-layout' },
        h('div', { class: 'w-research-list' }, ...rowEls),
        h('div', { class: 'w-research-peek' }, peekFrame),
      ),
    ),
  );
}

export function NewsList(news) {
  const items = (news || []).slice(0, 3);
  if (!items.length)
    return h(
      'div',
      null,
      SectionHeader('Latest News'),
      h('p', { class: 'w-empty' }, 'No news published yet.'),
    );
  const formatted = items.map((n) => ({
    id: n.id,
    date: fmtNewsDate(n.date || n.published_at || n.created_at),
    title: n.title || '',
    body: n.body || n.summary || n.description || '',
  }));
  return h(
    'div',
    null,
    SectionHeader('Latest News'),
    h(
      'div',
      { class: 'w-news-stack' },
      ...formatted.map((n) =>
        h(
          'article',
          { class: 'w-news-card' },
          h(
            'div',
            { class: 'w-news-body-wrap' },
            h('div', { class: 'w-news-date' }, n.date),
            h('h3', { class: 'w-news-title' }, h('a', { href: '#news/' + n.id }, n.title)),
            h('p', { class: 'w-news-body' }, n.body),
          ),
        ),
      ),
    ),
    h(
      'a',
      { class: 'w-link-gold', style: { marginTop: '10px' }, href: '#news' },
      'View all news →',
    ),
  );
}

export function FeaturedPub(pubs) {
  const top = pubs?.[0];
  if (!top)
    return h(
      'div',
      null,
      SectionHeader('Featured Publication'),
      h('p', { class: 'w-empty' }, 'No publications published yet.'),
    );
  return h(
    'div',
    null,
    SectionHeader('Featured Publication'),
    h(
      'div',
      { class: 'w-pub-card' },
      h('div', { class: 'w-pub-year' }, String(top.year || '—')),
      h('h3', { class: 'w-pub-title' }, top.title || ''),
      h('p', { class: 'w-pub-authors' }, top.authors || ''),
      h('p', { class: 'w-pub-venue' }, top.venue || ''),
      top.pdf_url
        ? h(
            'a',
            {
              class: 'btn-ghost',
              style: { marginTop: '8px', display: 'inline-block' },
              href: top.pdf_url,
              target: '_blank',
              rel: 'noopener',
            },
            'Download PDF ↓',
          )
        : h(
            'span',
            {
              class: 'btn-ghost',
              style: { marginTop: '8px', display: 'inline-block', opacity: 0.7, cursor: 'default' },
              'aria-disabled': 'true',
              title: 'PDF not uploaded yet',
            },
            'PDF coming soon',
          ),
    ),
  );
}

export function HomeGalleryCarousel(gallery) {
  const photos = latestGalleryItems(galleryEntries(gallery), 5);
  if (!photos.length) return null;
  let start = 0;
  const strip = h('div', { class: 'w-gallery-strip w-home-gallery' });
  const renderVisible = () => {
    const count = Math.min(photos.length, 3);
    strip.replaceChildren(
      ...Array.from({ length: count }, (_, idx) => {
        const p = photos[(start + idx) % photos.length];
        return h(
          'a',
          { class: 'w-gallery-slide', href: '#' + 'gallery' },
          h('img', { src: p.src, alt: p.title, loading: 'lazy' }),
          h('div', { class: 'w-gallery-scrim' }),
          h(
            'div',
            { class: 'w-gallery-meta' },
            h('div', { class: 'w-gallery-cat' }, p.cat),
            h('div', { class: 'w-gallery-title' }, p.title),
            h('div', { class: 'w-gallery-sub' }, 'Latest gallery upload'),
          ),
        );
      }),
    );
  };
  const rotate = (dir) => {
    if (!photos.length) return;
    start = (start + dir + photos.length) % photos.length;
    renderVisible();
  };
  renderVisible();
  return h(
    'section',
    { class: 'w-section w-gallery' },
    h(
      'div',
      { class: 'max-w' },
      h(
        'div',
        { class: 'w-sh', style: { marginBottom: '16px' } },
        h(
          'div',
          { class: 'w-sh-inner' },
          h('div', { class: 'w-sh-bar' }),
          h('h2', { class: 'w-sh-title' }, 'From the Lab'),
        ),
        h(
          'div',
          { class: 'w-gallery-nav' },
          h(
            'button',
            {
              class: 'w-gallery-arrow',
              type: 'button',
              'aria-label': 'Previous',
              onclick: () => rotate(-1),
            },
            '<',
          ),
          h(
            'button',
            {
              class: 'w-gallery-arrow',
              type: 'button',
              'aria-label': 'Next',
              onclick: () => rotate(1),
            },
            '>',
          ),
        ),
      ),
      strip,
      h(
        'a',
        { class: 'w-link-gold', style: { marginTop: '14px' }, href: '#gallery' },
        'Open full gallery',
      ),
    ),
  );
}

export function SponsorMarquee(sponsors) {
  const logos = (sponsors || [])
    .map((s) => ({
      src: sponsorLogoSrc(s.logo_url || s.image_url, s.name),
      name: s.name || 'Research collaborator',
    }))
    .filter((s) => s.src);
  if (!logos.length) return null;
  const doubled = [...logos, ...logos];
  return h(
    'section',
    { class: 'w-section' },
    h(
      'div',
      { class: 'max-w' },
      SectionHeader('Research Collaborators'),
      h(
        'div',
        { class: 'w-marquee-wrap' },
        h(
          'div',
          { class: 'w-marquee' },
          ...doubled.map((logo, index) =>
            h('img', {
              src: logo.src,
              alt: index < logos.length ? logo.name : '',
              'aria-hidden': index >= logos.length ? 'true' : null,
              class: 'w-sponsor-logo',
            }),
          ),
        ),
      ),
    ),
  );
}

export function Home() {
  const homeBody = h(
    'div',
    null,
    Hero(DATA.hero),
    ResearchGrid(DATA.research),
    h(
      'section',
      { class: 'w-section', style: { background: 'var(--bg-2)', paddingTop: '0' } },
      h(
        'div',
        { class: 'max-w' },
        h('div', { class: 'w-two' }, NewsList(DATA.news), FeaturedPub(DATA.pubs)),
      ),
    ),
    HomeGalleryCarousel(DATA.gallery),
    SponsorMarquee(DATA.sponsors),
  );
  return homeBody;
}

export function sponsorLogoSrc(src, name = '') {
  const raw = String(src || '').trim();
  const file = raw.split('/').pop().toLowerCase();
  const label = String(name || '').toLowerCase();
  if (file.includes('nsf') || label.includes('nsf')) return RES.spNsf;
  if (
    file.includes('es2') ||
    file.includes('e3s') ||
    label.includes('e3s') ||
    label.includes('energy smart')
  )
    return RES.spEs2;
  if (file.includes('villanova') || label.includes('villanova')) return RES.spVillanova;
  if (file.includes('intel') || label.includes('intel')) return RES.spIntel;
  if (file.includes('amd') || label.includes('amd')) return RES.spAmd;
  if (file.includes('honeywell') || label.includes('honeywell')) return RES.spHoneywell;
  if (
    file.includes('rtx') ||
    file.includes('raytheon') ||
    label.includes('raytheon') ||
    label.includes('rtx')
  )
    return RES.spRtx;
  if (file.includes('ti') || file.includes('texas') || label.includes('texas')) return RES.spTi;
  if (file.includes('src') || label.includes('src')) return RES.spSrc;
  if (file.includes('nasa') || label.includes('nasa')) return RES.spNasa;
  if (file.includes('darpa') || label.includes('darpa')) return RES.spDarpa;
  return raw || '';
}
