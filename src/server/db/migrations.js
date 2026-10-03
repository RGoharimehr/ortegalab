'use strict';

const migrations = [
  "ALTER TABLE white_papers ADD COLUMN tags TEXT DEFAULT '[]'",
  "ALTER TABLE white_papers ADD COLUMN blocks TEXT DEFAULT '[]'",
  // Users → richer accounts
  "ALTER TABLE users ADD COLUMN name TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'",
  "ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''",
  'ALTER TABLE users ADD COLUMN person_id INTEGER',
  'ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1',
  // Tasks → person assignment
  'ALTER TABLE tasks ADD COLUMN assignee_user_id INTEGER',
  'ALTER TABLE tasks ADD COLUMN created_by_user_id INTEGER',
  "ALTER TABLE tasks ADD COLUMN due_date TEXT DEFAULT ''",
  "ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''",
  // Events → owner + new schema
  'ALTER TABLE events ADD COLUMN owner_user_id INTEGER',
  "ALTER TABLE events ADD COLUMN visibility TEXT DEFAULT 'lab'",
  'ALTER TABLE events ADD COLUMN start_time TEXT',
  'ALTER TABLE events ADD COLUMN end_time TEXT',
  "ALTER TABLE events ADD COLUMN location TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'meeting'",
  "ALTER TABLE events ADD COLUMN attendees TEXT DEFAULT ''",
  // Meetings → richer fields
  'ALTER TABLE meetings ADD COLUMN scheduled_at TEXT',
  "ALTER TABLE meetings ADD COLUMN location TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN description TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN meeting_type TEXT DEFAULT 'group'",
  // Tasks → priority field
  "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'normal'",
  "ALTER TABLE gallery ADD COLUMN category TEXT DEFAULT 'Inside LATFS'",
  // Content tables
  'ALTER TABLE research ADD COLUMN content TEXT DEFAULT ""',
  'ALTER TABLE research ADD COLUMN links TEXT DEFAULT "[]"',
  'ALTER TABLE publications ADD COLUMN doi_url TEXT',
  'ALTER TABLE publications ADD COLUMN ris_url TEXT DEFAULT ""',
  'ALTER TABLE people ADD COLUMN linkedin_url TEXT DEFAULT ""',
  'ALTER TABLE people ADD COLUMN website_url TEXT DEFAULT ""',
  'ALTER TABLE people ADD COLUMN photo_position TEXT DEFAULT "center center"',
  'ALTER TABLE sponsors ADD COLUMN show_in_footer INTEGER DEFAULT 0',
  // News + facilities richer content
  'ALTER TABLE news ADD COLUMN image_url TEXT DEFAULT ""',
  'ALTER TABLE news ADD COLUMN slug TEXT DEFAULT ""',
  'ALTER TABLE facilities ADD COLUMN slug TEXT DEFAULT ""',
  'ALTER TABLE facilities ADD COLUMN image_url TEXT DEFAULT ""',
  'ALTER TABLE facilities ADD COLUMN long_description TEXT DEFAULT ""',
  'ALTER TABLE documents ADD COLUMN description TEXT DEFAULT ""',
  'ALTER TABLE documents ADD COLUMN category TEXT DEFAULT ""',
  'ALTER TABLE documents ADD COLUMN mime_type TEXT DEFAULT ""',
  'ALTER TABLE documents ADD COLUMN file_size INTEGER DEFAULT 0',
  'ALTER TABLE documents ADD COLUMN published INTEGER DEFAULT 1',
  'ALTER TABLE documents ADD COLUMN created_by_user_id INTEGER',
];

