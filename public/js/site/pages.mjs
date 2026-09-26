import { h } from './dom.mjs';
import {
  renderPeopleSections,
  renderFacilityCards,
  renderNewsCards,
  renderPublicationTable,
  renderGalleryGrid,
  renderDownloadList,
  galleryEntries,
} from './collections.mjs';
import { PEOPLE_GROUPS } from './config.mjs';
import { DATA } from './data.mjs';
import { PageBanner } from './layout.mjs';
import { openInlineApp } from './overlays.mjs';
import {
  avatarGrad,
  getInitials,
  activePeopleRows,
  assetUrl,
  matchesQuery,
  fmtNewsDate,
} from './utils.mjs';

export function PageResearch() {
  const items = DATA.research && DATA.research.length ? DATA.research : [];
  const s = DATA.settings || {};
  const cards = items.length
    ? items.map((r) =>
        h(
          'div',
          { class: 'w-rc' },
          h('div', { class: 'w-rc-title' }, r.title || r.name || ''),
          h('p', { class: 'w-rc-desc' }, r.summary || r.description || r.desc || ''),
        ),
      )
    : [h('div', { class: 'w-empty' }, 'No research areas yet.')];
  return h(
    'div',
    null,
    PageBanner(
      'Research',
      s.research_page_title || 'Research areas',
      s.research_page_intro ||
        'LATFS investigates the thermal and fluid mechanics of high-power-density systems — from boiling in microchannels to renewable thermal storage.',
    ),
    h(
      'section',
      { class: 'w-page-content' },
      h('div', { class: 'max-w' }, h('div', { class: 'w-grid-3' }, ...cards)),
    ),
  );
}

