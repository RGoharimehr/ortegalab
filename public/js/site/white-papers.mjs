import { h } from './dom.mjs';
import { DATA } from './data.mjs';
import { PageBanner } from './layout.mjs';
const topics = [
  'Data Center Cooling',
  'Two-Phase Flow',
  'Digital Twin',
  'Thermal Management',
  'System Modeling',
];
export function PageWhitePapers() {
  const papers = DATA.whitePapers || [];
  let query = '',
    topic = '';
  const results = h('div', { class: 'w-results-stack', 'aria-live': 'polite' });
  const count = h('span', { class: 'w-filter-count' });
  function draw() {
    const shown = papers.filter(
      (p) =>
        (!topic || p.category === topic) &&
        [p.title, p.authors, p.abstract].join(' ').toLowerCase().includes(query),
    );
    const years = [...new Set(shown.map((p) => p.year))].sort((a, b) => b - a);
    count.textContent = `${shown.length} white paper${shown.length === 1 ? '' : 's'}`;
    results.replaceChildren(
      ...(shown.length
        ? years.map((year) =>
            h(
              'section',
              { class: 'w-page-section' },
              h('h2', null, String(year)),
              ...shown
                .filter((p) => p.year === year)
                .map((p) =>
                  h(
                    'article',
                    { class: 'w-white-paper' },
                    h('h3', null, h('a', { href: '/white-papers/' + p.id }, p.title)),
                    h('p', { class: 'w-muted' }, p.authors),
                    p.category ? h('p', { class: 'eyebrow' }, p.category) : null,
                    h(
                      'p',
                      null,
                      p.abstract.length > 300 ? p.abstract.slice(0, 300) + '…' : p.abstract,
                    ),
                    h(
                      'div',
                      { class: 'w-white-paper-links' },
                      h(
                        'a',
                        { class: 'w-text-link', href: '/white-papers/' + p.id },
                        'Read more →',
                      ),
                      h(
                        'a',
                        {
                          class: 'w-text-link',
                          href: p.file_url,
                          target: '_blank',
                          rel: 'noopener',
                        },
                        'PDF ↗',
                      ),
                    ),
                  ),
                ),
            ),
          )
        : [
            h(
              'p',
              { class: 'w-empty' },
              papers.length
                ? 'No white papers match your filters.'
                : 'White papers will appear here when published.',
            ),
          ]),
    );
  }
  const filters = h('div', {
    class: 'w-filter-chips',
    role: 'group',
    'aria-label': 'Filter white papers by topic',
  });
  for (const value of [
    '',
    ...new Set([...topics, ...papers.map((p) => p.category).filter(Boolean)]),
  ]) {
    const button = h(
      'button',
      {
        class: 'w-filter-chip' + (!value ? ' active' : ''),
        'aria-pressed': String(!value),
        onclick: () => {
          topic = value;
          for (const b of filters.children) {
            b.classList.toggle('active', b === button);
            b.setAttribute('aria-pressed', String(b === button));
          }
          draw();
        },
      },
      value || 'All',
    );
    filters.appendChild(button);
  }
  draw();
  return h(
    'div',
    { class: 'w-white-papers-page' },
    PageBanner(
      'White Papers',
      'White Papers',
      'Technical reports, design studies, and research briefs from the Laboratory for Advanced Thermal and Fluid Systems.',
    ),
    h(
      'section',
      { class: 'w-page-content' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'div',
          { class: 'w-search-row' },
          h('input', {
            class: 'w-search-input',
            type: 'search',
            placeholder: 'Search title, authors, or abstract',
            'aria-label': 'Search white papers',
            oninput: (e) => {
              query = e.target.value.trim().toLowerCase();
              draw();
            },
          }),
          count,
        ),
        filters,
        results,
      ),
    ),
  );
}
export function PageWhitePaperDetail(id) {
  const paper = (DATA.whitePapers || []).find((p) => String(p.id) === String(id));
  if (!paper)
    return h(
      'div',
      null,
      PageBanner(
        'White Papers',
        'White paper not found',
        'This report is not currently published.',
      ),
      h(
        'div',
        { class: 'max-w w-page-content' },
        h('a', { href: '/white-papers' }, 'Browse white papers →'),
      ),
    );
  return h(
    'div',
    { class: 'w-white-papers-page' },
    PageBanner('White Papers', paper.title, paper.authors),
    h(
      'section',
      { class: 'w-page-content' },
      h(
        'div',
        { class: 'max-w' },
        h(
          'p',
          { class: 'eyebrow' },
          `${paper.year}${paper.category ? ' · ' + paper.category : ''}`,
        ),
        h('h2', null, 'Abstract'),
        h('p', { class: 'w-detail-copy', style: { whiteSpace: 'pre-wrap' } }, paper.abstract),
        h(
          'div',
          { class: 'w-white-paper-links' },
          h(
            'a',
            { class: 'w-text-link', href: paper.file_url, target: '_blank', rel: 'noopener' },
            'Read PDF ↗',
          ),
          h('a', { class: 'w-text-link', href: '/white-papers' }, 'All white papers →'),
        ),
      ),
    ),
  );
}
