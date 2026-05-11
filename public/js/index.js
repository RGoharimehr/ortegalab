/* ============================================================
   LATFS public website â€” vanilla JS port of the website-ui-kit
   ============================================================ */
const IS_FILE_MODE = location.protocol === 'file:';
const PLATFORM_URL = 'http://127.0.0.1:3000/platform';
function platformHref() {
  return IS_FILE_MODE ? PLATFORM_URL : '/platform';
}

const RES = {
  logoColor:  './assets/site-logos/latfs-icon.png',
  latfsWhite: './assets/site-logos/latfs-logo-white.png',
  latfsMark:  './assets/site-logos/latfs-icon.png',
  hero1:      './assets/hero-1.png',
  hero2:      './assets/hero-2.png',
  hero3:      './assets/hero-3.png',
  fac1:       './assets/facility-1.png',
  fac2:       './assets/facility-2.png',
  fac3:       './assets/facility-3.png',
  fac4:       './assets/facility-4.png',
  rDroplet:   './assets/research-droplet.png',
  rMini:      './assets/research-minichannel.png',
  rGeo:       './assets/research-geothermal.png',
  spIntel:    './assets/sponsors/intel.svg',
  spAmd:      './assets/sponsors/amd.svg',
  spHoneywell:'./assets/sponsors/honeywell.svg',
  spRtx:      './assets/sponsors/rtx.svg',
  spTi:       './assets/sponsors/ti.svg',
  spSrc:      './assets/sponsors/src.svg',
  spNasa:     './assets/sponsors/nasa.svg',
  spDarpa:    './assets/sponsors/darpa.svg',
  spNsf:      './assets/site-logos/nsf-logo.png',
  spEs2:      './assets/site-logos/es2-official.svg',
  spVillanova:'./assets/site-logos/villanova-engineering-white.png',
};

const FALLBACK_DATA = {
  news: [
    { id: 1, date: '2024-03-20', title: 'LATFS joins NSF E3S Center', body: 'Villanova and LATFS formally joined the NSF Industry/University Cooperative Research Center on Energy Efficient Electronic Systems.' },
    { id: 2, date: '2024-02-14', title: 'Paper accepted at ITherm 2024', body: 'A new study on synthetic impinging jets and high-heat-flux cooling was accepted for presentation at ITherm 2024.' },
    { id: 3, date: '2024-01-08', title: 'Two new PhD candidates welcomed', body: 'New graduate researchers joined the lab to work on boiling heat transfer and two-phase flow instabilities.' },
  ],
  pubs: [
    { id: 1, year: 2024, title: 'Simulation of Two-Phase Flow and Heat Transfer in Mini- and Micro-Channels for Concentrating Photovoltaics Cooling', authors: 'A. Ortega, S. Kim, M. Reyes', venue: 'ASME ESFuelCell 2024' },
    { id: 2, year: 2023, title: 'Droplet Impingement Dynamics on Heated Structured Surfaces', authors: 'M. Reyes, A. Ortega', venue: 'International Journal of Heat and Mass Transfer' },
    { id: 3, year: 2022, title: 'Compact Liquid Cooling Architectures for High-Power Electronics', authors: 'A. Ortega, J. Patel, D. Hernandez', venue: 'IEEE Transactions on Components, Packaging and Manufacturing Technology' },
  ],
  people: [
    { id: 1, name: 'Alejandro Ortega', role: 'Professor', category: 'director', active: true, email: 'aortega@villanova.edu', bio: 'Directs LATFS and leads research in boiling heat transfer, compact thermal systems, and laboratory-scale diagnostics.' },
    { id: 2, name: 'Maya Reyes', role: 'PhD Candidate', category: 'phd', active: true, bio: 'Researches droplet impingement, high-speed imaging, and transient thermal measurements.' },
    { id: 3, name: 'Daniel Hernandez', role: 'PhD Candidate', category: 'phd', active: true, bio: 'Works on two-phase flow instabilities and experimental methods for electronics cooling.' },
    { id: 4, name: 'Sarah Kim', role: 'Postdoctoral Researcher', category: 'postdoc', active: true, bio: 'Focuses on compact heat exchangers, model validation, and instrumentation workflows.' },
    { id: 5, name: 'Jordan Patel', role: 'Undergraduate Researcher', category: 'ug', active: true, bio: 'Supports rig assembly, test planning, and calibration across boiling and jet-flow projects.' },
  ],
  research: [
    { id: 1, title: 'Two-Phase and Boiling Heat Transfer', summary: 'Boiling, condensation, and droplet impingement in mini- and micro-channels.', tag: '12 active projects - 8 publications', image_url: RES.rDroplet },
    { id: 2, title: 'Microchannel Heat Exchangers', summary: 'Water-cooled silicon-carbide cold plates for high-flux electronics.', tag: 'Industry partnership - Intel, AMD', image_url: RES.rMini },
    { id: 3, title: 'Energy Efficient Electronic Systems', summary: 'Thermal management for future computing and power-dense systems.', tag: 'NSF E3S Center', image_url: RES.hero2 },
    { id: 4, title: 'Renewable and Geothermal Energy', summary: 'Underground storage, solar-thermal, and working-fluid characterization.', tag: 'DOE funded', image_url: RES.rGeo },
    { id: 5, title: 'Jets and Complex Flow', summary: 'Synthetic and steady jets, vortex dynamics, and convective enhancement.', tag: 'Graduate research', image_url: RES.hero3 },
    { id: 6, title: 'Experimental Techniques', summary: 'Precision instrumentation shared across all experimental rigs.', tag: 'PIV - IR - high-speed imaging', image_url: RES.fac1 },
  ],
  facilities: [
    { id: 1, name: 'Flow-Boiling Test Rig', description: 'A configurable platform for boiling and condensation studies with optical access and temperature instrumentation.', photo_url: RES.fac1, doc_name: 'Rig overview' },
    { id: 2, name: 'Optical Diagnostics Bench', description: 'Shared imaging and illumination station for high-speed flow visualization, PIV, and infrared thermography.', photo_url: RES.fac2, doc_name: 'Instrumentation notes' },
  ],
  apps: [
    { id: 1, title: 'Pressure Drop Estimator', summary: 'A browser-based calculator for quick thermal-fluid design checks during lab meetings and coursework.' },
  ],
  downloads: [],
  settings: {
    site_theme: 'navy-gold',
    research_page_title: 'Six pillars of inquiry',
    research_page_intro: 'LATFS investigates the thermal and fluid mechanics of high-power-density systems, from boiling in microchannels to renewable thermal storage.',
    people_page_title: 'Lab members',
    people_page_intro: 'A small, hands-on lab of faculty, postdocs, and graduate researchers working at the intersection of heat transfer, fluid mechanics, and electronic systems.',
    facilities_page_title: 'Lab facilities and instruments',
    facilities_page_intro: 'Preview the rigs, instruments, and supporting documentation that power the lab.',
    downloads_page_title: 'Downloads',
    downloads_page_intro: 'Access published PDFs, data sheets, forms, and other downloadable resources shared by the lab.',
    hero_metric_research_label: 'Research areas',
    hero_metric_publications_label: 'Publications',
    hero_metric_people_label: 'Active members',
    hero_metric_facilities_label: 'Facilities',
  },
};

/* ---- Avatar helpers ---- */
const AVATAR_GRADS = [
  'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)',
  'linear-gradient(135deg,#7a5e15 0%,#b8912a 100%)',
  'linear-gradient(135deg,#162041 0%,#4a6fa5 100%)',
  'linear-gradient(135deg,#2d4a78 0%,#0f172a 100%)',
  'linear-gradient(135deg,#9a7820 0%,#d4a942 100%)',
  'linear-gradient(135deg,#1e3a5f 0%,#2d4a78 100%)',
];
function avatarGrad(name) { return AVATAR_GRADS[((name || '').charCodeAt(0) || 65) % AVATAR_GRADS.length]; }
function getInitials(name) { return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }

/* ---- DOM helper ---- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return el;
}
function el(html) { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstElementChild; }
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
async function getJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.json(); }
  catch (_) { return null; }
}

/* ---- Routes ---- */
const NAV = [
  ['home', 'Home'],
  ['research', 'Research'],
  ['people', 'People'],
  ['publications', 'Publications'],
  ['facilities', 'Facilities'],
  ['gallery', 'Gallery'],
  ['apps', 'Apps'],
  ['downloads', 'Downloads'],
  ['news', 'News'],
  ['join', 'Join'],
  ['contact', 'Contact'],
];

let state = { route: 'home', heroSlides: [], heroIdx: 0, heroTimer: null, navOpen: false };

function activePeopleRows(rows) {
  return (rows || []).filter(p => (p.active === undefined ? true : !!p.active));
}

function formatMetricCount(value, fallback) {
  const n = Number(value || 0);
  if (!n) return fallback;
  return n > 99 ? `${n}+` : String(n).padStart(2, '0');
}

function siteStats() {
  return {
    research: (DATA.research || []).length || 6,
    publications: (DATA.pubs || []).length || 30,
    people: activePeopleRows(DATA.people).length || 15,
    facilities: (DATA.facilities || []).length || 2,
    downloads: (DATA.downloads || []).length || 0,
    news: (DATA.news || []).length || 0,
  };
}

function heroMetricLabel(key, fallback) {
  return ((DATA.settings || {})[`hero_metric_${key}_label`] || fallback || '').trim() || fallback;
}