export function PagePeople() {
  const people = activePeopleRows(DATA.people);
  let activeCategory = 'all';
  const s = DATA.settings || {};
  const categoryCounts = [
    ['all', 'All members', people.length],
    ...PEOPLE_GROUPS.map(([key, label]) => [
      key,
      label,
      people.filter((p) =>
        key === 'other'
          ? !PEOPLE_GROUPS.some(
              ([category]) => category !== 'other' && category === (p.category || '').toLowerCase(),
            )
          : (p.category || '').toLowerCase() === key,
      ).length,
    ]).filter(([, , count]) => count),
  ];
  const searchInput = h('input', {
    class: 'w-filter-input',
    type: 'search',
    'aria-label': 'Search by name, role, or research area',
    placeholder: 'Search by name, role, or research area',
  });
  const meta = h('div', { class: 'w-filter-meta', role: 'status', 'aria-live': 'polite' });
  const pills = h('div', { class: 'w-filter-pills' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const filtered = people.filter((p) => {
      const inCategory =
        activeCategory === 'all' ||
        (activeCategory === 'other'
          ? !PEOPLE_GROUPS.some(
              ([key]) => key !== 'other' && key === (p.category || '').toLowerCase(),
            )
          : (p.category || '').toLowerCase() === activeCategory);
      return inCategory && matchesQuery([p.name, p.role, p.bio, p.category], query);
    });
    meta.textContent = `${filtered.length} member${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(...renderPeopleSections(filtered));
    pills.querySelectorAll('.w-filter-pill').forEach((btn) => {
      const active = btn.dataset.value === activeCategory;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };
  categoryCounts.forEach(([value, label, count]) => {
    const btn = h(
      'button',
      {
        class: 'w-filter-pill' + (value === activeCategory ? ' active' : ''),
        type: 'button',
        'data-value': value,
        onclick: () => {
          activeCategory = value;
          applyFilters();
        },
      },
      `${label} (${count})`,
    );
    pills.appendChild(btn);
  });
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
  return h(
    'div',
    null,
    PageBanner(
      'People',
      s.people_page_title || 'Lab members',
      s.people_page_intro ||
        'A small, hands-on lab of faculty, postdocs, and graduate researchers working at the intersection of heat transfer, fluid mechanics, and electronic systems.',
    ),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-filter-shell' },
          h(
            'div',
            { class: 'w-filter-row' },
            h(
              'div',
              { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput,
            ),
            meta,
          ),
          h('div', { class: 'w-filter-row' }, pills),
        ),
        results,
      ),
    ),
  );
}

export function PagePersonDetail(id) {
  const p = activePeopleRows(DATA.people).find((x) => String(x.id) === String(id));
  if (!p)
    return h(
      'div',
      null,
      PageBanner('People', 'Person not found', ''),
      h(
        'section',
        { class: 'w-page-content on-white' },
        h(
          'div',
          { class: 'max-w' },
          h('a', { class: 'w-back', href: '#' + 'people' }, '← Back to People'),
          h('div', { class: 'w-empty' }, 'Person not found.'),
        ),
      ),
    );
  const inits = getInitials(p.name);
  const grad = avatarGrad(p.name);
  const links = [];
  if (p.email) links.push(h('a', { href: 'mailto:' + p.email }, 'Email'));
  if (p.linkedin_url)
    links.push(h('a', { href: p.linkedin_url, target: '_blank', rel: 'noopener' }, 'LinkedIn'));
  if (p.website_url)
    links.push(h('a', { href: p.website_url, target: '_blank', rel: 'noopener' }, 'Website'));
  return h(
    'div',
    null,
    PageBanner(p.role || 'People', p.name || '', ''),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h('a', { class: 'w-back', href: '#' + 'people' }, '← Back to People'),
        h(
          'div',
          { class: 'w-person-detail-v2' },
          h(
            'div',
            { class: 'w-avatar' },
            h('div', {
              class: 'w-avatar-photo',
              style: p.photo_url
                ? {
                    backgroundImage: `url(${p.photo_url})`,
                    backgroundPosition: p.photo_position || 'center center',
                  }
                : { background: grad },
            }),
            p.photo_url ? null : h('div', { class: 'w-avatar-text' }, inits),
          ),
          h('h2', { class: 'w-pdetail-name' }, p.name || ''),
          h('div', { class: 'w-pdetail-sub' }, [p.role, p.category].filter(Boolean).join(' · ')),
          p.bio
            ? h('div', { class: 'w-pdetail-bio' }, p.bio)
            : h(
                'div',
                { class: 'w-pdetail-bio', style: { color: 'var(--fg-4)', fontStyle: 'italic' } },
                'Biography coming soon.',
              ),
          links.length ? h('div', { class: 'w-pdetail-links' }, ...links) : null,
        ),
      ),
    ),
  );
}

export function PagePublications() {
  const pubs = DATA.pubs || [];
  const yearOptions = [
    'all',
    ...Array.from(new Set(pubs.map((p) => String(p.year || 'n.d.')))).sort((a, b) =>
      String(b).localeCompare(String(a)),
    ),
  ];
  const searchInput = h('input', {
    class: 'w-filter-input',
    type: 'search',
    'aria-label': 'Search title, authors, or venue',
    placeholder: 'Search title, authors, or venue',
  });
  const yearSelect = h(
    'select',
    { class: 'w-filter-select', 'aria-label': 'Filter by year' },
    ...yearOptions.map((y) =>
      h('option', { value: y }, y === 'all' ? 'All years' : y === 'n.d.' ? 'Other' : y),
    ),
  );
  const meta = h('div', { class: 'w-filter-meta', role: 'status', 'aria-live': 'polite' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const year = yearSelect.value;
    const filtered = pubs.filter((p) => {
      const matchesYear = year === 'all' || String(p.year || 'n.d.') === year;
      return matchesYear && matchesQuery([p.title, p.authors, p.venue], query);
    });
    meta.textContent = `${filtered.length} publication${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(...renderPublicationTable(filtered));
  };
  searchInput.addEventListener('input', applyFilters);
  yearSelect.addEventListener('change', applyFilters);
  applyFilters();
  return h(
    'div',
    null,
    PageBanner(
      'Publications',
      'Selected publications',
      'Peer-reviewed journal articles, conference proceedings, and invited talks. Reach out for any preprint not linked here.',
    ),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-filter-shell' },
          h(
            'div',
            { class: 'w-filter-row' },
            h(
              'div',
              { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput,
            ),
            yearSelect,
            meta,
          ),
        ),
        results,
      ),
    ),
  );
}

