import { h } from './dom.mjs';
import { PEOPLE_GROUPS } from './config.mjs';
import { openGalleryPreview } from './overlays.mjs';
import {
  getInitials,
  fileLabelFromUrl,
  assetUrl,
  isImageDownload,
  fileKindLabel,
  fileSizeLabel,
  fmtNewsDate,
} from './utils.mjs';

export function renderPeopleSections(people) {
  const sections = PEOPLE_GROUPS.map(([key, label]) => {
    const ours = people.filter((p) =>
      key === 'other'
        ? !PEOPLE_GROUPS.some(
            ([category]) => category !== 'other' && category === (p.category || '').toLowerCase(),
          )
        : (p.category || '').toLowerCase() === key,
    );
    if (!ours.length) return null;
    return h(
      'div',
      { class: 'w-page-section w-directory' },
      h(
        'div',
        { class: 'w-directory-heading' },
        h('h2', null, label),
        h(
          'span',
          { class: 'w-directory-count', 'aria-label': `${ours.length} members` },
          String(ours.length).padStart(2, '0'),
        ),
      ),
      h(
        'div',
        { class: 'w-people-grid' },
        ...ours.map((p) => {
          const inits = getInitials(p.name);
          return h(
            'a',
            { class: 'w-person-v2', href: '#' + ('person/' + p.id) },
            h(
              'div',
              { class: 'w-avatar' },
              p.photo_url
                ? h('img', {
                    class: 'w-avatar-photo',
                    src: p.photo_url,
                    alt: '',
                    loading: 'lazy',
                    style: { objectPosition: p.photo_position || 'center center' },
                  })
                : h('div', { class: 'w-avatar-text', 'aria-hidden': 'true' }, inits),
            ),
            h(
              'div',
              { class: 'w-person-copy' },
              h('h3', { class: 'w-pv2-name' }, p.name || ''),
              p.role ? h('div', { class: 'w-pv2-role' }, p.role) : null,
              h(
                'span',
                { class: 'w-profile-link' },
                'View profile ',
                h('span', { 'aria-hidden': 'true' }, '↗'),
              ),
            ),
          );
        }),
      ),
    );
  }).filter(Boolean);
  return sections.length
    ? sections
    : [h('div', { class: 'w-empty' }, 'No people match this search yet.')];
}

export function publicationCitationText(p) {
  return [p.authors, p.year ? `(${p.year}).` : '', p.title, p.venue]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function copyPublicationCitation(p) {
  const text = publicationCitationText(p);
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert('Citation copied to clipboard.'))
      .catch(() => window.prompt('Copy citation', text));
  } else {
    window.prompt('Copy citation', text);
  }
}

export function publicationButtons(p) {
  return [
    p.pdf_url
      ? h(
          'a',
          {
            class: 'w-pub-btn',
            'aria-label': `PDF for ${p.title || 'publication'}`,
            href: p.pdf_url,
            target: '_blank',
            rel: 'noopener',
          },
          'PDF',
        )
      : null,
    p.doi_url
      ? h(
          'a',
          {
            class: 'w-pub-btn ghost',
            'aria-label': `DOI for ${p.title || 'publication'}`,
            href: p.doi_url,
            target: '_blank',
            rel: 'noopener',
          },
          'DOI',
        )
      : null,
    p.citation_url || p.ris_url
      ? h(
          'a',
          {
            class: 'w-pub-btn ghost',
            href: p.citation_url || p.ris_url,
            target: '_blank',
            rel: 'noopener',
          },
          'Cite',
        )
      : h(
          'button',
          {
            class: 'w-pub-btn ghost',
            type: 'button',
            'aria-label': `Copy citation for ${p.title || 'publication'}`,
            onclick: () => copyPublicationCitation(p),
          },
          'Cite',
        ),
  ];
}

export function renderFacilityCards(items) {
  if (!items.length) return h('div', { class: 'w-empty' }, 'No facilities match this search.');
  return h(
    'div',
    { class: 'w-grid-2 w-facility-grid' },
    ...items.map((f) =>
      h(
        'a',
        { class: 'w-fac-card', href: '#facility/' + f.id },
        f.photo_url
          ? h('img', { class: 'w-fac-img', src: f.photo_url, alt: '', loading: 'lazy' })
          : h(
              'div',
              { class: 'w-fac-img w-fac-img-empty', 'aria-hidden': 'true' },
              h('span', null, 'LATFS / FACILITIES'),
            ),
        h(
          'div',
          { class: 'w-fac-body' },
          h('h2', { class: 'w-fac-title' }, f.name || ''),
          h(
            'p',
            { class: 'w-fac-desc' },
            (f.description || '').slice(0, 220) + ((f.description || '').length > 220 ? '…' : ''),
          ),
          h(
            'span',
            { class: 'w-fac-cta' },
            f.doc_url ? 'View facility + docs →' : 'View facility →',
          ),
        ),
      ),
    ),
  );
}