function dedupePeople(rows) {
  const merged = new Map();
  [...(rows || [])].forEach(person => {
    const key = String(person.email || person.name || person.id || '').trim().toLowerCase();
    if (!key) return;
    merged.set(key, Object.assign({}, merged.get(key) || {}, person));
  });
  return Array.from(merged.values());
}

function mergedPublicPeople(rows) {
  const live = activePeopleRows(rows || []);
  if (live.length >= 3) return live;
  return dedupePeople([...(rows || []), ...FALLBACK_DATA.people]).filter(p => (p.active === undefined ? true : !!p.active));
}

function sponsorLogoSrc(src, name='') {
  const raw = String(src || '').trim();
  const file = raw.split('/').pop().toLowerCase();
  const label = String(name || '').toLowerCase();
  if (file.includes('nsf') || label.includes('nsf')) return RES.spNsf;
  if (file.includes('es2') || file.includes('e3s') || label.includes('e3s') || label.includes('energy smart')) return RES.spEs2;
  if (file.includes('villanova') || label.includes('villanova')) return RES.spVillanova;
  if (file.includes('intel') || label.includes('intel')) return RES.spIntel;
  if (file.includes('amd') || label.includes('amd')) return RES.spAmd;
  if (file.includes('honeywell') || label.includes('honeywell')) return RES.spHoneywell;
  if (file.includes('rtx') || file.includes('raytheon') || label.includes('raytheon') || label.includes('rtx')) return RES.spRtx;
  if (file.includes('ti') || file.includes('texas') || label.includes('texas')) return RES.spTi;
  if (file.includes('src') || label.includes('src')) return RES.spSrc;
  if (file.includes('nasa') || label.includes('nasa')) return RES.spNasa;
  if (file.includes('darpa') || label.includes('darpa')) return RES.spDarpa;
  return raw || RES.spEs2;
}

function latestGalleryItems(gallery, limit=5) {
  return (gallery || [])
    .slice()
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    .slice(0, limit);
}

function fileLabelFromUrl(url) {
  const file = String(url || '').split('/').pop() || '';
  return decodeURIComponent(file);
}

function assetUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return '/' + value.replace(/^\.?\//, '');
}

function isImageDownload(item) {
  const mime = String(item?.mime_type || '').toLowerCase();
  const file = String(item?.file_url || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file);
}

function fileKindLabel(item) {
  const file = String(item?.file_url || '').split('?')[0];
  const ext = (file.split('.').pop() || item?.category || 'file').slice(0, 4).toUpperCase();
  return ext || 'FILE';
}

function fileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (!size) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function matchesQuery(parts, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return parts.filter(Boolean).join(' ').toLowerCase().includes(q);
}

function applySiteTheme(theme) {
  const nextTheme = theme === 'navy-copper' ? 'navy-copper' : 'navy-gold';
  document.body.dataset.theme = nextTheme;
}

function closeInlineApp() {
  const current = document.querySelector('.w-app-modal-bg');
  if (current) current.remove();
  document.removeEventListener('keydown', closeInlineAppOnEscape);
}

function closeInlineAppOnEscape(e) {
  if (e.key === 'Escape') closeInlineApp();
}

function openInlineApp(app) {
  closeInlineApp();
  const bg = h('div', { class: 'w-app-modal-bg', onclick: (e) => { if (e.target === bg) closeInlineApp(); } });
  const frameMarkup = `<base href="${escapeHtml(location.origin + '/')}" />${app.embed_html || ''}`;
  const frame = h('iframe', {
    class: 'w-app-frame',
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads',
    srcdoc: frameMarkup,
    title: app.title || 'Lab app'
  });
  bg.appendChild(
    h('div', { class: 'w-app-modal' },
      h('div', { class: 'w-app-modal-head' },
        h('div', { class: 'w-app-modal-copy' },
          h('h3', null, app.title || 'Lab app'),
          h('p', null, app.summary || app.description || 'Inline lab tool')
        ),
        h('div', { class: 'w-app-actions', style: { marginTop: '0' } },
          app.url ? h('a', { class: 'btn-ghost', href: app.url, target: '_blank', rel: 'noopener' }, 'Open link') : null,
          h('button', { class: 'btn-ghost', type: 'button', onclick: closeInlineApp }, 'Close')
        )
      ),
      frame
    )
  );
  document.body.appendChild(bg);
  document.addEventListener('keydown', closeInlineAppOnEscape);
}

function go(route) {
  state.route = route;
  state.navOpen = false;
  if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', () => {
  const r = location.hash.replace('#', '') || 'home';
  if (r !== state.route) { state.route = r; render(); }
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => render(), 120);
});

/* ---- Components ---- */
function Nav() {
  const links = NAV.map(([id, label]) =>
    h('span', {
      class: 'w-nav-link' + (state.route === id ? ' active' : ''),
      onclick: () => go(id),
    }, label)
  );
  const wrap = h('nav', { class: 'w-nav' },
      h('div', { class: 'w-nav-inner' },
        h('div', { class: 'w-brand', onclick: () => go('home') },
          h('img', { src: RES.logoColor, alt: 'LATFS', class: 'w-brand-img' })
        ),
      h('div', { class: 'w-nav-links' + (state.navOpen ? ' open' : '') },
        ...links,
        h('a', { class: 'w-nav-signin', href: platformHref() }, 'Sign in')
      ),
      h('button', { class: 'w-nav-toggle', 'aria-label': 'Menu', onclick: () => { state.navOpen = !state.navOpen; render(); } }, 'â˜°')
    )
  );
  return wrap;
}

function Hero(slides) {
  const usable = (slides && slides.length) ? slides : [
    { image_url: RES.hero2, title: '', subtitle: '' },
    { image_url: RES.hero3, title: '', subtitle: '' },
  ];
  state.heroSlides = usable;
  const stats = siteStats();
  const focusAreas = (DATA.research || [])
    .map(item => item.title || item.name || '')
    .filter(Boolean)
    .slice(0, 3);
  const highlightLines = focusAreas.length ? focusAreas : [
    'Two-phase flow and boiling heat transfer',
    'Compact thermal systems and electronics cooling',
    'Diagnostics, instrumentation, and lab-built rigs',
  ];

  const slideEls = usable.map((s, i) =>
    h('div', { class: 'w-hero-slide' + (i === state.heroIdx ? ' active' : ''),
      style: { backgroundImage: `url(${s.image_url || s})` } })
  );

  const dotEls = usable.map((_, i) =>
    h('button', {
      class: 'w-dot' + (i === state.heroIdx ? ' active' : ''),
      'aria-label': 'Slide ' + (i+1),
      onclick: () => { state.heroIdx = i; restartHeroTimer(); render(); }
    })
  );

  const metrics = h('div', { class: 'w-hero-metrics' },
    metric(formatMetricCount(stats.research, '06'), heroMetricLabel('research', 'Research areas')),
    metric(formatMetricCount(stats.publications, '30+'), heroMetricLabel('publications', 'Publications')),
    metric(formatMetricCount(stats.people, '15'), heroMetricLabel('people', 'Active members')),
    metric(formatMetricCount(stats.facilities, '02'), heroMetricLabel('facilities', 'Facilities'))
  );

  const hero = h('section', { class: 'w-hero' },
    ...slideEls,
    h('div', { class: 'w-hero-overlay' }),
    h('div', { class: 'w-hero-grain' }),
    h('div', { class: 'w-hero-content' },
      h('div', { class: 'w-hero-grid' },
        h('div', { class: 'w-hero-copy' },
          h('div', { class: 'w-hero-eyebrow' },
            h('span', { class: 'w-hero-dot' }),
            'Villanova University Â· Department of Mechanical Engineering'
          ),
          h('h1', { class: 'w-hero-title', html: 'Laboratory for Advanced<br>Thermal <span class="w-amp">&amp;</span> Fluid Systems' }),
          h('p', { class: 'w-hero-lead' }, 'LATFS studies boiling, compact thermal systems, and experimental fluid mechanics for high-power-density energy technologies through hands-on rigs, diagnostics, and modeling.'),
          h('div', { class: 'w-hero-actions' },
            h('button', { class: 'w-btn w-btn-primary', onclick: () => go('research') }, 'Explore research'),
            h('button', { class: 'w-btn w-btn-secondary', onclick: () => go('people') }, 'Meet the team')
          )
        ),
        h('aside', { class: 'w-hero-panel' },
          h('div', { class: 'w-hero-panel-heading' }, 'Lab snapshot'),
          h('div', { class: 'w-hero-panel-title' }, 'Hands-on thermal-fluid systems research'),
          h('p', { class: 'w-hero-panel-copy' }, 'The lab connects instrumentation, analysis, and translational engineering across electronics cooling, two-phase flow, and energy systems.'),
          h('div', { class: 'w-hero-panel-grid' },
            heroMini(formatMetricCount(stats.publications, '30+'), 'Publications'),
            heroMini(formatMetricCount(stats.people, '15'), 'Active members'),
            heroMini(formatMetricCount(stats.facilities, '02'), 'Facilities'),
            heroMini(stats.apps ? formatMetricCount(stats.apps, '01') : 'NSF', stats.apps ? 'Live apps' : 'Center partner')
          ),
          h('div', { class: 'w-hero-list' },
            ...highlightLines.map(line => h('div', { class: 'w-hero-list-item' }, line))
          )
        )
      )
    ),
    h('div', { class: 'w-hero-footer' },
      metrics,
      h('div', { class: 'w-hero-dots' }, ...dotEls)
    ),
  );
  return hero;
}
function heroMini(num, label) {
  return h('div', { class: 'w-hero-mini' },
    h('div', { class: 'w-hero-mini-num' }, num),
    h('div', { class: 'w-hero-mini-lbl' }, label)
  );
}
function metric(num, label, badge) {
  return h('div', { class: 'w-metric' + (badge ? ' w-metric-badge' : '') },
    num ? h('span', { class: 'w-metric-num' }, num) : null,
    h('span', { class: 'w-metric-lbl' }, label),
  );
}
function restartHeroTimer() {
  if (state.heroTimer) clearInterval(state.heroTimer);
  state.heroTimer = setInterval(() => {
    if (!state.heroSlides.length) return;
    state.heroIdx = (state.heroIdx + 1) % state.heroSlides.length;
    const slides = document.querySelectorAll('.w-hero-slide');
    slides.forEach((el,i) => el.classList.toggle('active', i === state.heroIdx));
    document.querySelectorAll('.w-hero-dots .w-dot').forEach((el,i) => el.classList.toggle('active', i === state.heroIdx));
  }, 6000);
}