export function PageFacilities() {
  const facs = DATA.facilities || [];
  const s = DATA.settings || {};
  let docsOnly = false;
  const searchInput = h('input', {
    class: 'w-filter-input',
    type: 'search',
    'aria-label': 'Search equipment, rigs, or documentation',
    placeholder: 'Search equipment, rigs, or documentation',
  });
  const meta = h('div', { class: 'w-filter-meta', role: 'status', 'aria-live': 'polite' });
  const pills = h('div', { class: 'w-filter-pills' });
  const results = h('div', { class: 'w-results-stack' });
  const pillDefs = [
    ['all', 'All facilities'],
    ['docs', 'With documentation'],
  ];
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const filtered = facs.filter((f) => {
      const passesDocs = !docsOnly || !!f.doc_url;
      return passesDocs && matchesQuery([f.name, f.description, f.content, f.doc_name], query);
    });
    meta.textContent = `${filtered.length} facilit${filtered.length === 1 ? 'y' : 'ies'} shown`;
    results.replaceChildren(renderFacilityCards(filtered));
    pills.querySelectorAll('.w-filter-pill').forEach((btn) => {
      const active = docsOnly ? btn.dataset.value === 'docs' : btn.dataset.value === 'all';
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };
  pillDefs.forEach(([value, label]) => {
    pills.appendChild(
      h(
        'button',
        {
          class: 'w-filter-pill' + (value === 'all' ? ' active' : ''),
          type: 'button',
          'data-value': value,
          onclick: () => {
            docsOnly = value === 'docs';
            applyFilters();
          },
        },
        label,
      ),
    );
  });
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
  return h(
    'div',
    null,
    PageBanner(
      'Facilities',
      s.facilities_page_title || 'Lab facilities & instruments',
      s.facilities_page_intro ||
        'Click any facility to see photos, the full description, and any documentation we have on it.',
    ),
    h(
      'section',
      { class: 'w-page-content' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-filter-shell' },
          h(
            'div',
            { class: 'w-filter-row' },
            h(
              'div',
              { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput,
            ),
            meta,
          ),
          h('div', { class: 'w-filter-row' }, pills),
        ),
        results,
      ),
    ),
  );
}

export function PageFacilityDetail(id) {
  const f = (DATA.facilities || []).find((x) => String(x.id) === String(id));
  if (!f)
    return h(
      'div',
      null,
      PageBanner('Facilities', 'Facility not found', ''),
      h(
        'section',
        { class: 'w-page-content on-white' },
        h(
          'div',
          { class: 'max-w' },
          h('a', { class: 'w-back', href: '#' + 'facilities' }, '← Back to Facilities'),
          h('div', { class: 'w-empty' }, 'Facility not found.'),
        ),
      ),
    );
  const docs = [];
  if (f.doc_url)
    docs.push(
      h(
        'a',
        { class: 'w-doc-link', href: f.doc_url, target: '_blank', rel: 'noopener' },
        h('span', { class: 'w-doc-icon' }, '▣'),
        h('span', { class: 'w-doc-name' }, f.doc_name || 'Documentation'),
        h('span', { class: 'w-doc-sub' }, 'Open file'),
      ),
    );
  return h(
    'div',
    null,
    PageBanner('Facility', f.name || '', ''),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h('a', { class: 'w-back', href: '#' + 'facilities' }, '← Back to Facilities'),
        h(
          'article',
          { class: 'w-fac-detail' },
          f.photo_url ? h('img', { src: f.photo_url, alt: '', class: 'w-fac-detail-img' }) : null,
          h('div', { class: 'w-news-body-rich' }, f.content || f.description || ''),
          docs.length
            ? h('div', { class: 'w-page-section' }, h('h2', null, 'Documentation'), ...docs)
            : null,
        ),
      ),
    ),
  );
}

