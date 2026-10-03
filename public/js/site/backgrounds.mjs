import { h } from './dom.mjs';

export const BACKGROUND_SECTIONS = {
  home_hero: 'Home · hero',
  home_research: 'Home · research',
  home_partners: 'Home · collaborators',
  home_updates: 'Home · publications and news',
  home_gallery: 'Home · gallery',
  home_join: 'Home · invitation',
  footer: 'Footer',
  research: 'Research page',
  people: 'People page',
  publications: 'Publications page',
  'white-papers': 'White Papers page',
  facilities: 'Facilities page',
  gallery: 'Gallery page',
  apps: 'Research tools page',
  downloads: 'Downloads page',
  news: 'News page',
  join: 'Join page',
  contact: 'Contact page',
};
export function readBackgrounds(settings) {
  try {
    const value = JSON.parse(settings.site_backgrounds || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
export function backgroundChoice(settings, key, fallback = '') {
  const value = readBackgrounds(settings)[key];
  if (value === 'none') return '';
  if (typeof value !== 'string' || !value) return fallback;
  return /^(?:\/(?!\/)|https?:\/\/)/i.test(value) ? value : fallback;
}
export function applyBackgrounds(root, settings, route) {
  const homeSections = {
    home_gallery: '.w-gallery',
    home_join: '.w-join-section',
    footer: '.w-footer',
  };
  for (const [key, selector] of Object.entries(homeSections)) {
    const target = root.querySelector(selector);
    const src = backgroundChoice(settings, key);
    if (target && src) addField(target, src);
  }
  if (route === 'home') return;
  const section = route.split('/')[0];
  const key = { person: 'people', facility: 'facilities' }[section] || section;
  const target = root.querySelector('#main-content > div');
  const defaults = {
    publications: '/assets/lab/lab-wide-view.png',
    join: '/assets/lab/research-collaboration.jpg',
  };
  const src = backgroundChoice(settings, key, defaults[key] || '/assets/lab/lab-wide-view.png');
  if (target && src) addField(target, src, key === 'publications' ? 12 : 3);
}
function addField(target, src, count = 1) {
  target.classList.add('w-photo-surface');
  target.prepend(
    h(
      'div',
      { class: 'w-photo-field', 'aria-hidden': 'true' },
      ...Array.from({ length: count }, () => h('img', { src, alt: '', loading: 'lazy' })),
    ),
  );
}