function SectionHeader(title, action) {
  const inner = h('div', { class: 'w-sh-inner' },
    h('div', { class: 'w-sh-bar' }),
    h('h2', { class: 'w-sh-title' }, title),
  );
  return action
    ? h('div', { class: 'w-sh' }, inner, h('button', { class: 'w-link-gold', onclick: action.onClick }, action.label + ' â†’'))
    : h('div', { class: 'w-sh' }, inner);
}

function PageBanner(eyebrow, title, intro) {
  return h('div', { class: 'w-page-banner' },
    h('div', { class: 'max-w' },
      h('div', { class: 'w-page-banner-copy' },
        h('span', { class: 'eyebrow' }, eyebrow),
        h('h1',   { class: 'w-page-banner-title' }, title),
        intro ? h('p', { class: 'w-page-banner-intro' }, intro) : null
      )
    )
  );
}
function pageBannerSummary() {
  const stats = siteStats();
  const route = String(state.route || '');
  if (route === 'people' || route.startsWith('person/')) {
    return {
      label: 'Lab roster',
      note: 'Browse the people behind LATFS across faculty, graduate researchers, undergraduates, alumni, and collaborators.',
      pills: [`${stats.people} profiles`, `${stats.publications} publications`],
    };
  }
  if (route === 'publications') {
    return {
      label: 'Research output',
      note: "Track papers, venues, and citation links from the lab's published work.",
      pills: [`${stats.publications} publications`, `${stats.research} research areas`],
    };
  }
  if (route === 'facilities' || route.startsWith('facility/')) {
    return {
      label: 'Lab infrastructure',
      note: 'See the rigs, instruments, and supporting documentation that make the experiments possible.',
      pills: [`${stats.facilities} facilities`, stats.apps ? `${stats.apps} live apps` : 'Tools and docs'],
    };
  }
  if (route === 'news' || route.startsWith('news/')) {
    return {
      label: 'What is new',
      note: 'Follow milestones, conference activity, awards, and day-to-day progress from the lab.',
      pills: [`${(DATA.news || []).length} updates`, `${stats.people} active members`],
    };
  }
  if (route === 'apps') {
    return {
      label: 'Interactive tools',
      note: 'Use LATFS teaching and research tools without digging through internal resources.',
      pills: [(DATA.apps || []).length ? `${(DATA.apps || []).length} apps` : 'Tools rolling out', `${stats.research} research pillars`],
    };
  }
  if (route === 'gallery') {
    return {
      label: 'From the lab',
      note: 'Browse lab photos, experimental setups, team activity, and recent gallery uploads.',
      pills: [`${(DATA.gallery || []).length} photos`, `${stats.people} members`],
    };
  }
  if (route === 'downloads') {
    return {
      label: 'Download library',
      note: 'Published files, PDFs, office documents, media, and other downloadable resources from the lab.',
      pills: [`${stats.downloads} downloads`, `${stats.publications} publications`],
    };
  }
  return {
    label: 'LATFS at a glance',
    note: 'Experimental and computational work in thermal-fluid systems, anchored at Villanova and built for practical engineering impact.',
    pills: [`${stats.research} research areas`, `${stats.people} members`],
  };
}

function HomeQuickLinks() {
  const stats = siteStats();
  const cards = [
    { route: 'people', kicker: 'People', title: 'Meet the lab', copy: 'Browse current researchers, collaborators, and alumni with clearer profiles.', meta: `${stats.people} active members` },
    { route: 'publications', kicker: 'Outputs', title: 'Scan publications', copy: 'Jump straight into papers, venues, and citation links without digging.', meta: `${stats.publications} publications` },
    { route: 'facilities', kicker: 'Infrastructure', title: 'See the facilities', copy: 'Preview the rigs, instruments, and documentation available in the lab.', meta: `${stats.facilities} facilities` },
    { route: 'apps', kicker: 'Tools', title: 'Use lab apps', copy: 'Open interactive calculators and teaching tools tied to LATFS research.', meta: stats.apps ? `${stats.apps} live app${stats.apps === 1 ? '' : 's'}` : 'Apps coming online' },
  ];
  return h('section', { class: 'w-section', style: { paddingTop: '24px', paddingBottom: '0', background: 'var(--bg-2)' } },
    h('div', { class: 'max-w' },
      h('div', { class: 'w-quick-grid' },
        ...cards.map(card =>
          h('article', { class: 'w-quick-card', onclick: () => go(card.route) },
            h('div', { class: 'w-quick-kicker' }, card.kicker),
            h('h3', { class: 'w-quick-title' }, card.title),
            h('p', { class: 'w-quick-copy' }, card.copy),
            h('div', { class: 'w-quick-meta' }, `${card.meta} â†’`)
          )
        )
      )
    )
  );
}

const PEOPLE_GROUPS = [
  ['director',     'Director'],
  ['manager',      'Lab manager / assistant'],
  ['faculty',      'Faculty & senior researchers'],
  ['postdoc',      'Postdoctoral researchers'],
  ['phd',          'PhD candidates'],
  ['ms',           'MS students'],
  ['ug',           'Undergraduate researchers'],
  ['alumni',       'Alumni'],
  ['collaborator', 'Collaborators'],
];

function renderPeopleSections(people) {
  const sections = PEOPLE_GROUPS.map(([key, label]) => {
    const ours = people.filter(p => (p.category || '').toLowerCase() === key);
    if (!ours.length) return null;
    return h('div', { class: 'w-page-section' },
      h('h2', null, label),
      h('div', { class: 'w-people-grid' },
        ...ours.map(p => {
          const inits = getInitials(p.name);
          const grad  = avatarGrad(p.name);
          return h('div', { class: 'w-person-v2', onclick: () => go('person/' + p.id) },
            h('div', { class: 'w-avatar' },
              h('div', { class: 'w-avatar-photo', style: p.photo_url
                ? { backgroundImage: `url(${p.photo_url})`, backgroundPosition: p.photo_position || 'center center' }
                : { background: grad } }),
              p.photo_url ? null : h('div', { class: 'w-avatar-text' }, inits),
            ),
            h('div', { class: 'w-pv2-name' }, p.name || ''),
            h('div', { class: 'w-pv2-role' }, p.role || ''),
            h('span', { class: 'w-pv2-badge' }, label),
          );
        })
      )
    );
  }).filter(Boolean);
  return sections.length ? sections : [h('div', { class: 'w-empty' }, 'No people match this search yet.')];
}

function publicationCitationText(p) {
  return [p.authors, p.year ? `(${p.year}).` : '', p.title, p.venue].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function copyPublicationCitation(p) {
  const text = publicationCitationText(p);
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => alert('Citation copied to clipboard.'));
  } else {
    window.prompt('Copy citation', text);
  }
}

function publicationButtons(p) {
  return [
    p.pdf_url ? h('a', { class: 'w-pub-btn', href: p.pdf_url, target: '_blank', rel: 'noopener' }, 'PDF') : null,
    p.doi_url ? h('a', { class: 'w-pub-btn ghost', href: p.doi_url, target: '_blank', rel: 'noopener' }, 'DOI') : null,
    (p.citation_url || p.ris_url)
      ? h('a', { class: 'w-pub-btn ghost', href: p.citation_url || p.ris_url, target: '_blank', rel: 'noopener' }, 'Cite')
      : h('button', { class: 'w-pub-btn ghost', type: 'button', onclick: () => copyPublicationCitation(p) }, 'Cite')
  ];
}

function renderPublicationSections(pubs) {
  const byYear = {};
  pubs.forEach(p => { const y = p.year || 'n.d.'; (byYear[y] ||= []).push(p); });
  const years = Object.keys(byYear).sort((a, b) => String(b).localeCompare(String(a)));
  if (!years.length) return [h('div', { class: 'w-empty' }, 'No publications match this search.')];
  return years.map(y =>
    h('div', { class: 'w-page-section' },
      h('h2', null, y === 'n.d.' ? 'Other' : y),
      h('div', { class: 'w-pub-list' }, ...byYear[y].map(p =>
        h('article', { class: 'w-pub-row2' },
          h('div', { class: 'w-pub-left' },
            h('div', { class: 'w-pub-yr' }, String(p.year || '')),
            h('div', { class: 'w-pub-spine' })
          ),
          h('div', { class: 'w-pub-mid' },
            h('div', { class: 'w-pub-title2 display-serif' }, p.title || ''),
            h('div', { class: 'w-pub-authors' }, p.authors || ''),
            h('div', { class: 'w-pub-venue' }, p.venue || ''),
          ),
          h('div', { class: 'w-pub-right' }, ...publicationButtons(p))
        )
      ))
    )
  );
}