export function PageApps() {
  const apps = DATA.apps || [];
  return h(
    'div',
    null,
    PageBanner(
      'Apps',
      'Lab apps & calculators',
      'Browser-based mini-applications produced by the lab — calculators, regime maps, and interactive teaching tools tied to our research.',
    ),
    h(
      'section',
      { class: 'w-page-content' },
      h(
        'div',
        { class: 'max-w' },
        apps.length
          ? h(
              'div',
              { class: 'w-grid-2' },
              ...apps.map((a) =>
                h(
                  'div',
                  { class: 'w-card' },
                  h('h3', null, a.title || ''),
                  h('p', null, a.summary || a.description || ''),
                  h(
                    'div',
                    { class: 'w-app-actions' },
                    a.embed_html
                      ? h(
                          'button',
                          { class: 'btn-primary', type: 'button', onclick: () => openInlineApp(a) },
                          'Launch app',
                        )
                      : null,
                    a.url
                      ? h(
                          'a',
                          {
                            class: a.embed_html ? 'btn-ghost' : 'btn-primary',
                            href: assetUrl(a.url),
                            target: '_blank',
                            rel: 'noopener',
                          },
                          a.embed_html ? 'Open link' : 'Launch app',
                        )
                      : null,
                    !a.url && !a.embed_html
                      ? h(
                          'span',
                          { class: 'eyebrow', style: { color: 'var(--fg-4)' } },
                          'Coming soon',
                        )
                      : null,
                  ),
                ),
              ),
            )
          : h('div', { class: 'w-empty' }, 'No apps published yet.'),
      ),
    ),
  );
}

export function PageGallery() {
  const photos = galleryEntries(DATA.gallery);
  return h(
    'div',
    null,
    PageBanner(
      'Gallery',
      'From the lab',
      'The latest lab photos, setups, people, and research moments from the gallery.',
    ),
    h(
      'section',
      { class: 'w-page-content' },
      h('div', { class: 'max-w' }, renderGalleryGrid(photos)),
    ),
  );
}

