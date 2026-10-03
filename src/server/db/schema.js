'use strict';

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS white_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      abstract TEXT NOT NULL,
      year INTEGER NOT NULL,
      category TEXT DEFAULT '',
      file_url TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS publications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      venue TEXT NOT NULL,
      year INTEGER NOT NULL,
      pdf_url TEXT,
      doi_url TEXT,
      citation_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      category TEXT NOT NULL,
      bio TEXT,
      photo_url TEXT,
      email TEXT,
      linkedin_url TEXT DEFAULT '',
      website_url TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS research (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT DEFAULT '',
      image_url TEXT,
      links TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_url TEXT,
      website_url TEXT,
      sort_order INTEGER DEFAULT 0,
      show_in_footer INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      title TEXT DEFAULT '',
      caption TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      doc_url TEXT DEFAULT '',
      doc_name TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    /* Platform tables — Schedule, Tasks, Meetings, Inventory, Projects */
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day INTEGER NOT NULL,
      start_hour INTEGER NOT NULL,
      duration_hours INTEGER NOT NULL,
      title TEXT NOT NULL,
      room TEXT DEFAULT '',
      color TEXT DEFAULT 'navy',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      assignee TEXT DEFAULT '',
      tag TEXT DEFAULT 'lab',
      due_label TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_label TEXT NOT NULL,
      time_label TEXT NOT NULL,
      title TEXT NOT NULL,
      room TEXT DEFAULT '',
      attendees TEXT DEFAULT '',
      type TEXT DEFAULT 'team',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lab TEXT NOT NULL DEFAULT 'A',
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      qty INTEGER DEFAULT 0,
      min_qty INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      lead TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      category TEXT DEFAULT '',
      location TEXT DEFAULT '',
      status TEXT DEFAULT 'available',           -- available | in_use | maintenance | broken
      notes TEXT DEFAULT '',
      requires_training INTEGER DEFAULT 0,
      training_requirement TEXT DEFAULT '',
      last_used_user_id INTEGER,
      last_used_at DATETIME,
      current_user_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,                       -- checkout | checkin | note
      note TEXT DEFAULT '',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      category TEXT DEFAULT 'other',              -- broken | supply | facility | other
      status TEXT DEFAULT 'open',                 -- open | in_progress | resolved
      priority TEXT DEFAULT 'normal',             -- low | normal | high
      reporter_user_id INTEGER,
      assignee_user_id INTEGER,
      related_equipment_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issue_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      file_url TEXT NOT NULL,
      file_name TEXT DEFAULT '',
      mime_type TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      created_by_user_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      description TEXT DEFAULT '',
      url TEXT DEFAULT '',
      embed_html TEXT DEFAULT '',
      thumbnail TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  db.exec(`
      -- TOTP / 2FA secrets per user
      CREATE TABLE IF NOT EXISTS totp_secrets (
        user_id   INTEGER PRIMARY KEY,
        secret    TEXT NOT NULL,
        enabled   INTEGER DEFAULT 0,
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- TOTP one-time backup codes (hashed; 10 per user; regenerated on demand)
      CREATE TABLE IF NOT EXISTS totp_backup_codes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        code_hash  TEXT NOT NULL,
        used       INTEGER DEFAULT 0,
        used_at    DATETIME
      );

      -- Login audit log
      CREATE TABLE IF NOT EXISTS login_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER,
        username   TEXT,
        success    INTEGER NOT NULL,          -- 1 = success, 0 = failure
        reason     TEXT DEFAULT '',           -- '' | 'bad_password' | 'locked' | '2fa_required' | '2fa_bad'
        ip         TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Suppliers catalogue for inventory items
      CREATE TABLE IF NOT EXISTS suppliers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        contact     TEXT DEFAULT '',
        email       TEXT DEFAULT '',
        phone       TEXT DEFAULT '',
        website_url TEXT DEFAULT '',
        notes       TEXT DEFAULT '',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Inventory adjustment / transaction log
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        inventory_id INTEGER NOT NULL,
        user_id      INTEGER,
        delta        INTEGER NOT NULL,         -- positive = added, negative = removed
        qty_before   INTEGER NOT NULL,
        qty_after    INTEGER NOT NULL,
        reason       TEXT DEFAULT '',
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ── Equipment reservations (book in advance) ─────────────────────────────
      CREATE TABLE IF NOT EXISTS equipment_reservations (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id  INTEGER NOT NULL REFERENCES equipment(id),
        user_id       INTEGER NOT NULL REFERENCES users(id),
        start_at      DATETIME NOT NULL,
        end_at        DATETIME NOT NULL,
        purpose       TEXT DEFAULT '',
        status        TEXT DEFAULT 'pending',  -- pending | approved | denied | cancelled | completed
        notes         TEXT DEFAULT '',
        approved_by   INTEGER,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ── Equipment maintenance / calibration records ───────────────────────────
      CREATE TABLE IF NOT EXISTS equipment_maintenance (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id  INTEGER NOT NULL REFERENCES equipment(id),
        maint_type    TEXT NOT NULL DEFAULT 'maintenance',  -- maintenance | calibration | repair | inspection
        scheduled_at  DATETIME,
        completed_at  DATETIME,
        performed_by  TEXT DEFAULT '',
        cost          REAL,
        notes         TEXT DEFAULT '',
        next_due_at   DATETIME,
        created_by    INTEGER,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ── Sample registry ───────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS sample_registry (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        sample_type    TEXT DEFAULT 'other',   -- solid | liquid | gas | biological | chemical | other
        location       TEXT DEFAULT '',        -- shelf, freezer, cabinet
        project_id     INTEGER,
        created_by_id  INTEGER,
        status         TEXT DEFAULT 'active',  -- active | depleted | disposed | archived
        approval_status TEXT DEFAULT 'approved', -- pending | approved | denied
        approved_by_id INTEGER,
        approved_at    DATETIME,
        review_note    TEXT DEFAULT '',
        expiry_date    DATE,
        qty            REAL DEFAULT 0,
        unit           TEXT DEFAULT 'unit',
        description    TEXT DEFAULT '',
        notes          TEXT DEFAULT '',
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ── Digital lab notebooks ─────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS lab_notebooks (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        title            TEXT NOT NULL,
        user_id          INTEGER NOT NULL,
        project_id       INTEGER,
        experiment_date  DATE NOT NULL,
        content          TEXT DEFAULT '',  -- plain text / markdown
        tags             TEXT DEFAULT '',  -- comma-separated
        status           TEXT DEFAULT 'draft',  -- draft | complete | reviewed
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ── Training & certification records ─────────────────────────────────────
      CREATE TABLE IF NOT EXISTS training_records (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER NOT NULL REFERENCES users(id),
        equipment_id   INTEGER REFERENCES equipment(id),
        training_type  TEXT DEFAULT 'equipment',  -- equipment | safety | chemical | lab | other
        training_name  TEXT NOT NULL,
        completed_at   DATE NOT NULL,
        expires_at     DATE,
        certified_by   TEXT DEFAULT '',
        notes          TEXT DEFAULT '',
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { createSchema };