function renderFacilityCards(items) {
  if (!items.length) return h('div', { class: 'w-empty' }, 'No facilities match this search.');
  return h('div', { class: 'w-grid-2' },
    ...items.map(f => h('div', { class: 'w-fac-card', onclick: () => go('facility/' + f.id), style: { cursor: 'pointer' } },
      f.photo_url
        ? h('div', { class: 'w-fac-img', style: { backgroundImage: `url(${f.photo_url})` } })
        : h('div', { class: 'w-fac-img w-fac-img-empty' }),
      h('div', { class: 'w-fac-body' },
        h('h3',  { class: 'w-fac-title' }, f.name || ''),
        h('p',   { class: 'w-fac-desc'  }, (f.description || '').slice(0, 220) + ((f.description||'').length > 220 ? 'â€¦' : '')),
        h('span', { class: 'w-fac-cta'  }, f.doc_url ? 'View facility + docs â†’' : 'View facility â†’')
      )
    ))
  );
}

function renderNewsCards(items) {
  if (!items.length) return h('div', { class: 'w-empty' }, 'No news items match this search.');
  return h('div', { class: 'w-news-stack', style: { gap: '14px' } },
    ...items.map(n => h('article', { class: 'w-news-card', onclick: () => go('news/' + n.id), style: { cursor: 'pointer' } },
      n.image_url ? h('img', { src: n.image_url, alt: '', class: 'w-news-thumb' }) : null,
      h('div', { class: 'w-news-body-wrap' },
        h('div', { class: 'w-news-date' }, fmtNewsDate(n.date || n.published_at || n.created_at)),
        h('h3',  { class: 'w-news-title' }, n.title || ''),
        h('p',   { class: 'w-news-body' }, (n.content || n.body || n.summary || '').slice(0, 220) + (((n.content || n.body || n.summary || '').length > 220) ? 'â€¦' : '')),
      )
    ))
  );
}

function ResearchGrid(rows) {
  // Map server rows (from /api/research) into the kit's 6-pillar shape.
  const fallback = [
    { n: '01', title: 'Two-Phase & Boiling Heat Transfer', meta: '12 active projects Â· 8 publications', desc: 'Boiling, condensation, and droplet impingement in mini- and micro-channels.', img: RES.rDroplet },
    { n: '02', title: 'Microchannel Heat Exchangers', meta: 'Industry partnership Â· Intel, AMD', desc: 'Water-cooled silicon-carbide cold plates for high-flux electronics.', img: RES.rMini },
    { n: '03', title: 'Energy Efficient Electronic Systems', meta: 'NSF EÂ³S Center', desc: 'Thermal management for future computing â€” the Villanova node of the multi-university center.', img: RES.hero2 },
    { n: '04', title: 'Renewable & Geothermal Energy', meta: 'DOE funded Â· 2022â€“2025', desc: 'Underground storage, solar-thermal, and working-fluid characterization.', img: RES.rGeo },
    { n: '05', title: 'Jets & Complex Flow', meta: 'Graduate research', desc: 'Synthetic and steady jets, vortex dynamics, and convective enhancement.', img: RES.hero3 },
    { n: '06', title: 'Experimental Techniques', meta: 'PIV Â· IR Â· high-speed imaging', desc: 'Precision instrumentation shared across all experimental rigs.', img: RES.fac1 },
  ];
  let areas;
  if (Array.isArray(rows) && rows.length) {
    const imgs = [RES.rDroplet, RES.rMini, RES.hero2, RES.rGeo, RES.hero3, RES.fac1];
    areas = rows.slice(0, 6).map((r, i) => ({
      n: String(i+1).padStart(2, '0'),
      title: r.title || r.name || ('Pillar ' + (i+1)),
      desc: r.summary || r.description || r.desc || '',
      meta: r.meta || (r.tag || ''),
      img: r.image_url || imgs[i % imgs.length],
    }));
    while (areas.length < 6) areas.push(fallback[areas.length]);
  } else {
    areas = fallback;
  }

  let hover = null;
  const peekImgs = areas.map((a, i) =>
    h('div', { class: 'w-research-peek-img' + (i === 0 ? ' is-active' : ''),
               style: { backgroundImage: `url(${a.img})` }, 'data-idx': i })
  );
  const labelTitle = h('div', { class: 'w-research-peek-title' }, areas[0].title);
  const peekFrame = h('div', { class: 'w-research-peek-frame' },
    ...peekImgs,
    h('div', { class: 'w-research-peek-overlay' }),
    h('div', { class: 'w-research-peek-label' }, labelTitle),
  );

  const setHover = (i) => {
    hover = i;
    peekImgs.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
    peekFrame.classList.add('is-row-hovered');
    labelTitle.textContent = areas[i].title;
    rowEls.forEach((el, idx) => el.classList.toggle('is-hover', idx === i));
  };

  const rowEls = areas.map((a, i) =>
    h('a', {
      class: 'w-research-row',
      href: '#research',
      onclick: (e) => { e.preventDefault(); go('research'); },
      onmouseenter: () => setHover(i),
      onfocus: () => setHover(i),
    },
      h('div', { class: 'w-research-copy' },
        h('h3', { class: 'w-research-title' }, a.title),
        h('p',  { class: 'w-research-desc' },  a.desc),
        h('div',{ class: 'w-research-meta' }, a.meta),
      ),
    )
  );

  const s = DATA.settings || {};
  return h('section', { class: 'w-section w-research' },
    h('div', { class: 'max-w' },
      h('div', { class: 'w-sh', style: { marginBottom: '32px' } },
        h('div', { class: 'w-sh-inner' },
          h('div', { class: 'w-sh-bar' }),
          h('h2',  { class: 'w-sh-title' }, s.research_section_title || 'Research Areas'),
        ),
        h('div', { class: 'w-research-eyebrow' }, s.research_eyebrow || 'Six pillars Â· updated quarterly'),
      ),
      h('div', { class: 'w-research-layout' },
        h('div', { class: 'w-research-list' }, ...rowEls),
        h('div', { class: 'w-research-peek' }, peekFrame),
      )
    )
  );
}

function NewsList(news) {
  const items = (news && news.length) ? news.slice(0,3) : [
    { date: 'MAR 20, 2024', title: 'LATFS joins NSF E3S Center', body: 'Villanova and LATFS formally join the NSF Industry/University Cooperative Research Center on Energy Efficient Electronic Systems.' },
    { date: 'FEB 14, 2024', title: 'Paper accepted at ITherm 2024', body: 'Numerical investigation of synthetic impinging jets on a heated surface, led by PhD candidate M. Reyes.' },
    { date: 'JAN 08, 2024', title: 'Two new PhD candidates welcomed', body: 'A. Park and D. Hernandez join the lab working on boiling heat transfer and two-phase flow instabilities.' },
  ];
  const formatted = items.map(n => {
    const d = n.date || n.published_at || n.created_at;
    let when = d;
    if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      const dt = new Date(d);
      when = dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
    }
    return { date: when || '', title: n.title || '', body: n.body || n.summary || n.description || '' };
  });
  return h('div', null,
    SectionHeader('Latest News'),
    h('div', { class: 'w-news-stack' },
      ...formatted.map(n =>
        h('article', { class: 'w-news-card' },
          h('div', { class: 'w-news-date' }, n.date),
          h('h3',  { class: 'w-news-title' }, n.title),
          h('p',   { class: 'w-news-body' },  n.body),
        )
      )
    ),
    h('button', { class: 'w-link-gold', style: { marginTop: '10px' }, onclick: () => go('news') }, 'View all news â†’')
  );
}

function FeaturedPub(pubs) {
  const top = (pubs && pubs.length) ? pubs[0] : {
    title: 'Simulation of Two-Phase Flow and Heat Transfer in Mini- and Micro-Channels for Concentrating Photovoltaics Cooling',
    authors: 'A. Ortega, S. Kim, M. Reyes',
    venue: 'ASME ESFuelcell Â· 2024',
    year: 2024,
  };
  return h('div', null,
    SectionHeader('Featured Publication'),
    h('div', { class: 'w-pub-card' },
      h('div', { class: 'w-pub-year' }, String(top.year || 'â€”')),
      h('h3',  { class: 'w-pub-title' }, top.title || ''),
      h('p',   { class: 'w-pub-authors' }, top.authors || ''),
      h('p',   { class: 'w-pub-venue' }, top.venue || ''),
      top.pdf_url
        ? h('a', { class: 'btn-ghost', style: { marginTop: '8px', display: 'inline-block' }, href: top.pdf_url, target: '_blank' }, 'Download PDF â†“')
        : h('span', { class: 'btn-ghost', style: { marginTop: '8px', display: 'inline-block', opacity: 0.7, cursor: 'default' }, 'aria-disabled': 'true', title: 'PDF not uploaded yet' }, 'PDF coming soon')
    )
  );
}