export function PageDownloads() {
  const s = DATA.settings || {};
  const items = (DATA.downloads || [])
    .slice()
    .sort(
      (a, b) =>
        String(a.category || '').localeCompare(String(b.category || '')) ||
        String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')),
    );
  const cats = Array.from(new Set(items.map((item) => item.category || 'File'))).sort((a, b) =>
    a.localeCompare(b),
  );
  const searchInput = h('input', {
    class: 'w-filter-input',
    type: 'search',
    'aria-label': 'Search downloads by title, description, type, or file name',
    placeholder: 'Search downloads by title, description, type, or file name',
  });
  const categorySelect = h(
    'select',
    { class: 'w-filter-select', 'aria-label': 'Filter by category' },
    h('option', { value: 'all' }, 'All categories'),
    ...cats.map((cat) => h('option', { value: cat }, cat)),
  );
  const meta = h('div', { class: 'w-filter-meta', role: 'status', 'aria-live': 'polite' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const category = categorySelect.value;
    const filtered = items.filter(
      (item) =>
        (category === 'all' || (item.category || 'File') === category) &&
        matchesQuery(
          [item.title, item.name, item.description, item.category, item.mime_type, item.file_url],
          query,
        ),
    );
    meta.textContent = `${filtered.length} download${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(...renderDownloadList(filtered));
  };
  searchInput.addEventListener('input', applyFilters);
  categorySelect.addEventListener('change', applyFilters);
  applyFilters();
  return h(
    'div',
    null,
    PageBanner(
      'Downloads',
      s.downloads_page_title || 'Downloads',
      s.downloads_page_intro ||
        'Access published PDFs, documents, media, and downloadable resources shared by the lab.',
    ),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-filter-shell' },
          h(
            'div',
            { class: 'w-filter-row' },
            h(
              'div',
              { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput,
            ),
            categorySelect,
            meta,
          ),
        ),
        results,
      ),
    ),
  );
}

export function PageNews() {
  const news = DATA.news || [];
  const searchInput = h('input', {
    class: 'w-filter-input',
    type: 'search',
    'aria-label': 'Search titles, announcements, or milestones',
    placeholder: 'Search titles, announcements, or milestones',
  });
  const meta = h('div', { class: 'w-filter-meta', role: 'status', 'aria-live': 'polite' });
  const results = h('div', { class: 'w-results-stack' });
  const applyFilters = () => {
    const query = searchInput.value.trim();
    const filtered = news.filter((n) =>
      matchesQuery([n.title, n.content, n.body, n.summary, n.date], query),
    );
    meta.textContent = `${filtered.length} update${filtered.length === 1 ? '' : 's'} shown`;
    results.replaceChildren(renderNewsCards(filtered));
  };
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
  return h(
    'div',
    null,
    PageBanner(
      'News',
      'Updates from the lab',
      'New papers, awards, and milestones. Click any item to read the full story.',
    ),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-filter-shell' },
          h(
            'div',
            { class: 'w-filter-row' },
            h(
              'div',
              { class: 'w-filter-search' },
              h('span', { class: 'w-filter-icon' }, '\u2315'),
              searchInput,
            ),
            meta,
          ),
        ),
        results,
      ),
    ),
  );
}

export function PageNewsDetail(id) {
  const n = (DATA.news || []).find((x) => String(x.id) === String(id));
  if (!n)
    return h(
      'div',
      null,
      PageBanner('News', 'Not found', ''),
      h(
        'section',
        { class: 'w-page-content on-white' },
        h(
          'div',
          { class: 'max-w' },
          h('a', { class: 'w-back', href: '#' + 'news' }, '← Back to News'),
          h('div', { class: 'w-empty' }, 'News item not found.'),
        ),
      ),
    );
  return h(
    'div',
    null,
    PageBanner(fmtNewsDate(n.date || n.published_at || n.created_at), n.title || '', ''),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h('a', { class: 'w-back', href: '#' + 'news' }, '← Back to News'),
        h(
          'article',
          { class: 'w-news-detail' },
          n.image_url ? h('img', { src: n.image_url, alt: '', class: 'w-news-detail-img' }) : null,
          h('div', { class: 'w-news-body-rich' }, n.content || n.body || ''),
        ),
      ),
    ),
  );
}

export function PageJoin() {
  const cards = [
    {
      icon: '◎',
      title: 'Prospective PhD students',
      body: 'Apply through the Villanova ME PhD program and email Prof. Ortega with a CV, transcripts, and a one-paragraph research statement.',
    },
    {
      icon: '◫',
      title: 'MS / Undergraduate',
      body: 'Course-based research projects available. Contact the lab to discuss what you would like to learn.',
    },
    {
      icon: '▥',
      title: 'Industry collaboration',
      body: 'We partner with industry on directed research, often through the NSF E³S Center. Reach out for membership and project framing.',
    },
    {
      icon: '✦',
      title: 'Visiting scholars',
      body: 'Short and long visits are arranged on a case-by-case basis with the right alignment and bench space.',
    },
  ];
  return h(
    'div',
    null,
    PageBanner(
      'Join',
      'Work with LATFS',
      'We welcome motivated graduate, undergraduate, and visiting researchers. Funded positions are announced on the news page.',
    ),
    h(
      'section',
      { class: 'w-page-content' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-grid-2' },
          ...cards.map((c) =>
            h(
              'div',
              { class: 'w-icon-card' },
              h('span', { class: 'w-icon-card-icon' }, c.icon),
              h('h3', null, c.title),
              h('p', null, c.body),
              h(
                'a',
                {
                  class: 'w-link-gold',
                  href: 'mailto:aortega@villanova.edu?subject=' + encodeURIComponent(c.title),
                },
                'Contact the lab →',
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export function PageContact() {
  return h(
    'div',
    null,
    PageBanner(
      'Contact',
      'Get in touch',
      'For research collaborations, prospective student inquiries, and press, the fastest route is email.',
    ),
    h(
      'section',
      { class: 'w-page-content on-white' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-grid-2' },
          h(
            'div',
            { class: 'w-icon-card' },
            h('span', { class: 'w-icon-card-icon' }, '◉'),
            h('h3', null, 'Director'),
            h(
              'p',
              null,
              'Dr. Alfonso Ortega',
              h('br'),
              h('a', { href: 'mailto:aortega@villanova.edu' }, 'aortega@villanova.edu'),
              h('br'),
              h('a', { href: 'tel:+16105194996' }, '+1 (610) 519-4996'),
            ),
          ),
          h(
            'div',
            { class: 'w-icon-card' },
            h('span', { class: 'w-icon-card-icon' }, '▤'),
            h('h3', null, 'Mailing address'),
            h(
              'p',
              null,
              'Tolentine Hall 344',
              h('br'),
              'Villanova University',
              h('br'),
              '800 Lancaster Avenue',
              h('br'),
              'Villanova, PA 19085',
            ),
          ),
        ),
      ),
    ),
  );
}
