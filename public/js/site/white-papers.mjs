import { h } from './dom.mjs';
import { DATA } from './data.mjs';
import { PageBanner } from './layout.mjs';
export function paperTags(paper) {
  return Array.isArray(paper.tags) ? paper.tags : paper.category ? [paper.category] : [];
}
function tagList(paper) {
  return h(
    'div',
    { class: 'w-paper-tags' },
    ...paperTags(paper).map((tag) => h('span', null, tag)),
  );
}
export function paperBlocks(blocks = []) {
  let figure = 0,
    table = 0;
  return blocks.map((b) => {
    if (b.type === 'heading') return h('h2', null, b.text);
    if (b.type === 'paragraph') return h('p', { style: { whiteSpace: 'pre-wrap' } }, b.text);
    if (b.type === 'image')
      return h(
        'figure',
        null,
        h('img', { src: b.src, alt: b.alt, loading: 'lazy' }),
        h('figcaption', null, `Figure ${++figure}. ${b.caption}`),
      );
    if (b.type === 'table')
      return h(
        'div',
        { class: 'w-paper-table-wrap' },
        h(
          'table',
          null,
          h('caption', null, `Table ${++table}. ${b.caption}`),
          h(
            'thead',
            null,
            h('tr', null, ...b.headers.map((cell) => h('th', { scope: 'col' }, cell))),
          ),
          h(
            'tbody',
            null,
            ...b.rows.map((row) => h('tr', null, ...row.map((cell) => h('td', null, cell)))),
          ),
        ),
      );
    return null;
  });
}
export function PageWhitePapers() {
  const papers = DATA.whitePapers || [];
  let query = '',
    topic = '';
  const results = h('div', { class: 'w-results-stack', 'aria-live': 'polite' });
  const count = h('span', { class: 'w-filter-count' });
  function draw() {
    const shown = papers.filter(
      (p) =>
        (!topic || paperTags(p).includes(topic)) &&
        [p.title, p.authors, p.abstract, ...paperTags(p)].join(' ').toLowerCase().includes(query),
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
                    tagList(p),
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
    'aria-label': 'Filter white papers by tag',
  });
  for (const value of ['', ...new Set(papers.flatMap(paperTags))]) {
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
        h('p', { class: 'eyebrow' }, String(paper.year)),
        tagList(paper),
        h('h2', null, 'Abstract'),
        h('p', { class: 'w-detail-copy', style: { whiteSpace: 'pre-wrap' } }, paper.abstract),
        h('article', { class: 'w-paper-body' }, ...paperBlocks(paper.blocks || [])),
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