function PhotoGallery(gallery) {
  const photos = (gallery && gallery.length) ? gallery.map(g => ({
    id: g.id, src: g.image_url || g.src || RES.fac1,
    cat: g.category || 'Lab life', title: g.caption || g.title || ''
  })) : [
    { id:1,  src: RES.fac1,     cat: 'Facilities', title: 'Flow-boiling test rig' },
    { id:2,  src: RES.rDroplet, cat: 'Research',   title: 'Droplet impingement' },
    { id:3,  src: RES.hero1,    cat: 'Lab life',   title: 'Student assembling test section' },
    { id:4,  src: RES.fac2,     cat: 'Facilities', title: 'Optical PIV bench' },
    { id:5,  src: RES.rMini,    cat: 'Research',   title: 'Microchannel array' },
    { id:6,  src: RES.hero2,    cat: 'Lab life',   title: 'Group seminar' },
    { id:7,  src: RES.fac3,     cat: 'Facilities', title: 'Environmental chamber' },
    { id:8,  src: RES.rGeo,     cat: 'Research',   title: 'Borehole rig' },
    { id:9,  src: RES.hero3,    cat: 'Lab life',   title: 'Poster session' },
    { id:10, src: RES.fac4,     cat: 'Facilities', title: 'IR thermography' },
  ];
  let stripRef;
  const scroll = (dir) => {
    if (!stripRef) return;
    const tile = stripRef.querySelector('.w-gallery-slide');
    const step = tile ? tile.getBoundingClientRect().width + 16 : 320;
    stripRef.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
  };
  const strip = h('div', { class: 'w-gallery-strip' },
    ...photos.map(p =>
      h('a', { class: 'w-gallery-slide', href: '#', onclick: (e) => e.preventDefault() },
        h('img', { src: p.src, alt: p.title, loading: 'lazy' }),
        h('div', { class: 'w-gallery-scrim' }),
        h('div', { class: 'w-gallery-meta' },
          h('div', { class: 'w-gallery-cat' }, p.cat),
          h('div', { class: 'w-gallery-title' }, p.title),
        )
      )
    )
  );
  stripRef = strip;
  return h('section', { class: 'w-section w-gallery' },
    h('div', { class: 'max-w' },
      h('div', { class: 'w-sh', style: { marginBottom: '16px' } },
        h('div', { class: 'w-sh-inner' },
          h('div', { class: 'w-sh-bar' }),
          h('h2', { class: 'w-sh-title' }, 'From the Lab'),
        ),
        h('div', { class: 'w-gallery-nav' },
          h('button', { class: 'w-gallery-arrow', 'aria-label': 'Previous', onclick: () => scroll(-1) }, '<'),
          h('button', { class: 'w-gallery-arrow', 'aria-label': 'Next',     onclick: () => scroll(1)  }, '>'),
        )
      ),
      strip
    )
  );
}

function SponsorMarquee(sponsors) {
  const logos = (sponsors && sponsors.length)
    ? sponsors.map(s => sponsorLogoSrc(s.logo_url || s.image_url, s.name)).filter(Boolean)
    : [RES.spEs2, RES.spNsf, RES.spIntel, RES.spAmd, RES.spHoneywell, RES.spRtx, RES.spTi, RES.spSrc, RES.spNasa, RES.spDarpa];
  const doubled = [...logos, ...logos];
  return h('section', { class: 'w-section' },
    h('div', { class: 'max-w' },
      SectionHeader('Research Collaborators'),
      h('div', { class: 'w-marquee-wrap' },
        h('div', { class: 'w-marquee' },
          ...doubled.map(src => h('img', { src, alt: 'Partner', class: 'w-sponsor-logo' }))
        )
      )
    )
  );
}

function Footer() {
  return h('footer', { class: 'w-footer' },
    h('div', { class: 'max-w w-footer-anchor' },
      h('div', { class: 'w-anchor-label' }, 'Home institutions'),
      h('div', { class: 'w-anchor-row' },
        h('a', { class: 'w-anchor-logo-link', href: 'http://www.es2.villanova.edu/', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spEs2, alt: 'ES2 Center for Energy-Smart Electronic Systems', class: 'w-anchor-logo is-es2' })
        ),
        h('div', { class: 'w-anchor-div' }),
        h('a', { class: 'w-anchor-logo-link', href: 'https://www.nsf.gov/eng/iip/iucrc/home.jsp', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spNsf, alt: 'National Science Foundation', class: 'w-anchor-logo is-nsf' })
        ),
        h('div', { class: 'w-anchor-div' }),
        h('a', { class: 'w-anchor-logo-link', href: 'https://www1.villanova.edu/university/engineering.html', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spVillanova, alt: 'Villanova University', class: 'w-anchor-logo is-villanova' })
        ),
      )
    ),
    h('div', { class: 'max-w w-footer-grid' },
      h('div', null,
        h('img', { src: RES.latfsWhite, alt: 'LATFS', class: 'w-foot-logo' }),
        h('p', { class: 'w-foot-sub' }, 'Laboratory for Advanced Thermal & Fluid Systems - Villanova University - 800 Lancaster Ave, Villanova PA 19085'),
      ),
      h('div', null,
        h('h4', { class: 'w-foot-h' }, 'Explore'),
        h('ul', null,
          h('li', { onclick: () => go('research') }, 'Research'),
          h('li', { onclick: () => go('people') }, 'People'),
          h('li', { onclick: () => go('apps') }, 'Apps'),
          h('li', { onclick: () => go('gallery') }, 'Gallery'),
          h('li', { onclick: () => go('downloads') }, 'Downloads'),
        ),
      ),
      h('div', null,
        h('h4', { class: 'w-foot-h' }, 'Resources'),
        h('ul', null,
          h('li', { onclick: () => go('publications') }, 'Publications'),
          h('li', { onclick: () => go('facilities') }, 'Facilities'),
          h('li', { onclick: () => go('news') }, 'News'),
          h('li', { onclick: () => go('join') }, 'Join the lab'),
        ),
      ),
      h('div', null,
        h('h4', { class: 'w-foot-h' }, 'Contact'),
        h('ul', null,
          h('li', null, 'aortega@villanova.edu'),
          h('li', null, '+1 (610) 519-4996'),
          h('li', null, 'Tolentine Hall 344'),
          h('li', { onclick: () => go('contact') }, 'Contact page'),
        ),
      ),
    ),
    h('div', { class: 'w-footer-bottom' }, '© 2026 LATFS - Villanova University - College of Engineering'),
  );
}

function galleryEntries(gallery) {
  return (gallery && gallery.length) ? gallery.map(g => ({
    id: g.id,
    src: g.image_url || g.src || RES.fac1,
    cat: g.category || 'Lab life',
    title: g.caption || g.title || 'Gallery image',
  })) : [
    { id: 1, src: RES.fac1, cat: 'Facilities', title: 'Lab overview' },
    { id: 2, src: RES.rMini, cat: 'Research', title: 'Research equipment' },
    { id: 3, src: RES.hero1, cat: 'Lab life', title: 'Experiments' },
    { id: 4, src: RES.hero2, cat: 'Lab life', title: 'Team moment' },
    { id: 5, src: RES.fac2, cat: 'Facilities', title: 'Diagnostics bench' },
  ];
}

function HomeGalleryCarousel(gallery) {
  const photos = latestGalleryItems(galleryEntries(gallery), 5);
  let start = 0;
  const strip = h('div', { class: 'w-gallery-strip' });
  const visibleCount = () => {
    if (window.innerWidth <= 760) return 1;
    if (window.innerWidth <= 1180) return 2;
    return 3;
  };
  const renderVisible = () => {
    const count = Math.min(photos.length, visibleCount());
    strip.replaceChildren(...Array.from({ length: count }, (_, idx) => {
      const p = photos[(start + idx) % photos.length];
      return h('button', { class: 'w-gallery-slide', type: 'button', onclick: () => go('gallery') },
        h('img', { src: p.src, alt: p.title, loading: 'lazy' }),
        h('div', { class: 'w-gallery-scrim' }),
        h('div', { class: 'w-gallery-meta' },
          h('div', { class: 'w-gallery-cat' }, p.cat),
          h('div', { class: 'w-gallery-title' }, p.title),
          h('div', { class: 'w-gallery-sub' }, 'Latest gallery upload')
        )
      );
    }));
  };
  const rotate = (dir) => {
    if (!photos.length) return;
    start = (start + dir + photos.length) % photos.length;
    renderVisible();
  };
  renderVisible();
  return h('section', { class: 'w-section w-gallery' },
    h('div', { class: 'max-w' },
      h('div', { class: 'w-sh', style: { marginBottom: '16px' } },
        h('div', { class: 'w-sh-inner' },
          h('div', { class: 'w-sh-bar' }),
          h('h2', { class: 'w-sh-title' }, 'From the Lab')
        ),
        h('div', { class: 'w-gallery-nav' },
          h('button', { class: 'w-gallery-arrow', type: 'button', 'aria-label': 'Previous', onclick: () => rotate(-1) }, '<'),
          h('button', { class: 'w-gallery-arrow', type: 'button', 'aria-label': 'Next', onclick: () => rotate(1) }, '>')
        )
      ),
      strip,
      h('button', { class: 'w-link-gold', style: { marginTop: '14px' }, onclick: () => go('gallery') }, 'Open full gallery')
    )
  );
}

