import { h } from './dom.mjs';
import { galleryEntries } from './collections.mjs';
import { RES } from './config.mjs';
import { HERO_PHOTOS, RESEARCH_PHOTOS, PARTNER_PHOTO, researchPhoto } from './photography.mjs';
import { DATA, siteStats, heroMetricLabel } from './data.mjs';
import { SectionHeader } from './layout.mjs';
import { state } from './router.mjs';
import { formatMetricCount, latestGalleryItems, fmtNewsDate } from './utils.mjs';

export function Hero(slides) {
  const published = (slides || []).filter(
    (slide) => !/(?:^|\/)assets\/(?:hero-\d+|facility-\d+)\.png$/.test(slide.image_url || slide),
  );
  const usable = published.length ? published : HERO_PHOTOS;
  state.heroSlides = usable;
  state.heroIdx %= usable.length;
  const stats = siteStats();
  const statistics = ['research', 'publications', 'people', 'facilities'].filter(
    (key) => stats[key] > 0,
  );
  const labels = {
    research: 'Research areas',
    publications: 'Publications',
    people: 'Lab members',
    facilities: 'Facilities',
  };
  return h(
    'section',
    { class: 'w-hero' },
    h(
      'div',
      { class: 'max-w' },
      h(
        'div',
        { class: 'w-hero-stage' },
        h(
          'div',
          { class: 'w-hero-heading' },
          h('h1', { class: 'w-hero-title' }, 'Laboratory for Advanced Thermal and Fluid Systems'),
        ),
        h(
          'div',
          {
            class: 'w-hero-media',
            role: 'region',
            'aria-roledescription': 'carousel',
            'aria-label': 'Laboratory photographs',
          },
          ...usable.map((slide, i) =>
            h(
              'div',
              {
                class: 'w-hero-slide' + (i === state.heroIdx ? ' active' : ''),
                'aria-hidden': String(i !== state.heroIdx),
              },
              h('img', {
                src: slide.image_url || slide,
                alt: slide.title || 'LATFS research laboratory',
                loading: i === 0 ? 'eager' : 'lazy',
              }),
            ),
          ),
          h(
            'div',
            { class: 'w-hero-media-bar' },
            h(
              'span',
              { class: 'w-media-label' },
              h('span', { 'aria-hidden': 'true' }, '↗'),
              'Inside LATFS',
            ),
            h(
              'div',
              { class: 'w-hero-dots' },
              ...usable.map((_, i) =>
                h('button', {
                  class: 'w-dot' + (i === state.heroIdx ? ' active' : ''),
                  type: 'button',
                  'aria-label': `Slide ${i + 1}`,
                  'aria-pressed': String(i === state.heroIdx),
                  onclick: () => {
                    state.heroIdx = i;
                    updateHeroSlides();
                    restartHeroTimer();
                  },
                }),
              ),
              h(
                'button',
                {
                  class: 'w-carousel-pause',
                  type: 'button',
                  'aria-pressed': String(state.heroPaused),
                  onclick: (event) => {
                    state.heroPaused = !state.heroPaused;
                    event.currentTarget.textContent = state.heroPaused
                      ? 'Play slides'
                      : 'Pause slides';
                    event.currentTarget.setAttribute('aria-pressed', String(state.heroPaused));
                    restartHeroTimer();
                  },
                },
                state.heroPaused ? 'Play slides' : 'Pause slides',
              ),
            ),
          ),
        ),
        statistics.length
          ? h(
              'div',
              { class: 'w-hero-metrics' },
              ...statistics.map((key) =>
                metric(formatMetricCount(stats[key], '0'), heroMetricLabel(key, labels[key])),
              ),
            )
          : null,
      ),
    ),
  );
}

