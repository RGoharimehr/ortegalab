'use strict';
const { Router } = require('express');
const fs = require('node:fs');
const path = require('node:path');
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const plain = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const titles = {
  home: 'Laboratory for Advanced Thermal and Fluid Systems',
  research: 'Research areas',
  people: 'Our people',
  publications: 'Selected publications',
  facilities: 'Research facilities',
  news: 'Updates from the lab',
  gallery: 'Laboratory gallery',
  apps: 'Research tools',
  downloads: 'Downloads',
  join: 'Work with LATFS',
  contact: 'Contact LATFS',
};
const intro =
  'Laboratory for Advanced Thermal and Fluid Systems (LATFS) at Villanova University: research in heat transfer, fluid mechanics, and electronic systems.';
const specs = {
  research: ['research', 'title', 'description', 'research'],
  people: ['people', 'name', 'bio', 'person'],
  facilities: ['facilities', 'name', 'description', 'facility'],
  news: ['news', 'title', 'content', 'news'],
  publications: ['publications', 'title', 'venue', null],
  gallery: ['gallery', 'caption', 'caption', null],
  apps: ['apps', 'title', 'summary', null],
  downloads: ['documents', 'title', 'description', null],
};
function createSeoRouter({ db, config }) {
  const router = Router();
  const template = fs.readFileSync(path.join(config.publicPath, 'index.html'), 'utf8');
  const base = config.baseUrl;
  const routePath = (key) => (key === 'home' ? '/' : '/' + key);
  function rows(key) {
    const spec = specs[key];
    if (!spec) return [];
    if (key === 'downloads')
      return db
        .prepare("SELECT * FROM documents WHERE entity_type='download' AND published=1")
        .all();
    const where = key === 'people' ? ' WHERE active=1' : key === 'apps' ? ' WHERE published=1' : '';
    return db.prepare(`SELECT * FROM ${spec[0]}${where}`).all();
  }
  const link = (href, label) => `<a href="${escape(href)}">${escape(label)}</a>`;
  function article(row, spec) {
    const [, , description, detail] = spec;
    const title = row[spec[1]] || 'Laboratory resource';
    let result = `<article><h2>${detail ? link('/' + detail + '/' + row.id, title) : escape(title)}</h2><p>${escape(plain(row[description]))}</p>`;
    if (row.authors) result += `<p>${escape(row.authors)} · ${escape(row.year)}</p>`;
    for (const key of ['doi_url', 'pdf_url', 'citation_url'])
      if (/^https?:\/\//i.test(row[key] || ''))
        result +=
          link(
            row[key],
            key === 'doi_url' ? 'DOI' : key === 'pdf_url' ? 'Read paper' : 'Citation',
          ) + ' ';
    return result + '</article>';
  }
  router.get('/robots.txt', (req, res) =>
    res
      .type('text')
      .send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`),
  );
  router.get('/sitemap.xml', (req, res) => {
    const urls = Object.keys(titles).map(routePath);
    for (const key of ['research', 'people', 'facilities', 'news'])
      for (const row of rows(key)) urls.push('/' + specs[key][3] + '/' + row.id);
    res
      .type('application/xml')
      .send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          urls.map((url) => `<url><loc>${escape(base + url)}</loc></url>`).join('') +
          '</urlset>',
      );
  });
  router.get(['/index.html', '/home'], (req, res) => res.redirect(301, '/'));
  router.get(
    [
      '/',
      ...Object.keys(titles)
        .filter((k) => k !== 'home')
        .map((k) => '/' + k),
      '/:kind(research|person|facility|news)/:id',
    ],
    (req, res) => {
      const key = req.params.kind
        ? { person: 'people', facility: 'facilities' }[req.params.kind] || req.params.kind
        : req.path.slice(1) || 'home';
      let title = titles[key],
        description = intro,
        content = '',
        status = 200;
      if (req.params.id) {
        const row = rows(key).find((r) => String(r.id) === req.params.id);
        if (!row) {
          status = 404;
          title = 'Page not found';
          content = '<p>This page does not exist.</p>';
        } else {
          title = row[specs[key][1]];
          description = plain(row[specs[key][2]]) || intro;
          content = article(row, specs[key]) + `<p>${escape(plain(row.content || ''))}</p>`;
        }
      } else if (specs[key]) {
        content = rows(key)
          .map((r) => article(r, specs[key]))
          .join('');
        description = `${title} at LATFS, Villanova University. ${intro}`;
      } else if (key === 'home')
        content =
          `<p>${escape(intro)}</p>` +
          rows('research')
            .map((r) => article(r, specs.research))
            .join('');
      else if (key === 'join')
        content =
          '<p>We welcome motivated graduate, undergraduate, and visiting researchers. Contact the lab about current opportunities.</p>' +
          link('mailto:aortega@villanova.edu', 'Contact the lab');
      else if (key === 'contact')
        content =
          '<p>Villanova University, 800 Lancaster Avenue, Villanova, PA 19085.</p>' +
          link('mailto:aortega@villanova.edu', 'aortega@villanova.edu');
      const canonical = base + (req.path === '/' ? '/' : req.path.replace(/\/$/, ''));
      const fullTitle = `${title} · LATFS · Villanova University`;
      const image = base + '/assets/lab/lab-overview.jpg';
      const structured = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ResearchOrganization',
        name: titles.home,
        alternateName: 'LATFS',
        url: base + '/',
        parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Villanova University' },
      }).replace(/</g, '\\u003c');
      const head = `<base href="/"><title>${escape(fullTitle)}</title><meta name="description" content="${escape(description.slice(0, 170))}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(fullTitle)}"><meta property="og:description" content="${escape(description.slice(0, 170))}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(fullTitle)}"><meta name="twitter:description" content="${escape(description.slice(0, 170))}"><meta name="twitter:image" content="${escape(image)}">`;
      let html = template
        .replace(
          /<title>[\s\S]*?<\/title>|<meta\s+(?:name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>|<link rel="canonical"[^>]*>/g,
          '',
        )
        .replace(
          '</head>',
          head + '<script type="application/ld+json">' + structured + '</script></head>',
        );
      const nav = Object.entries(titles)
        .map(([k, v]) => link(routePath(k), v))
        .join(' · ');
      html = html
        .replace(
          '<div id="app" aria-busy="true"></div>',
          `<div id="app"><nav aria-label="Main navigation">${nav}</nav><main id="main-content" class="max-w w-page-content"><h1>${escape(title)}</h1>${content}</main></div>`,
        )
        .replace(/<noscript[\s\S]*?<\/noscript>/, '');
      html = html.replace('href="#main-content"', 'href="' + escape(req.path) + '#main-content"');
      if (status === 404) res.set('X-Robots-Tag', 'noindex');
      res.status(status).type('html').send(html);
    },
  );
  return router;
}
module.exports = { createSeoRouter };