function renderPublicationTable(pubs) {
  const ordered = (pubs || [])
    .slice()
    .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || String(a.title || '').localeCompare(String(b.title || '')));
  if (!ordered.length) return [h('div', { class: 'w-empty' }, 'No publications match this search.')];
  return [
    h('div', { class: 'w-page-section' },
      h('div', { class: 'w-pub-list' },
        h('div', { class: 'w-pub-row2 w-pub-head' },
          h('div', { class: 'w-pub-colhead' }, 'Year'),
          h('div', { class: 'w-pub-colhead' }, 'Title'),
          h('div', { class: 'w-pub-colhead w-pub-colhead-actions' }, 'Links')
        ),
        ...ordered.map(p =>
          h('article', { class: 'w-pub-row2' },
            h('div', { class: 'w-pub-left' },
              h('div', { class: 'w-pub-yr' }, String(p.year || 'â€”'))
            ),
            h('div', { class: 'w-pub-mid' },
              h('div', { class: 'w-pub-title2' }, p.title || ''),
              h('div', { class: 'w-pub-authors' }, p.authors || ''),
              h('div', { class: 'w-pub-venue' }, p.venue || '')
            ),
            h('div', { class: 'w-pub-right' }, ...publicationButtons(p))
          )
        )
      )
    )
  ];
}

function openGalleryPreview(photo) {
  const close = () => overlay.remove();
  const overlay = h('div', {
    class: 'w-lightbox-bg',
    onclick: event => { if (event.target === overlay) close(); }
  },
    h('div', { class: 'w-lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': photo.title || 'Gallery image' },
      h('img', { class: 'w-lightbox-img', src: photo.src, alt: photo.title || 'Gallery image' }),
      h('div', { class: 'w-lightbox-meta' },
        h('div', null,
          h('strong', null, photo.title || 'Gallery image'),
          h('span', null, photo.cat || 'Lab photo')
        ),
        h('button', { class: 'w-lightbox-close', type: 'button', onclick: close }, 'Close')
      )
    )
  );
  document.body.appendChild(overlay);
  const closeButton = overlay.querySelector('button');
  closeButton && closeButton.focus();
}

function renderGalleryGrid(items) {
  if (!items.length) return h('div', { class: 'w-empty' }, 'No gallery images published yet.');
  return h('div', { class: 'w-gallery-strip is-gallery-page' },
    ...items.map(p =>
      h('button', { class: 'w-gallery-slide', type: 'button', onclick: () => openGalleryPreview(p) },
        h('img', { src: p.src, alt: p.title, loading: 'lazy' }),
        h('div', { class: 'w-gallery-scrim' }),
        h('div', { class: 'w-gallery-meta' },
          h('div', { class: 'w-gallery-cat' }, p.cat),
          h('div', { class: 'w-gallery-title' }, p.title)
        )
      )
    )
  );
}

function renderDownloadList(items) {
  if (!items.length) return [h('div', { class: 'w-empty' }, 'No downloads published yet.')];
  return [
    h('div', { class: 'w-page-section' },
      h('div', { class: 'w-pub-list' },
        ...items.map(item => {
          const href = assetUrl(item.file_url);
          const preview = isImageDownload(item)
            ? h('img', { class: 'w-download-thumb', src: href, alt: item.title || item.name || 'Download preview' })
            : h('div', { class: 'w-download-fileicon' }, fileKindLabel(item));
          return h('article', { class: 'w-pub-row2 w-download-row' },
            h('div', { class: 'w-pub-left' },
              h('div', { class: 'w-pub-yr' }, (item.category || 'File').slice(0, 4).toUpperCase())
            ),
            h('div', { class: 'w-pub-mid' },
              h('div', { class: 'w-download-title' },
                preview,
                h('div', null,
                  h('div', { class: 'w-pub-title2' }, item.title || item.name || fileLabelFromUrl(item.file_url)),
                  h('div', { class: 'w-pub-authors' }, item.description || 'Downloadable lab resource'),
                  h('div', { class: 'w-pub-venue' }, [item.category, fileSizeLabel(item.file_size), item.mime_type].filter(Boolean).join(' - '))
                )
              )
            ),
            h('div', { class: 'w-pub-right' },
              href
                ? h('a', { class: 'w-pub-btn', href, target: '_blank', rel: 'noopener', download: fileLabelFromUrl(href) || '' }, 'Download')
                : h('span', { class: 'w-pub-btn', style: { opacity: '.45', pointerEvents: 'none' } }, 'Unavailable')
            )
          );
        })
      )
    )
  ];
}

function PublicFooter() {
  return h('footer', { class: 'w-footer' },
    h('div', { class: 'max-w w-footer-anchor' },
      h('div', { class: 'w-anchor-label' }, 'Home institutions'),
      h('div', { class: 'w-anchor-row' },
        h('a', { class: 'w-anchor-logo-link', href: 'http://www.es2.villanova.edu/', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spEs2, alt: 'ES2 Center for Energy-Smart Electronic Systems', class: 'w-anchor-logo is-es2' })
        ),
        h('div', { class: 'w-anchor-div' }),
        h('a', { class: 'w-anchor-logo-link', href: 'https://www.nsf.gov/eng/iip/iucrc/home.jsp', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spNsf, alt: 'National Science Foundation', class: 'w-anchor-logo is-nsf' })
        ),
        h('div', { class: 'w-anchor-div' }),
        h('a', { class: 'w-anchor-logo-link', href: 'https://www1.villanova.edu/university/engineering.html', target: '_blank', rel: 'noopener' },
          h('img', { src: RES.spVillanova, alt: 'Villanova University College of Engineering', class: 'w-anchor-logo is-villanova' })
        )
      )
    ),
    h('div', { class: 'max-w w-footer-grid' },
      h('div', null,
        h('img', { src: RES.latfsWhite, alt: 'LATFS', class: 'w-foot-logo' }),
        h('p', { class: 'w-foot-sub' }, 'Laboratory for Advanced Thermal & Fluid Systems - Villanova University - 800 Lancaster Ave, Villanova PA 19085')
      ),
      h('div', null,
        h('h4', { class: 'w-foot-h' }, 'Explore'),
        h('ul', null,
          h('li', { onclick: () => go('research') }, 'Research'),
          h('li', { onclick: () => go('people') }, 'People'),
          h('li', { onclick: () => go('apps') }, 'Apps'),
          h('li', { onclick: () => go('gallery') }, 'Gallery'),
          h('li', { onclick: () => go('downloads') }, 'Downloads')
        )
      ),
      h('div', null,
        h('h4', { class: 'w-foot-h' }, 'Resources'),
        h('ul', null,
          h('li', { onclick: () => go('publications') }, 'Publications'),
          h('li', { onclick: () => go('facilities') }, 'Facilities'),
          h('li', { onclick: () => go('news') }, 'News'),
          h('li', { onclick: () => go('join') }, 'Join the lab')
        )
      ),
      h('div', null,
        h('h4', { class: 'w-foot-h' }, 'Contact'),
        h('ul', null,
          h('li', null, 'aortega@villanova.edu'),
          h('li', null, '+1 (610) 519-4996'),
          h('li', null, 'Tolentine Hall 344'),
          h('li', { onclick: () => go('contact') }, 'Contact page')
        )
      )
    ),
    h('div', { class: 'w-footer-bottom' }, '© 2026 LATFS - Villanova University - College of Engineering')
  );
}

/* ---- Cached data ---- */
let DATA = {
  news: FALLBACK_DATA.news,
  pubs: FALLBACK_DATA.pubs,
  people: FALLBACK_DATA.people,
  research: FALLBACK_DATA.research,
  gallery: null,
  sponsors: null,
  hero: null,
  facilities: FALLBACK_DATA.facilities,
  apps: FALLBACK_DATA.apps,
  settings: FALLBACK_DATA.settings,
};

function pickRows(rows, fallback) {
  return Array.isArray(rows) && rows.length ? rows : fallback;
}

async function loadAll() {
  if (IS_FILE_MODE) {
    DATA = {
      news: FALLBACK_DATA.news,
      pubs: FALLBACK_DATA.pubs,
      people: FALLBACK_DATA.people,
      research: FALLBACK_DATA.research,
      gallery: null,
      sponsors: null,
      hero: null,
      facilities: FALLBACK_DATA.facilities,
      apps: FALLBACK_DATA.apps,
      downloads: FALLBACK_DATA.downloads,
      settings: FALLBACK_DATA.settings,
    };
    return;
  }
  const [news, pubs, people, research, gallery, sponsors, hero, facilities, apps, downloads, settings] = await Promise.all([
    getJSON('/api/news'),
    getJSON('/api/publications'),
    getJSON('/api/people/public'),
    getJSON('/api/research'),
    getJSON('/api/gallery'),
    getJSON('/api/sponsors'),
    getJSON('/api/hero-slides'),
    getJSON('/api/facilities'),
    getJSON('/api/apps'),
    getJSON('/api/downloads'),
    getJSON('/api/site-settings'),
  ]);
  DATA = {
    news: pickRows(news, FALLBACK_DATA.news),
    pubs: pickRows(pubs, FALLBACK_DATA.pubs),
    people: pickRows(people, FALLBACK_DATA.people),
    research: pickRows(research, FALLBACK_DATA.research),
    gallery: gallery || null,
    sponsors: sponsors || null,
    hero: pickRows(hero, null),
    facilities: pickRows(facilities, FALLBACK_DATA.facilities),
    apps: pickRows(apps, FALLBACK_DATA.apps),
    downloads: pickRows(downloads, FALLBACK_DATA.downloads),
    settings: settings || FALLBACK_DATA.settings,
  };
}

