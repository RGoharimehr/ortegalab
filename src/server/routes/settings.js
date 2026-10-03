'use strict';

const { Router } = require('express');

function createSettingsRouter({
  db,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  router.get('/api/settings', apiReadLimiter, requireAuth, (req, res) => {
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  });
  // Public subset of settings (no auth required) — exposes only page-content keys for the public website
  router.get('/api/site-settings', apiReadLimiter, (req, res) => {
    const publicKeys = [
      'research_section_title',
      'research_eyebrow',
      'research_page_title',
      'research_page_intro',
      'people_page_title',
      'people_page_intro',
      'facilities_page_title',
      'facilities_page_intro',
      'downloads_page_title',
      'downloads_page_intro',
      'hero_metric_research_label',
      'hero_metric_publications_label',
      'hero_metric_people_label',
      'hero_metric_facilities_label',
      'site_theme',
      'site_backgrounds',
      'join_openings_status',
      'join_openings_title',
      'join_openings_details',
    ];
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    const out = {};
    for (const r of rows) {
      if (publicKeys.includes(r.key)) out[r.key] = r.value;
    }
    res.json(out);
  });
  router.put('/api/settings', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const ALLOWED_KEYS = new Set([
      'research_section_title',
      'research_eyebrow',
      'research_page_title',
      'research_page_intro',
      'people_page_title',
      'people_page_intro',
      'facilities_page_title',
      'facilities_page_intro',
      'downloads_page_title',
      'downloads_page_intro',
      'hero_metric_research_label',
      'hero_metric_publications_label',
      'hero_metric_people_label',
      'hero_metric_facilities_label',
      'hero_title',
      'hero_subtitle',
      'hero_cta_text',
      'hero_cta_url',
      'site_title',
      'site_description',
      'contact_email',
      'contact_address',
      'site_theme',
      'site_backgrounds',
      'join_openings_status',
      'join_openings_title',
      'join_openings_details',
      'lab_a_name',
      'lab_a_room',
      'lab_b_name',
      'lab_b_room',
      'platform_dashboard_sub',
      'platform_schedule_sub',
      'platform_tasks_sub',
      'platform_meetings_sub',
      'platform_equipment_sub',
      'platform_issues_sub',
      'platform_inventory_sub',
      'platform_profile_sub',
      'platform_members_sub',
    ]);
    if (
      req.body?.join_openings_status !== undefined &&
      !['open', 'closed'].includes(req.body.join_openings_status)
    ) {
      return res.status(400).json({ error: 'Opening status must be open or closed' });
    }
    if (
      req.body?.site_theme !== undefined &&
      !['graphite', 'navy', 'graphite-green'].includes(req.body.site_theme)
    ) {
      return res.status(400).json({ error: 'Choose graphite, navy or graphite-green' });
    }
    if (req.body?.site_backgrounds !== undefined) {
      try {
        const backgrounds = JSON.parse(req.body.site_backgrounds);
        const allowed = new Set([
          'home_hero',
          'home_research',
          'home_partners',
          'home_updates',
          'home_gallery',
          'home_join',
          'footer',
          'research',
          'people',
          'publications',
          'white-papers',
          'facilities',
          'gallery',
          'apps',
          'downloads',
          'news',
          'join',
          'contact',
        ]);
        if (
          !backgrounds ||
          typeof backgrounds !== 'object' ||
          Array.isArray(backgrounds) ||
          Object.keys(backgrounds).length > allowed.size
        )
          throw new Error();
        for (const [key, value] of Object.entries(backgrounds)) {
          if (
            !allowed.has(key) ||
            typeof value !== 'string' ||
            value.length > 500 ||
            (value && value !== 'none' && !/^(?:\/(?!\/)|https?:\/\/)/i.test(value))
          )
            throw new Error();
        }
        if (req.body.site_backgrounds.length > 12000) throw new Error();
      } catch {
        return res.status(400).json({ error: 'Choose valid section background images' });
      }
    }
    const pairs = Object.entries(req.body || {}).filter(([k]) => ALLOWED_KEYS.has(k));
    if (!pairs.length) return res.json({ success: true });
    const ups = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)');
    const update = db.transaction(() => {
      for (const [k, v] of pairs)
        ups.run(k, String(v || '').slice(0, k === 'site_backgrounds' ? 12000 : 2000));
    });
    update();
    res.json({ success: true });
  });
  return router;
}

module.exports = { createSettingsRouter };
