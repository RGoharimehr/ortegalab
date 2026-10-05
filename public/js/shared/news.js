/* Shared safe formatting for public news and server-rendered pages. */
(function (root) {
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const safe = (url) => /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url) && !/[\s<>"\\]/.test(url);
  function text(content) {
    const pattern = /\[([^\]\n]+)\]\(([^\s]+)\)/g;
    let html = '',
      last = 0;
    for (const match of String(content || '').matchAll(pattern)) {
      html += escape(content.slice(last, match.index));
      html += safe(match[2])
        ? `<a href="${escape(match[2])}">${escape(match[1])}</a>`
        : escape(match[0]);
      last = match.index + match[0].length;
    }
    return html + escape(String(content || '').slice(last));
  }
  function photos(item) {
    let rows = item.photos;
    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
      } catch {
        rows = [];
      }
    }
    return Array.isArray(rows) && rows.length
      ? rows
      : item.image_url
        ? [{ url: item.image_url, caption: '', position: 'before' }]
        : [];
  }
  function figures(item, position) {
    let html = '',
      gridOpen = false;
    for (const p of photos(item).filter(
      (p) => (p.position || 'before') === position && safe(p.url),
    )) {
      const size = ['large', 'medium', 'grid'].includes(p.size) ? p.size : 'large';
      if (size === 'grid' && !gridOpen) {
        html += '<div class="w-news-photo-grid">';
        gridOpen = true;
      }
      if (size !== 'grid' && gridOpen) {
        html += '</div>';
        gridOpen = false;
      }
      html += `<figure class="w-news-figure w-news-photo-${size === 'grid' ? 'small' : size}"><a class="w-news-photo-open" href="${escape(p.url)}" aria-label="${escape(p.caption ? 'Enlarge photo: ' + p.caption : 'Enlarge news photo')}" target="_blank" rel="noopener"><img class="w-news-detail-img" src="${escape(p.url)}" alt="${escape(p.caption || '')}" loading="lazy"></a>${p.caption ? `<figcaption>${escape(p.caption)}</figcaption>` : ''}</figure>`;
    }
    return html + (gridOpen ? '</div>' : '');
  }

  const api = { text, photos, figures, safe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NewsContent = api;
})(globalThis);