const advancedMigrations = [
  // Users — lockout + TOTP flag + last-login tracking
  'ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN locked_until DATETIME',
  'ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN last_login_at DATETIME',
  "ALTER TABLE users ADD COLUMN last_login_ip TEXT DEFAULT ''",
  // Inventory — unit of measure, supplier FK, reorder URL, chemical safety, expiry, location
  "ALTER TABLE inventory ADD COLUMN unit TEXT DEFAULT 'each'",
  'ALTER TABLE inventory ADD COLUMN supplier_id INTEGER',
  "ALTER TABLE inventory ADD COLUMN reorder_url TEXT DEFAULT ''",
  "ALTER TABLE inventory ADD COLUMN notes TEXT DEFAULT ''",
  'ALTER TABLE inventory ADD COLUMN expiry_date DATE',
  "ALTER TABLE inventory ADD COLUMN location TEXT DEFAULT ''",
  "ALTER TABLE inventory ADD COLUMN chemical_cas TEXT DEFAULT ''",
  "ALTER TABLE inventory ADD COLUMN hazard_class TEXT DEFAULT ''",
  "ALTER TABLE inventory ADD COLUMN sds_url TEXT DEFAULT ''",
  // Equipment — rich asset metadata + maintenance / calibration tracking
  "ALTER TABLE equipment ADD COLUMN manufacturer TEXT DEFAULT ''",
  "ALTER TABLE equipment ADD COLUMN model TEXT DEFAULT ''",
  "ALTER TABLE equipment ADD COLUMN serial_number TEXT DEFAULT ''",
  'ALTER TABLE equipment ADD COLUMN purchase_date DATE',
  'ALTER TABLE equipment ADD COLUMN maintenance_interval_days INTEGER DEFAULT 0',
  'ALTER TABLE equipment ADD COLUMN last_maintained_at DATETIME',
  'ALTER TABLE equipment ADD COLUMN next_maintenance_at DATETIME',
  'ALTER TABLE equipment ADD COLUMN last_calibrated_at DATETIME',
  'ALTER TABLE equipment ADD COLUMN next_calibration_at DATETIME',
  'ALTER TABLE equipment ADD COLUMN requires_training INTEGER DEFAULT 0',
  "ALTER TABLE equipment ADD COLUMN training_requirement TEXT DEFAULT ''",
  // Samples — approval workflow
  "ALTER TABLE sample_registry ADD COLUMN approval_status TEXT DEFAULT 'approved'",
  'ALTER TABLE sample_registry ADD COLUMN approved_by_id INTEGER',
  'ALTER TABLE sample_registry ADD COLUMN approved_at DATETIME',
  "ALTER TABLE sample_registry ADD COLUMN review_note TEXT DEFAULT ''",
];

// Use introspection for legacy databases; unexpected SQL errors abort startup.
function migrateColumns(db) {
  db.transaction(() => {
    for (const sql of [...migrations, ...advancedMigrations]) {
      const [, table, column] = sql.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
      const exists = db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((row) => row.name === column);
      if (!exists) db.exec(sql);
    }
  })();
}

function applyOnce(db, name, migration) {
  db.transaction(() => {
    if (db.prepare('SELECT 1 FROM schema_migrations WHERE name=?').get(name)) return;
    migration();
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
  })();
}

