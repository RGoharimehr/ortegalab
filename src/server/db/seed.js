'use strict';

const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config');
const { seedDemoData } = require('./seed-demo');

function seedDatabase(db, config, logger = console) {
  const adminExists = db.prepare('SELECT id FROM users WHERE username=?').get('admin');
  const password =
    config.adminSeedPassword || (config.seedDemo && !config.isProduction ? 'admin123' : '');
  if (!adminExists && password) {
    if (config.isProduction && (password.length < 12 || password === 'admin123')) {
      throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters in production');
    }
    db.prepare(
      "INSERT INTO users (username, password, name, role, active) VALUES (?, ?, ?, 'admin', 1)",
    ).run('admin', bcrypt.hashSync(password, BCRYPT_ROUNDS), 'Site administrator');
  } else if (!adminExists) {
    logger.warn('[security] Set ADMIN_SEED_PASSWORD to create the initial administrator account.');
  }
  if (config.seedDemo) {
    if (config.isProduction) throw new Error('Demo data is disabled in production');
    seedDemoData(db, config);
  }
  (function seedSettings() {
    const defaults = [
      ['lab_a_name', 'Lab A'],
      ['lab_a_room', 'Tolentine 344'],
      ['lab_b_name', 'Lab B'],
      ['lab_b_room', 'Mendel 270'],
      ['research_section_title', 'Research Areas'],
      ['research_eyebrow', 'Six pillars · updated quarterly'],
      ['research_page_title', 'Six pillars of inquiry'],
      [
        'research_page_intro',
        'LATFS investigates the thermal and fluid mechanics of high-power-density systems — from boiling in microchannels to renewable thermal storage. Click any area to see active projects and publications.',
      ],
      ['people_page_title', 'Our people'],
      [
        'people_page_intro',
        'A small, hands-on lab of faculty, postdocs, and graduate researchers working at the intersection of heat transfer, fluid mechanics, and electronic systems.',
      ],
      ['facilities_page_title', 'Lab facilities & instruments'],
      [
        'facilities_page_intro',
        'Click any facility to see photos, the full description, and any documentation we have on it.',
      ],
      ['downloads_page_title', 'Downloads'],
      [
        'downloads_page_intro',
        'Download papers, forms, media, and supporting files shared by the lab.',
      ],
      ['site_theme', 'graphite'],
      ['hero_metric_research_label', 'Research areas'],
      ['hero_metric_publications_label', 'Publications'],
      ['hero_metric_people_label', 'Active members'],
      ['hero_metric_facilities_label', 'Facilities'],
      // Platform section subtitles (editable by staff)
      ['platform_schedule_sub', 'Calendar of meetings, sessions and reservations.'],
      ['platform_tasks_sub', 'Drag-style kanban (open / in progress / blocked / done).'],
      ['platform_meetings_sub', 'Group meetings, seminars and announcements from the PI.'],
      ['platform_equipment_sub', 'Check items out and check them back in. Last-user is tracked.'],
      ['platform_issues_sub', 'Report broken equipment, request supplies, flag facility issues.'],
      ['platform_inventory_sub', 'Track consumables, chemicals, reagents and supplies.'],
      ['platform_profile_sub', 'Your details, assigned tasks and equipment.'],
      ['platform_members_sub', 'Manage accounts. Only admins / professors can edit.'],
      ['platform_dashboard_sub', "Here is today's snapshot."],
    ];
    const ins = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?,?)');
    for (const [k, v] of defaults) ins.run(k, v);
  })();
  // This calculator ships with the application and contains no sample lab records.
  db.prepare(
    `INSERT OR IGNORE INTO apps
    (slug, title, summary, description, url, embed_html, sort_order, published)
    VALUES (?, ?, ?, ?, ?, '', 0, 1)`,
  ).run(
    'hfo-1234yf-pressure-drop',
    'HFO-1234yf pressure drop estimator',
    'Estimate two-phase pressure drop for HFO-1234yf flow cases.',
    'Standalone LATFS calculator for HFO-1234yf two-phase pressure drop estimates.',
    '/apps/hfo-1234yf-pressure-drop.html',
  );
}

module.exports = { seedDatabase };
