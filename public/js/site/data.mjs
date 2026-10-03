import { activePeopleRows } from './utils.mjs';

/** Public content comes exclusively from the API; an empty collection is valid. */
export const ENDPOINTS = Object.freeze({
  news: '/api/news',
  pubs: '/api/publications',
  whitePapers: '/api/white-papers',
  people: '/api/people/public',
  research: '/api/research',
  gallery: '/api/gallery',
  sponsors: '/api/sponsors',
  hero: '/api/hero-slides',
  facilities: '/api/facilities',
  apps: '/api/apps',
  downloads: '/api/downloads',
  settings: '/api/site-settings',
});

export const DATA = Object.fromEntries(
  Object.keys(ENDPOINTS).map((key) => [key, key === 'settings' ? {} : []]),
);
export const contentStatus = { loading: true, failed: [] };

export async function loadAll({ fetchImpl = globalThis.fetch, timeout = 15000 } = {}) {
  contentStatus.loading = true;
  const results = await Promise.allSettled(
    Object.entries(ENDPOINTS).map(async ([key, url]) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetchImpl(url, {
          signal: controller.signal,
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Unable to load ${key}: HTTP ${response.status}`);
        const value = await response.json();
        if (key === 'settings') {
          if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('Invalid settings response');
        } else if (
          !Array.isArray(value) ||
          value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
        ) {
          throw new Error(`Invalid ${key} response`);
        }
        return [key, value];
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  contentStatus.failed = [];
  results.forEach((result, index) => {
    const key = Object.keys(ENDPOINTS)[index];
    if (result.status === 'fulfilled') DATA[key] = result.value[1];
    else {
      DATA[key] = key === 'settings' ? {} : [];
      contentStatus.failed.push(key);
    }
  });
  contentStatus.loading = false;
  return DATA;
}

export function siteStats() {
  return {
    research: DATA.research.length,
    publications: DATA.pubs.length,
    people: activePeopleRows(DATA.people).length,
    facilities: DATA.facilities.length,
    apps: DATA.apps.length,
    downloads: DATA.downloads.length,
    news: DATA.news.length,
  };
}

export function heroMetricLabel(key, fallback) {
  return String(DATA.settings[`hero_metric_${key}_label`] || fallback || '').trim() || fallback;
}