/* ---- Pages ---- */
function Home() {
  const homeBody = h('div', null,
    Hero(DATA.hero),
    ResearchGrid(DATA.research),
    h('section', { class: 'w-section', style: { background: 'var(--bg-2)', paddingTop: '0' } },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-two' },
          NewsList(DATA.news),
          FeaturedPub(DATA.pubs),
        )
      )
    ),
    HomeGalleryCarousel(DATA.gallery),
    SponsorMarquee(DATA.sponsors),
  );
  return homeBody;
}

function PageResearch() {
  const items = (DATA.research && DATA.research.length) ? DATA.research : [];
  const s = DATA.settings || {};
  const cards = items.length
    ? items.map((r, i) =>
        h('div', { class: 'w-rc' },
          h('div', { class: 'w-rc-title' }, r.title || r.name || ''),
          h('p',   { class: 'w-rc-desc'  }, r.summary || r.description || r.desc || ''),
        )
      )
    : [h('div', { class: 'w-empty' }, 'No research areas yet.')];
  return h('div', null,
    PageBanner('Research', s.research_page_title || 'Six pillars of inquiry',
      s.research_page_intro || 'LATFS investigates the thermal and fluid mechanics of high-power-density systems â€” from boiling in microchannels to renewable thermal storage.'),
    h('section', { class: 'w-page-content' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-grid-3' }, ...cards)
      )
    )
  );
}

function PagePeople() {
  const people = mergedPublicPeople(DATA.people);
  let activeCategory = 'all';
  const s = DATA.settings || {};
  const categoryCounts = [['all', 'All members', people.length], ...PEOPLE_GROUPS
    .map(([key, label]) => [key, label, people.filter(p => (p.category || '').toLowerCase() === key).length])
    .filter(([, , count]) => count)];
  const searchInput = h('input', { class: 'w-filter-input', type: 'search', placeholder: 'Search by name, role, or research area' });
  const meta = h('div', { class: 'w-filter-meta' });
  const pills = h('div', { class: 'w-filter-pills' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const filtered = people.filter(p => {
      const inCategory = activeCategory === 'all' || (p.category || '').toLowerCase() === activeCategory;
      return inCategory && matchesQuery([p.name, p.role, p.bio, p.category], query);
    });
    meta.textContent = `${filtered.length} member${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(...renderPeopleSections(filtered));
    pills.querySelectorAll('.w-filter-pill').forEach(btn => btn.classList.toggle('active', btn.dataset.value === activeCategory));
  };
  categoryCounts.forEach(([value, label, count]) => {
    const btn = h('button', {
      class: 'w-filter-pill' + (value === activeCategory ? ' active' : ''),
      type: 'button',
      'data-value': value,
      onclick: () => { activeCategory = value; applyFilters(); }
    }, `${label} (${count})`);
    pills.appendChild(btn);
  });
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
  return h('div', null,
    PageBanner('People', s.people_page_title || 'Lab members',
      s.people_page_intro || 'A small, hands-on lab of faculty, postdocs, and graduate researchers working at the intersection of heat transfer, fluid mechanics, and electronic systems.'),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-filter-shell' },
          h('div', { class: 'w-filter-row' },
            h('div', { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput
            ),
            meta
          ),
          h('div', { class: 'w-filter-row' }, pills)
        ),
        results
      )
    )
  );
}

function PagePersonDetail(id) {
  const p = mergedPublicPeople(DATA.people).find(x => String(x.id) === String(id));
  if (!p) return h('div', null,
    PageBanner('People', 'Person not found', ''),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('a', { class: 'w-back', onclick: () => go('people') }, 'â† Back to People'),
        h('div', { class: 'w-empty' }, 'Person not found.')
      )
    )
  );
  const inits = getInitials(p.name);
  const grad  = avatarGrad(p.name);
  const links = [];
  if (p.email)        links.push(h('a', { href: 'mailto:' + p.email }, 'Email'));
  if (p.linkedin_url) links.push(h('a', { href: p.linkedin_url, target: '_blank', rel: 'noopener' }, 'LinkedIn'));
  if (p.website_url)  links.push(h('a', { href: p.website_url,  target: '_blank', rel: 'noopener' }, 'Website'));
  return h('div', null,
    PageBanner(p.role || 'People', p.name || '', ''),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('a', { class: 'w-back', onclick: () => go('people') }, 'â† Back to People'),
        h('div', { class: 'w-person-detail-v2' },
          h('div', { class: 'w-avatar' },
            h('div', { class: 'w-avatar-photo', style: p.photo_url
              ? { backgroundImage: `url(${p.photo_url})`, backgroundPosition: p.photo_position || 'center center' }
              : { background: grad } }),
            p.photo_url ? null : h('div', { class: 'w-avatar-text' }, inits),
          ),
          h('h2', { class: 'w-pdetail-name' }, p.name || ''),
          h('div', { class: 'w-pdetail-sub' }, [p.role, p.category].filter(Boolean).join(' Â· ')),
          p.bio
            ? h('div', { class: 'w-pdetail-bio' }, p.bio)
            : h('div', { class: 'w-pdetail-bio', style: { color: 'var(--fg-4)', fontStyle: 'italic' } }, 'Biography coming soon.'),
          links.length ? h('div', { class: 'w-pdetail-links' }, ...links) : null,
        )
      )
    )
  );
}

function PagePublications() {
  const pubs = DATA.pubs || [];
  const yearOptions = ['all', ...Array.from(new Set(pubs.map(p => String(p.year || 'n.d.')))).sort((a, b) => String(b).localeCompare(String(a)))];
  const searchInput = h('input', { class: 'w-filter-input', type: 'search', placeholder: 'Search title, authors, or venue' });
  const yearSelect = h('select', { class: 'w-filter-select' },
    ...yearOptions.map(y => h('option', { value: y }, y === 'all' ? 'All years' : (y === 'n.d.' ? 'Other' : y)))
  );
  const meta = h('div', { class: 'w-filter-meta' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const year = yearSelect.value;
    const filtered = pubs.filter(p => {
      const matchesYear = year === 'all' || String(p.year || 'n.d.') === year;
      return matchesYear && matchesQuery([p.title, p.authors, p.venue], query);
    });
    meta.textContent = `${filtered.length} publication${filtered.length === 1 ? '' : 's'} shown`;
        results.replaceChildren(...renderPublicationTable(filtered));
  };
  searchInput.addEventListener('input', applyFilters);
  yearSelect.addEventListener('change', applyFilters);
  applyFilters();
  return h('div', null,
    PageBanner('Publications', 'Selected publications',
      'Peer-reviewed journal articles, conference proceedings, and invited talks. Reach out for any preprint not linked here.'),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-filter-shell' },
          h('div', { class: 'w-filter-row' },
            h('div', { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput
            ),
            yearSelect,
            meta
          )
        ),
        results
      )
    )
  );
}

function PageFacilities() {
  const facs = DATA.facilities || [];
  const s = DATA.settings || {};
  let docsOnly = false;
  const searchInput = h('input', { class: 'w-filter-input', type: 'search', placeholder: 'Search equipment, rigs, or documentation' });
  const meta = h('div', { class: 'w-filter-meta' });
  const pills = h('div', { class: 'w-filter-pills' });
  const results = h('div', { class: 'w-results-stack' });
  const pillDefs = [
    ['all', 'All facilities'],
    ['docs', 'With documentation'],
  ];
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const filtered = facs.filter(f => {
      const passesDocs = !docsOnly || !!f.doc_url;
      return passesDocs && matchesQuery([f.name, f.description, f.content, f.doc_name], query);
    });
    meta.textContent = `${filtered.length} facilit${filtered.length === 1 ? 'y' : 'ies'} shown`;
    results.replaceChildren(renderFacilityCards(filtered));
    pills.querySelectorAll('.w-filter-pill').forEach(btn => {
      const active = docsOnly ? btn.dataset.value === 'docs' : btn.dataset.value === 'all';
      btn.classList.toggle('active', active);
    });
  };
  pillDefs.forEach(([value, label]) => {
    pills.appendChild(h('button', {
      class: 'w-filter-pill' + (value === 'all' ? ' active' : ''),
      type: 'button',
      'data-value': value,
      onclick: () => { docsOnly = value === 'docs'; applyFilters(); }
    }, label));
  });
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
  return h('div', null,
    PageBanner('Facilities', s.facilities_page_title || 'Lab facilities & instruments',
      s.facilities_page_intro || 'Click any facility to see photos, the full description, and any documentation we have on it.'),
    h('section', { class: 'w-page-content' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-filter-shell' },
          h('div', { class: 'w-filter-row' },
            h('div', { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput
            ),
            meta
          ),
          h('div', { class: 'w-filter-row' }, pills)
        ),
        results
      )
    )
  );
}

function PageFacilityDetail(id) {
  const f = (DATA.facilities || []).find(x => String(x.id) === String(id));
  if (!f) return h('div', null,
    PageBanner('Facilities', 'Facility not found', ''),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('a', { class: 'w-back', onclick: () => go('facilities') }, 'â† Back to Facilities'),
        h('div', { class: 'w-empty' }, 'Facility not found.')
      )
    )
  );
  const docs = [];
  if (f.doc_url) docs.push(h('a', { class: 'w-doc-link', href: f.doc_url, target: '_blank', rel: 'noopener' },
    h('span', { class: 'w-doc-icon' }, 'ðŸ“„'),
    h('span', { class: 'w-doc-name' }, f.doc_name || 'Documentation'),
    h('span', { class: 'w-doc-sub' },  'Open file')
  ));
  return h('div', null,
    PageBanner('Facility', f.name || '', ''),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('a', { class: 'w-back', onclick: () => go('facilities') }, 'â† Back to Facilities'),
        h('article', { class: 'w-fac-detail' },
          f.photo_url ? h('img', { src: f.photo_url, alt: '', class: 'w-fac-detail-img' }) : null,
          h('div', { class: 'w-news-body-rich' }, f.content || f.description || ''),
          docs.length ? h('div', { class: 'w-page-section' }, h('h2', null, 'Documentation'), ...docs) : null,
        )
      )
    )
  );
}

function PageApps() {
  const apps = DATA.apps || [];
  return h('div', null,
    PageBanner('Apps', 'Lab apps & calculators',
      'Browser-based mini-applications produced by the lab â€” calculators, regime maps, and interactive teaching tools tied to our research.'),
    h('section', { class: 'w-page-content' },
      h('div', { class: 'max-w' },
        apps.length
          ? h('div', { class: 'w-grid-2' },
              ...apps.map(a => h('div', { class: 'w-card' },
                h('h3', null, a.title || ''),
                h('p',  null, a.summary || a.description || ''),
                h('div', { class: 'w-app-actions' },
                  a.embed_html
                    ? h('button', { class: 'btn-primary', type: 'button', onclick: () => openInlineApp(a) }, 'Launch app')
                    : null,
                  a.url
                    ? h('a', { class: a.embed_html ? 'btn-ghost' : 'btn-primary', href: assetUrl(a.url), target: '_blank', rel: 'noopener' }, a.embed_html ? 'Open link' : 'Launch app')
                    : null,
                  !a.url && !a.embed_html
                    ? h('span', { class: 'eyebrow', style: { color: 'var(--fg-4)' } }, 'Coming soon')
                    : null
                )
              )))
          : h('div', { class: 'w-empty' }, 'No apps published yet.')
      )
    )
  );
}

function PageGallery() {
  const photos = galleryEntries(DATA.gallery);
  return h('div', null,
    PageBanner('Gallery', 'From the lab',
      'The latest lab photos, setups, people, and research moments from the gallery.'),
    h('section', { class: 'w-page-content' },
      h('div', { class: 'max-w' },
        renderGalleryGrid(photos)
      )
    )
  );
}

function PageDownloads() {
  const s = DATA.settings || {};
  const items = (DATA.downloads || []).slice().sort((a, b) =>
    String(a.category || '').localeCompare(String(b.category || '')) ||
    String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''))
  );
  const cats = Array.from(new Set(items.map(item => item.category || 'File'))).sort((a, b) => a.localeCompare(b));
  const searchInput = h('input', { class: 'w-filter-input', type: 'search', placeholder: 'Search downloads by title, description, type, or file name' });
  const categorySelect = h('select', { class: 'w-filter-select' },
    h('option', { value: 'all' }, 'All categories'),
    ...cats.map(cat => h('option', { value: cat }, cat))
  );
  const meta = h('div', { class: 'w-filter-meta' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const category = categorySelect.value;
    const filtered = items.filter(item =>
      (category === 'all' || (item.category || 'File') === category) &&
      matchesQuery([item.title, item.name, item.description, item.category, item.mime_type, item.file_url], query)
    );
    meta.textContent = `${filtered.length} download${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(...renderDownloadList(filtered));
  };
  searchInput.addEventListener('input', applyFilters);
  categorySelect.addEventListener('change', applyFilters);
  applyFilters();
  return h('div', null,
    PageBanner('Downloads', s.downloads_page_title || 'Downloads',
      s.downloads_page_intro || 'Access published PDFs, documents, media, and downloadable resources shared by the lab.'),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-filter-shell' },
          h('div', { class: 'w-filter-row' },
            h('div', { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput
            ),
            categorySelect,
            meta
          )
        ),
        results
      )
    )
  );
}