function migrateData(db) {
  applyOnce(db, 'legacy-content-and-workflow-v1', () => {
    db.prepare(
      "UPDATE sponsors SET show_in_footer=1 WHERE name LIKE '%Villanova%' AND show_in_footer=0",
    ).run();
    db.prepare(
      "UPDATE sponsors SET show_in_footer=1 WHERE name LIKE '%National Science Foundation%' AND show_in_footer=0",
    ).run();
    db.prepare(
      "UPDATE gallery SET image_url = '/' || image_url WHERE image_url NOT LIKE '/%' AND image_url NOT LIKE 'http%'",
    ).run();
    db.prepare(
      "UPDATE sponsors SET logo_url = '/' || logo_url WHERE logo_url != '' AND logo_url NOT LIKE '/%' AND logo_url NOT LIKE 'http%'",
    ).run();
    db.prepare(
      "UPDATE users SET role='admin', name=COALESCE(NULLIF(name,''),'Site administrator') WHERE username='admin'",
    ).run();
    db.prepare("UPDATE tasks SET status='in_progress' WHERE status='doing'").run();
    db.prepare("UPDATE tasks SET status='blocked' WHERE status='review'").run();
    db.prepare(
      "UPDATE sample_registry SET approval_status='approved' WHERE approval_status IS NULL OR approval_status=''",
    ).run();
    db.prepare(
      "UPDATE sample_registry SET approved_at=COALESCE(approved_at, created_at) WHERE approval_status='approved'",
    ).run();
    // The legacy image directory is absent from this repository. Update only the
    // known seed paths, preserving anything editors uploaded or entered themselves.
    const legacyImages = {
      '/images/top1a.png': '/assets/hero-1.png',
      '/images/top2a.png': '/assets/hero-2.png',
      '/images/top3a.png': '/assets/hero-3.png',
      '/images/CSP123_20130911_0195-Edit.jpg': '/assets/facility-1.png',
      '/images/IMG_1526.JPG': '/assets/facility-2.png',
      '/images/re01.png': '/assets/hero-3.png',
      '/images/re02.gif': '/assets/research-droplet.png',
      '/images/re03.png': '/assets/research-minichannel.png',
      '/images/re04.png': '/assets/research-geothermal.png',
      '/images/re05.png': '/assets/facility-3.png',
      '/images/facilities_1a.png': '/assets/facility-1.png',
      '/images/facilities_2a.png': '/assets/facility-2.png',
      '/images/facilities_3a.png': '/assets/facility-3.png',
      '/images/facilities_4a.png': '/assets/facility-4.png',
      '/images/facilities_5a.png': '/assets/research-minichannel.png',
      '/images/facil01.png': '/assets/research-geothermal.png',
      '/images/sponnsf.gif': '/assets/sponsors/nsf.svg',
      '/images/sponintel.gif': '/assets/sponsors/intel.svg',
      '/images/sponamd.gif': '/assets/sponsors/amd.svg',
      '/images/sponhon.gif': '/assets/sponsors/honeywell.svg',
      '/images/sponray.gif': '/assets/sponsors/rtx.svg',
      '/images/sponti.gif': '/assets/sponsors/ti.svg',
      '/images/sponsrc.gif': '/assets/sponsors/src.svg',
      '/images/templatemo_logo_villanova.png': '/assets/sponsors/villanova.svg',
      '/images/sponses2.svg': '/assets/sponsors/e3s.svg',
      '/images/sponcis.gif': '',
      '/images/sponde.gif': '',
    };
    const repairSeedImages = db.transaction(() => {
      for (const [table, column] of [
        ['research', 'image_url'],
        ['sponsors', 'logo_url'],
        ['gallery', 'image_url'],
        ['hero_slides', 'image_url'],
        ['facilities', 'photo_url'],
      ]) {
        const update = db.prepare(
          `UPDATE ${table} SET ${column}=? WHERE ${column}=? OR ${column}=?`,
        );
        for (const [oldPath, newPath] of Object.entries(legacyImages)) {
          update.run(newPath, oldPath, oldPath.slice(1));
        }
      }
    });
    repairSeedImages();
  });
  applyOnce(db, 'gallery-cms-photographs-v1', () => {
    const photos = require('./content/gallery-photos.json');
    const insert = db.prepare(
      'INSERT INTO gallery (image_url, caption, category, sort_order) VALUES (?, ?, ?, ?)',
    );
    photos.forEach((photo, index) => {
      if (!db.prepare('SELECT 1 FROM gallery WHERE image_url=?').get(photo.image_url))
        insert.run(photo.image_url, photo.title, photo.category, index);
    });
  });
  // Preserve previously visible account-only members once. The CMS owns publication thereafter.
  applyOnce(db, 'people-cms-source-v1', () => {
    const { createPeopleService } = require('../services/people');
    const service = createPeopleService(db);
    const users = db
      .prepare(
        "SELECT * FROM users WHERE active!=0 AND role IN ('professor', 'postdoc', 'student', 'moderator') AND username NOT LIKE 'codexmodtemp%'",
      )
      .all();
    for (const user of users) {
      const existing = service.personForUser(user);
      if (existing) continue;
      const result = db
        .prepare('INSERT INTO people (name, role, category, email, active) VALUES (?, ?, ?, ?, 1)')
        .run(
          user.name || user.username,
          service.publicRoleFromUser(user),
          service.publicCategoryFromUser(user),
          user.email || '',
        );
      db.prepare('UPDATE users SET person_id=? WHERE id=?').run(result.lastInsertRowid, user.id);
    }
  });
  applyOnce(db, 'publications-from-user-july-2026-v1', () => {
    const publications = require('./content/publications-july-2026.json');
    const normalize = (value) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const existing = db.prepare('SELECT title, doi_url FROM publications').all();
    const titles = new Set(existing.map((row) => normalize(row.title)));
    const dois = new Set(existing.map((row) => normalize(row.doi_url)).filter(Boolean));
    const insert = db.prepare(
      'INSERT INTO publications (title, authors, venue, year, doi_url) VALUES (?, ?, ?, ?, ?)',
    );
    for (const publication of publications) {
      if (
        titles.has(normalize(publication.title)) ||
        (publication.doi_url && dois.has(normalize(publication.doi_url)))
      )
        continue;
      insert.run(
        publication.title,
        publication.authors,
        publication.venue,
        publication.year,
        publication.doi_url,
      );
      titles.add(normalize(publication.title));
      if (publication.doi_url) dois.add(normalize(publication.doi_url));
    }
  });
}

module.exports = { migrateColumns, migrateData, applyOnce };