export function metric(num, label) {
  return h(
    'div',
    { class: 'w-metric' },
    h('span', { class: 'w-metric-num' }, num),
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
  document.querySelectorAll('.w-hero-slide').forEach((el, i) => {
    el.classList.toggle('active', i === state.heroIdx);
    el.setAttribute('aria-hidden', String(i !== state.heroIdx));
  });
  document.querySelectorAll('.w-hero-dots .w-dot').forEach((el, i) => {
    el.classList.toggle('active', i === state.heroIdx);
    el.setAttribute('aria-pressed', String(i === state.heroIdx));
  });
}

export function ResearchFeature(rows) {
  const topics = rows || [];
  let index = 0;
  const image = h('img', {
    class: 'w-research-backdrop',
    src: RESEARCH_PHOTOS[0].image_url,
    alt: '',
    loading: 'lazy',
  });
  const story = h('div', {
    class: 'w-research-story',
    id: 'research-topic',
    'aria-live': 'polite',
  });
  const count = h('span', { class: 'w-research-count', 'aria-live': 'polite' });
  const paint = () => {
    const topic = topics[index];
    if (!topic) {
      story.replaceChildren(
        h('h2', null, 'Research at LATFS'),
        h('p', null, 'No research areas published yet.'),
        h('a', { class: 'w-feature-link', href: '#research' }, 'Visit the research page ↗'),
      );
      return;
    }
    const title = topic.title || topic.name || 'Research at LATFS';
    image.src = researchPhoto(topic, index);
    story.replaceChildren(
      h('h2', { class: 'w-section-title' }, title),
      h(
        'p',
        null,
        topic.summary ||
          topic.description ||
          topic.desc ||
          'Explore this topic on our research page.',
      ),
      h(
        'a',
        {
          class: 'w-feature-link',
          href: '#research/' + topic.id,
          'aria-label': `Read more about ${title}`,
        },
        'Explore this research ↗',
      ),
    );
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(topics.length).padStart(2, '0')}`;
  };
  const controls =
    topics.length > 1
      ? h(
          'div',
          { class: 'w-research-controls', role: 'group', 'aria-label': 'Research topics' },
          h(
            'button',
            {
              class: 'w-topic-arrow',
              'aria-label': 'Previous research topic',
              'aria-controls': 'research-topic',
              onclick: () => {
                index = (index - 1 + topics.length) % topics.length;
                paint();
              },
            },
            '←',
          ),
          count,
          h(
            'button',
            {
              class: 'w-topic-arrow',
              'aria-label': 'Next research topic',
              'aria-controls': 'research-topic',
              onclick: () => {
                index = (index + 1) % topics.length;
                paint();
              },
            },
            '→',
          ),
        )
      : null;
  paint();
  return h(
    'section',
    { class: 'w-research w-research-feature', 'aria-label': 'Research' },
    image,
    h(
      'div',
      { class: 'max-w w-research-content' },
      h('span', { class: 'eyebrow' }, 'RESEARCH'),
      story,
      controls,
    ),
  );
}

export function NewsList(news) {
  return h(
    'div',
    { class: 'w-home-news' },
    SectionHeader('From the lab', null, 'NEWS'),
    news?.length
      ? h(
          'div',
          { class: 'w-news-stack' },
          ...news
            .slice(0, 3)
            .map((n) =>
              h(
                'article',
                { class: 'w-news-card' },
                h(
                  'time',
                  { class: 'w-news-date', datetime: n.date || null },
                  fmtNewsDate(n.date || n.created_at),
                ),
                h(
                  'h3',
                  { class: 'w-news-title' },
                  h('a', { href: '#news/' + n.id }, n.title || ''),
                ),
                h('span', { class: 'w-news-arrow', 'aria-hidden': 'true' }, '↗'),
              ),
            ),
        )
      : h('p', { class: 'w-empty' }, 'No news published yet.'),
    h('a', { class: 'w-text-link', href: '#news' }, 'All lab news ↗'),
  );
}

export function FeaturedPub(pubs) {
  const top = pubs?.[0];
  return h(
    'div',
    { class: 'w-home-publication' },
    SectionHeader('Latest publication', null, 'PUBLICATIONS'),
    top
      ? h(
          'article',
          { class: 'w-pub-card' },
          h(
            'div',
            { class: 'w-pub-card-top' },
            h('span', { class: 'eyebrow' }, 'RESEARCH OUTPUT'),
            h('span', { class: 'w-pub-year' }, String(top.year || '')),
          ),
          h('h3', { class: 'w-pub-title' }, top.title || ''),
          h('p', { class: 'w-pub-authors' }, top.authors || ''),
          h('p', { class: 'w-pub-venue' }, top.venue || ''),
          h(
            'div',
            { class: 'w-pub-card-actions' },
            h('a', { class: 'w-text-link', href: '#publications' }, 'Browse publications ↗'),
            top.pdf_url
              ? h(
                  'a',
                  { class: 'btn-ghost', href: top.pdf_url, target: '_blank', rel: 'noopener' },
                  'Read paper ↓',
                )
              : null,
          ),
        )
      : h('p', { class: 'w-empty' }, 'No publications published yet.'),
  );
}

export function HomeGalleryCarousel(gallery) {
  const photos = latestGalleryItems(galleryEntries(gallery), 5);
  if (!photos.length) return null;
  let start = 0;
  const strip = h('div', { class: 'w-gallery-strip w-home-gallery' });
  const paint = () =>
    strip.replaceChildren(
      ...Array.from({ length: Math.min(photos.length, 3) }, (_, index) => {
        const p = photos[(start + index) % photos.length];
        return h(
          'a',
          { class: 'w-gallery-slide', href: '#gallery' },
          h('img', { src: p.src, alt: p.title, loading: 'lazy' }),
          h(
            'div',
            { class: 'w-gallery-meta' },
            h('span', { class: 'w-gallery-cat' }, p.cat),
            h('h3', { class: 'w-gallery-title' }, p.title),
          ),
        );
      }),
    );
  paint();
  return h(
    'section',
    { class: 'w-section w-gallery' },
    h(
      'div',
      { class: 'max-w' },
      h(
        'div',
        { class: 'w-section-heading' },
        h(
          'div',
          null,
          h('span', { class: 'eyebrow' }, 'A CLOSER LOOK'),
          h('h2', { class: 'w-section-title' }, 'Discovery, in practice.'),
        ),
        h(
          'div',
          { class: 'w-gallery-nav' },
          h(
            'button',
            {
              type: 'button',
              class: 'w-gallery-arrow',
              'aria-label': 'Previous',
              onclick: () => {
                start = (start - 1 + photos.length) % photos.length;
                paint();
              },
            },
            '←',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'w-gallery-arrow',
              'aria-label': 'Next',
              onclick: () => {
                start = (start + 1) % photos.length;
                paint();
              },
            },
            '→',
          ),
          h('a', { class: 'w-text-link', href: '#gallery' }, 'View gallery ↗'),
        ),
      ),
      strip,
    ),
  );
}

export function SponsorMarquee(sponsors) {
  const logos = (sponsors || [])
    .map((s) => ({
      src: sponsorLogoSrc(s.logo_url || s.image_url, s.name),
      name: s.name || 'Research collaborator',
    }))
    .filter((s) => s.name);
  if (!logos.length)
    logos.push(
      { src: RES.spNsf, name: 'National Science Foundation' },
      { src: RES.spVillanova, name: 'Villanova University' },
      { src: RES.spEs2, name: 'Center for Energy-Smart Electronic Systems' },
      { src: RES.spIntel, name: 'Intel' },
      { src: RES.spAmd, name: 'AMD' },
      { src: RES.spCisco, name: 'Cisco Systems' },
      { src: RES.spDelphi, name: 'Delphi Technologies' },
      { src: RES.spHoneywell, name: 'Honeywell' },
      { src: RES.spRtx, name: 'Raytheon' },
      { src: RES.spTi, name: 'Texas Instruments' },
      { src: RES.spSrc, name: 'Semiconductor Research Corporation' },
    );
  return h(
    'section',
    { class: 'w-partners', 'aria-label': 'Research collaborators' },
    h('img', {
      class: 'w-partner-backdrop',
      src: PARTNER_PHOTO.image_url,
      alt: '',
      loading: 'lazy',
    }),
    h(
      'div',
      { class: 'max-w' },
      SectionHeader('Research collaborators', null, 'OUR COMMUNITY'),
      h(
        'div',
        { class: 'w-sponsor-grid' },
        ...logos.map((logo) =>
          logo.src
            ? h('img', {
                src: logo.src,
                alt: logo.name,
                class:
                  'w-sponsor-logo' +
                  (logo.src === RES.spEs2
                    ? ' w-sponsor-logo-paper'
                    : logo.src.endsWith('.svg')
                      ? ' w-sponsor-logo-mono'
                      : ''),
                loading: 'lazy',
              })
            : h('span', { class: 'w-sponsor-name' }, logo.name),
        ),
      ),
    ),
  );
}

function JoinBanner() {
  return h(
    'section',
    { class: 'w-section w-join-section' },
    h(
      'div',
      { class: 'max-w' },
      h(
        'div',
        { class: 'w-join-banner' },
        h(
          'div',
          null,
          h('span', { class: 'eyebrow' }, 'LET’S EXPLORE WHAT’S NEXT'),
          h('h2', { class: 'w-section-title' }, 'Good questions bring us together.'),
          h(
            'p',
            null,
            'For prospective researchers, visiting scholars, and industry collaborators.',
          ),
        ),
        h(
          'div',
          { class: 'w-join-actions' },
          h('a', { class: 'w-btn w-btn-primary', href: '#join' }, 'Join the lab ↗'),
          h('a', { class: 'w-text-link', href: '#contact' }, 'Start a conversation →'),
        ),
      ),
    ),
  );
}

export function Home() {
  return h(
    'div',
    { class: 'w-home' },
    Hero(DATA.hero),
    ResearchFeature(DATA.research),
    SponsorMarquee(DATA.sponsors),
    h(
      'section',
      { class: 'w-section w-updates' },
      h('img', {
        class: 'w-updates-backdrop',
        src: '/assets/lab/two-phase-benches.png',
        alt: '',
        loading: 'lazy',
      }),
      h('div', { class: 'max-w w-two' }, FeaturedPub(DATA.pubs), NewsList(DATA.news)),
    ),
    HomeGalleryCarousel(DATA.gallery),
    JoinBanner(),
  );
}

export function sponsorLogoSrc(src, name = '') {
  const raw = String(src || '').trim();
  const label = (raw.split('/').pop() + ' ' + name).toLowerCase();
  const logos = [
    [/nsf/, RES.spNsf],
    [/es2|e3s|energy smart/, RES.spEs2],
    [/villanova/, RES.spVillanova],
    [/intel/, RES.spIntel],
    [/cisco/, RES.spCisco],
    [/delphi/, RES.spDelphi],
    [/amd/, RES.spAmd],
    [/honeywell/, RES.spHoneywell],
    [/rtx|raytheon/, RES.spRtx],
    [/texas|\bti\b/, RES.spTi],
    [/src/, RES.spSrc],
    [/nasa/, RES.spNasa],
    [/darpa/, RES.spDarpa],
  ];
  return logos.find(([pattern]) => pattern.test(label))?.[1] || raw;
}