function fmtNewsDate(when) {
  if (!when) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(when)) {
    const dt = new Date(when);
    return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  }
  return when;
}

function PageNews() {
  const news = DATA.news || [];
  const searchInput = h('input', { class: 'w-filter-input', type: 'search', placeholder: 'Search titles, announcements, or milestones' });
  const meta = h('div', { class: 'w-filter-meta' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const filtered = news.filter(n => matchesQuery([n.title, n.content, n.body, n.summary, n.date], query));
    meta.textContent = `${filtered.length} update${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(renderNewsCards(filtered));
  };
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
  return h('div', null,
    PageBanner('News', 'Updates from the lab',
      'New papers, awards, and milestones. Click any item to read the full story.'),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-filter-shell' },
          h('div', { class: 'w-filter-row' },
            h('div', { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput
            ),
            meta
          )
        ),
        results
      )
    )
  );
}

function PageNewsDetail(id) {
  const n = (DATA.news || []).find(x => String(x.id) === String(id));
  if (!n) return h('div', null,
    PageBanner('News', 'Not found', ''),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('a', { class: 'w-back', onclick: () => go('news') }, 'â† Back to News'),
        h('div', { class: 'w-empty' }, 'News item not found.')
      )
    )
  );
  return h('div', null,
    PageBanner(fmtNewsDate(n.date || n.published_at || n.created_at), n.title || '', ''),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('a', { class: 'w-back', onclick: () => go('news') }, 'â† Back to News'),
        h('article', { class: 'w-news-detail' },
          n.image_url ? h('img', { src: n.image_url, alt: '', class: 'w-news-detail-img' }) : null,
          h('div', { class: 'w-news-body-rich' }, n.content || n.body || ''),
        )
      )
    )
  );
}

function PageJoin() {
  const cards = [
    { icon: 'ðŸŽ“', title: 'Prospective PhD students', body: 'Apply through the Villanova ME PhD program and email Prof. Ortega with a CV, transcripts, and a one-paragraph research statement.' },
    { icon: 'ðŸ“', title: 'MS / Undergraduate', body: 'Course-based research projects available. Contact the lab to discuss what you would like to learn.' },
    { icon: 'ðŸ­', title: 'Industry collaboration', body: 'We partner with industry on directed research, often through the NSF EÂ³S Center. Reach out for membership and project framing.' },
    { icon: 'âœˆï¸', title: 'Visiting scholars', body: 'Short and long visits are arranged on a case-by-case basis with the right alignment and bench space.' },
  ];
  return h('div', null,
    PageBanner('Join', 'Work with LATFS',
      'We welcome motivated graduate, undergraduate, and visiting researchers. Funded positions are announced on the news page.'),
    h('section', { class: 'w-page-content' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-grid-2' },
          ...cards.map(c =>
            h('div', { class: 'w-icon-card' },
              h('span', { class: 'w-icon-card-icon' }, c.icon),
              h('h3', null, c.title),
              h('p',  null, c.body),
            )
          )
        )
      )
    )
  );
}

function PageContact() {
  return h('div', null,
    PageBanner('Contact', 'Get in touch',
      'For research collaborations, prospective student inquiries, and press, the fastest route is email.'),
    h('section', { class: 'w-page-content on-white' },
      h('div', { class: 'max-w' },
        h('div', { class: 'w-grid-2' },
          h('div', { class: 'w-icon-card' },
            h('span', { class: 'w-icon-card-icon' }, 'ðŸ‘¤'),
            h('h3', null, 'Director'),
            h('p',  null, 'Dr. Alfonso Ortega', h('br'), 'aortega@villanova.edu', h('br'), '+1 (610) 519-4996'),
          ),
          h('div', { class: 'w-icon-card' },
            h('span', { class: 'w-icon-card-icon' }, 'ðŸ›ï¸'),
            h('h3', null, 'Mailing address'),
            h('p',  null, 'Tolentine Hall 344', h('br'), 'Villanova University', h('br'), '800 Lancaster Avenue', h('br'), 'Villanova, PA 19085'),
          ),
        )
      )
    )
  );
}

const PAGES = { home: Home, research: PageResearch, people: PagePeople, publications: PagePublications, facilities: PageFacilities, gallery: PageGallery, apps: PageApps, downloads: PageDownloads, news: PageNews, join: PageJoin, contact: PageContact };

function render() {
  const root = document.getElementById('app');
  applySiteTheme((DATA.settings || FALLBACK_DATA.settings || {}).site_theme);
  root.innerHTML = '';
  root.appendChild(Nav());
  const m = /^([a-z]+)\/(.+)$/.exec(state.route || '');
  let pageEl;
  if (m) {
    const [, kind, id] = m;
    if (kind === 'person')        pageEl = PagePersonDetail(id);
    else if (kind === 'news')     pageEl = PageNewsDetail(id);
    else if (kind === 'facility') pageEl = PageFacilityDetail(id);
    else pageEl = (PAGES[kind] || Home)();
  } else {
    const Page = PAGES[state.route] || Home;
    pageEl = Page();
  }
  root.appendChild(pageEl);
  root.appendChild(PublicFooter());
  if (state.route === 'home') restartHeroTimer();
  else if (state.heroTimer) { clearInterval(state.heroTimer); state.heroTimer = null; }
}

(async function init() {
  state.route = (location.hash.replace('#','') || 'home');
  applySiteTheme(FALLBACK_DATA.settings.site_theme);
  render();
  await loadAll();
  applySiteTheme((DATA.settings || FALLBACK_DATA.settings || {}).site_theme);
  render();
})();