export function renderNewsCards(items) {
  if (!items.length) return h('div', { class: 'w-empty' }, 'No news items match this search.');
  return h(
    'div',
    { class: 'w-news-stack w-news-index' },
    ...items.map((n) =>
      h(
        'a',
        { class: 'w-news-card', href: '#news/' + n.id },
        n.image_url
          ? h('img', { src: n.image_url, alt: '', class: 'w-news-thumb', loading: 'lazy' })
          : null,
        h(
          'div',
          { class: 'w-news-body-wrap' },
          h('div', { class: 'w-news-date' }, fmtNewsDate(n.date || n.published_at || n.created_at)),
          h('h2', { class: 'w-news-title' }, n.title || ''),
          h(
            'p',
            { class: 'w-news-body' },
            (n.content || n.body || n.summary || '').slice(0, 220) +
              ((n.content || n.body || n.summary || '').length > 220 ? '…' : ''),
          ),
          h('span', { class: 'w-news-read' }, 'Read story ↗'),
        ),
      ),
    ),
  );
}

export function renderPublicationTable(pubs) {
  const ordered = (pubs || [])
    .slice()
    .sort(
      (a, b) =>
        Number(b.year || 0) - Number(a.year || 0) ||
        String(a.title || '').localeCompare(String(b.title || '')),
    );
  if (!ordered.length)
    return [h('div', { class: 'w-empty' }, 'No publications match this search.')];
  return [
    h(
      'div',
      { class: 'w-page-section' },
      h(
        'div',
        { class: 'w-pub-list w-publication-index' },
        ...ordered.map((p) =>
          h(
            'article',
            { class: 'w-pub-row2' },
            h(
              'div',
              { class: 'w-pub-left' },
              h('div', { class: 'w-pub-yr' }, String(p.year || '—')),
            ),
            h(
              'div',
              { class: 'w-pub-mid' },
              h('h2', { class: 'w-pub-title2' }, p.title || ''),
              h('div', { class: 'w-pub-authors' }, p.authors || ''),
              h('div', { class: 'w-pub-venue' }, p.venue || ''),
            ),
            h('div', { class: 'w-pub-right' }, ...publicationButtons(p)),
          ),
        ),
      ),
    ),
  ];
}

export function renderGalleryGrid(items) {
  if (!items.length) return h('div', { class: 'w-empty' }, 'No gallery images published yet.');
  return h(
    'div',
    { class: 'w-gallery-strip is-gallery-page' },
    ...items.map((p) =>
      h(
        'button',
        {
          class: 'w-gallery-slide',
          type: 'button',
          'aria-label': `View ${p.title}`,
          onclick: () => openGalleryPreview(p),
        },
        h('img', { src: p.src, alt: p.title, loading: 'lazy' }),
        h('div', { class: 'w-gallery-scrim' }),
        h(
          'div',
          { class: 'w-gallery-meta' },
          h('div', { class: 'w-gallery-cat' }, p.cat),
          h('div', { class: 'w-gallery-title' }, p.title),
        ),
      ),
    ),
  );
}

export function renderDownloadList(items) {
  if (!items.length) return [h('div', { class: 'w-empty' }, 'No downloads published yet.')];
  return [
    h(
      'div',
      { class: 'w-page-section' },
      h(
        'div',
        { class: 'w-pub-list w-download-index' },
        ...items.map((item) => {
          const href = assetUrl(item.file_url);
          const preview = isImageDownload(item)
            ? h('img', {
                class: 'w-download-thumb',
                src: href,
                alt: item.title || item.name || 'Download preview',
              })
            : h('div', { class: 'w-download-fileicon' }, fileKindLabel(item));
          return h(
            'article',
            { class: 'w-pub-row2 w-download-row' },
            h(
              'div',
              { class: 'w-pub-left' },
              h('div', { class: 'w-pub-yr' }, (item.category || 'File').slice(0, 4).toUpperCase()),
            ),
            h(
              'div',
              { class: 'w-pub-mid' },
              h(
                'div',
                { class: 'w-download-title' },
                preview,
                h(
                  'div',
                  null,
                  h(
                    'h2',
                    { class: 'w-pub-title2' },
                    item.title || item.name || fileLabelFromUrl(item.file_url),
                  ),
                  h(
                    'div',
                    { class: 'w-pub-authors' },
                    item.description || 'Downloadable lab resource',
                  ),
                  h(
                    'div',
                    { class: 'w-pub-venue' },
                    [item.category, fileSizeLabel(item.file_size), item.mime_type]
                      .filter(Boolean)
                      .join(' - '),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { class: 'w-pub-right' },
              href
                ? h(
                    'a',
                    {
                      class: 'w-pub-btn',
                      'aria-label': `Download ${item.title || item.name || fileLabelFromUrl(href)}`,
                      href,
                      target: '_blank',
                      rel: 'noopener',
                      download: fileLabelFromUrl(href) || '',
                    },
                    'Download',
                  )
                : h(
                    'span',
                    { class: 'w-download-unavailable', 'aria-disabled': 'true' },
                    'Unavailable',
                  ),
            ),
          );
        }),
      ),
    ),
  ];
}

export function galleryEntries(gallery) {
  // The CMS owns gallery membership; deleted photographs must not reappear.
  const published = (gallery || []).filter(
    (g) => !/(?:^|\/)assets\/(?:hero-\d+|facility-\d+)\.png$/.test(g.image_url || g.src || ''),
  );
  return published
    .filter((g) => g.image_url || g.src)
    .map((g) => ({
      id: g.id,
      src: g.image_url || g.src,
      cat: g.category || 'Lab life',
      title: g.caption || g.title || 'Gallery image',
    }));
}
