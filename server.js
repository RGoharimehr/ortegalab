const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Email (optional) ────────────────────────────────────────────────────────
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to enable email.
// If env vars are absent the mailer is silently disabled — nothing breaks.
let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  mailer.verify((err) => {
    if (err) console.warn('[email] SMTP verify failed:', err.message);
    else     console.log('[email] SMTP ready —', process.env.SMTP_HOST);
  });
} else {
  console.log('[email] SMTP not configured — email notifications disabled.');
}

/**
 * Send an email if the mailer is configured.
 * @param {string|string[]} to  — recipient(s)
 * @param {string} subject
 * @param {string} text         — plain-text body
 */
function sendMail(to, subject, text) {
  if (!mailer) return;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@latfs.lab';
  mailer.sendMail({ from, to, subject, text }).catch(err => {
    console.warn('[email] send failed:', err.message);
  });
}

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Photo upload storage: preserve extension, unique name
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = /^\.[a-z0-9]+$/.test(rawExt) ? rawExt : '';
    cb(null, `photo_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
  }
});

// Document upload storage: PDFs and common document types, up to 20 MB
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = /^\.[a-z0-9]+$/.test(rawExt) ? rawExt : '';
    cb(null, `doc_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, or TXT files are allowed'));
  }
});

// Database setup
const db = new Database('./latfs.db');

// Create tables
db.exec(`
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
    file_url TEXT NOT NULL,
    file_name TEXT DEFAULT '',
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
`);

// Migrations: add new columns to existing databases (errors for duplicate columns are expected and ignored)
const migrations = [
  // Users → richer accounts
  "ALTER TABLE users ADD COLUMN name TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'",
  "ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN person_id INTEGER",
  "ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1",
  // Tasks → person assignment
  "ALTER TABLE tasks ADD COLUMN assignee_user_id INTEGER",
  "ALTER TABLE tasks ADD COLUMN created_by_user_id INTEGER",
  "ALTER TABLE tasks ADD COLUMN due_date TEXT DEFAULT ''",
  "ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''",
  // Events → owner + new schema
  "ALTER TABLE events ADD COLUMN owner_user_id INTEGER",
  "ALTER TABLE events ADD COLUMN visibility TEXT DEFAULT 'lab'",
  "ALTER TABLE events ADD COLUMN start_time TEXT",
  "ALTER TABLE events ADD COLUMN end_time TEXT",
  "ALTER TABLE events ADD COLUMN location TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'meeting'",
  "ALTER TABLE events ADD COLUMN attendees TEXT DEFAULT ''",
  // Meetings → richer fields
  "ALTER TABLE meetings ADD COLUMN scheduled_at TEXT",
  "ALTER TABLE meetings ADD COLUMN location TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN description TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN meeting_type TEXT DEFAULT 'group'",
  // Tasks → priority field
  "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'normal'",
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
];
for (const sql of migrations) {
  try { db.exec(sql); } catch(e) {
    if (!e.message.includes('duplicate column name')) console.error('Migration error:', e.message);
  }
}

// Data migrations: fix existing data (path prefixes, footer flags) — runs before seeding
try {
  // Mark Villanova and NSF as footer logos if not already set
  db.prepare("UPDATE sponsors SET show_in_footer=1 WHERE name LIKE '%Villanova%' AND show_in_footer=0").run();
  db.prepare("UPDATE sponsors SET show_in_footer=1 WHERE name LIKE '%National Science Foundation%' AND show_in_footer=0").run();
  // Fix relative image paths to absolute (add leading slash) for existing data
  db.prepare("UPDATE gallery SET image_url = '/' || image_url WHERE image_url NOT LIKE '/%' AND image_url NOT LIKE 'http%'").run();
  db.prepare("UPDATE sponsors SET logo_url = '/' || logo_url WHERE logo_url != '' AND logo_url NOT LIKE '/%' AND logo_url NOT LIKE 'http%'").run();
} catch(e) { console.error('Data migration error:', e.message); }

// Seed admin user — password can be overridden by ADMIN_SEED_PASSWORD env var
const ADMIN_SEED_PW = process.env.ADMIN_SEED_PASSWORD || 'admin123';
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync(ADMIN_SEED_PW, 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
}

// Make sure admin row has role + name
try { db.prepare("UPDATE users SET role='admin', name=COALESCE(NULLIF(name,''),'Site administrator') WHERE username='admin'").run(); } catch(_){}

// Seed sample lab accounts — password can be overridden by LAB_SEED_PASSWORD env var
const LAB_SEED_PW = process.env.LAB_SEED_PASSWORD || 'latfs2024';
const seedAccounts = [
  { username: 'aortega',   name: 'Dr. Alfonso Ortega', role: 'professor', email: 'aortega@villanova.edu' },
  { username: 'mreyes',    name: 'M. Reyes',           role: 'student',   email: 'mreyes@villanova.edu' },
  { username: 'skim',      name: 'S. Kim',             role: 'postdoc',   email: 'skim@villanova.edu' },
  { username: 'dhernandez',name: 'D. Hernandez',       role: 'student',   email: 'dhernandez@villanova.edu' },
  { username: 'apark',     name: 'A. Park',            role: 'student',   email: 'apark@villanova.edu' },
];
const seedHash = bcrypt.hashSync(LAB_SEED_PW, 10);
for (const a of seedAccounts) {
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(a.username);
  if (!exists) {
    db.prepare('INSERT INTO users (username, password, name, role, email, active) VALUES (?,?,?,?,?,1)')
      .run(a.username, seedHash, a.name, a.role, a.email);
  }
}

// ── Startup security warnings ────────────────────────────────────────────────
function warnDefaultPassword(username, defaultPw) {
  const row = db.prepare('SELECT password FROM users WHERE username=?').get(username);
  if (row && bcrypt.compareSync(defaultPw, row.password)) {
    console.warn(`[security] ⚠️  User "${username}" still has the default seed password. Change it via Lab Members → Reset PW.`);
  }
}
warnDefaultPassword('admin', 'admin123');
for (const a of seedAccounts) warnDefaultPassword(a.username, 'latfs2024');
if (!process.env.SESSION_SECRET) {
  console.warn('[security] ⚠️  SESSION_SECRET env var is not set — using insecure default. Set a random 64-char secret in production.');
}

// Seed equipment if empty
const eqCount = db.prepare('SELECT COUNT(*) as cnt FROM equipment').get();
if (eqCount.cnt === 0) {
  const eqs = [
    { name: 'Boiling rig · 4-point',   sku: 'RIG-BOIL-04', category: 'Test rig',     location: 'Lab A · Tolentine 344', status: 'available' },
    { name: 'Phantom v710 high-speed camera', sku: 'CAM-PHANTOM-V710', category: 'Imaging', location: 'Lab B · Tolentine 346', status: 'available' },
    { name: 'FLIR A655 IR camera',     sku: 'IR-FLIR-A655', category: 'Imaging',     location: 'Lab A · Tolentine 344', status: 'available' },
    { name: 'TSI micro-PIV system',    sku: 'PIV-TSI-2C',   category: 'Diagnostics', location: 'Lab B · Tolentine 346', status: 'available' },
    { name: 'Microchannel test rig',   sku: 'RIG-MICRO-01', category: 'Test rig',    location: 'Lab B · Tolentine 346', status: 'maintenance', notes: 'Awaiting new heater pad' },
    { name: 'Environmental chamber',   sku: 'ENV-CHAMB-01', category: 'Conditioning', location: 'Lab A · Tolentine 344', status: 'available' },
    { name: 'Heat-flux meter (Vatell)', sku: 'HFM-VATELL-A', category: 'Sensor',     location: 'Shared cabinet',         status: 'available' },
    { name: 'Differential pressure transducer', sku: 'DP-OMEGA-01', category: 'Sensor', location: 'Shared cabinet',     status: 'available' },
  ];
  const stmt = db.prepare('INSERT INTO equipment (name, sku, category, location, status, notes, sort_order) VALUES (?,?,?,?,?,?,?)');
  eqs.forEach((e, i) => stmt.run(e.name, e.sku, e.category, e.location, e.status, e.notes || '', i));
}

// Seed apps catalogue (HTML mini-apps embedded in the public website)
const appsCount = db.prepare('SELECT COUNT(*) as cnt FROM apps').get();
if (appsCount.cnt === 0) {
  const seed = [
    { slug: 'thermal-resistance', title: 'Thermal resistance calculator',
      summary: 'Plug in geometry + materials, get junction-to-ambient resistance.',
      description: 'A simple browser-based calculator that estimates Rja for a heat-sink + spreader + interface stack. Useful for quick first-order sanity checks before running a CFD.',
      url: '', embed_html: '', sort_order: 1 },
    { slug: 'two-phase-map', title: 'Two-phase flow regime map',
      summary: 'Plot operating points on Mandhane / Taitel-Dukler maps.',
      description: 'Enter mass flux, quality, and channel geometry to overlay your operating point on classic two-phase regime maps for design or teaching.',
      url: '', embed_html: '', sort_order: 2 },
  ];
  const ins = db.prepare('INSERT INTO apps (slug, title, summary, description, url, embed_html, sort_order) VALUES (?,?,?,?,?,?,?)');
  seed.forEach(a => ins.run(a.slug, a.title, a.summary, a.description, a.url, a.embed_html, a.sort_order));
}

// Seed a couple of issues
const issuesCount = db.prepare('SELECT COUNT(*) as cnt FROM issues').get();
if (issuesCount.cnt === 0) {
  const aOrtegaId = db.prepare('SELECT id FROM users WHERE username=?').get('aortega')?.id || 1;
  const mReyesId  = db.prepare('SELECT id FROM users WHERE username=?').get('mreyes')?.id || 1;
  db.prepare('INSERT INTO issues (title, body, category, status, priority, reporter_user_id) VALUES (?,?,?,?,?,?)')
    .run('Microchannel rig heater pad failed', 'Heater pad on the micro rig stopped responding mid-run on Friday. Powered down. Needs replacement before Tuesday.', 'broken', 'in_progress', 'high', mReyesId);
  db.prepare('INSERT INTO issues (title, body, category, status, priority, reporter_user_id) VALUES (?,?,?,?,?,?)')
    .run('Order acetone (4 L)', 'Stock cabinet only has ~500 mL left. Need a 4 L bottle for cleaning. Vendor: Sigma.', 'supply', 'open', 'normal', aOrtegaId);
  db.prepare('INSERT INTO issues (title, body, category, status, priority, reporter_user_id) VALUES (?,?,?,?,?,?)')
    .run('Lab door latch sticking', 'Tolentine 344 door latch sticks, especially in humid weather. Facilities ticket would be ideal.', 'facility', 'open', 'low', mReyesId);
}


// Seed news
const newsCount = db.prepare('SELECT COUNT(*) as cnt FROM news').get();
if (newsCount.cnt === 0) {
  db.prepare('INSERT INTO news (title, content, date) VALUES (?, ?, ?)').run(
    'LATFS Joins E3S Center',
    'LATFS is now part of the NSF Industry/University Cooperative Research Center on Energy Efficient Electronic Systems (E3S).',
    '2015-01-01'
  );
}

// Seed publications
const pubCount = db.prepare('SELECT COUNT(*) as cnt FROM publications').get();
if (pubCount.cnt === 0) {
  const pubs = [
    { title: 'The Energy Costs of Cooling Electronic Systems', authors: 'Ortega, A.', venue: 'Semitherm 2012 Keynote', year: 2012, pdf_url: './research/publications/Semitherm%202012.pdf', citation_url: './research/publications/Semitherm-2012.RIS' },
    { title: 'Simulation of Two-Phase Flow and Heat Transfer in Mini- and Micro-Channels for Concentrating Photovoltaics Cooling', authors: 'Pellicone, D., Ortega, A., Del Valle, M., Schon, S.', venue: 'ESFuelcell 2011', year: 2011, pdf_url: './research/publications/ES2011-54206.pdf', citation_url: './research/publications/ES2011-54206.RIS' },
    { title: 'Convective Heat Transfer due to an Impinging Synthetic Jet: A Numerical Investigation of a Canonical Geometry', authors: 'Silva, L., Ortega, A.', venue: 'ITherm 2010', year: 2010, pdf_url: './research/publications/silva-ITherm-2010.pdf', citation_url: './research/publications/silva-ITherm-2010.RIS' },
    { title: 'Numerical Investigation of a Liquid Droplet Transported by a Gas Stream Impinging on a Heated Surface: Single-Phase Regime', authors: 'Diaz, A., Ortega, A.', venue: 'ITherm 2010', year: 2010, pdf_url: './research/publications/diaz-ITherm-2010.pdf', citation_url: './research/publications/diaz-ITherm-2010.RIS' },
  ];
  for (const p of pubs) {
    db.prepare('INSERT INTO publications (title, authors, venue, year, pdf_url, citation_url) VALUES (?, ?, ?, ?, ?, ?)').run(p.title, p.authors, p.venue, p.year, p.pdf_url, p.citation_url);
  }
}

// Seed people
const peopleCount = db.prepare('SELECT COUNT(*) as cnt FROM people').get();
if (peopleCount.cnt === 0) {
  const people = [
    { name: 'Dr. Alfonso Ortega', role: 'Director & Professor', category: 'director', bio: 'Dr. Ortega is a Professor of Mechanical Engineering at Villanova University and directs the Laboratory for Advanced Thermal and Fluid Systems (LATFS). His research focuses on thermal management of electronic systems, convective heat transfer, and energy technology.', photo_url: '', email: 'aortega@villanova.edu', active: 1 },
  ];
  for (const p of people) {
    db.prepare('INSERT INTO people (name, role, category, bio, photo_url, email, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(p.name, p.role, p.category, p.bio, p.photo_url, p.email, p.active);
  }
}

// Seed research
const researchCount = db.prepare('SELECT COUNT(*) as cnt FROM research').get();
if (researchCount.cnt === 0) {
  const areas = [
    { title: 'NSF E3S Center - Energy Efficient Electronic Systems', description: 'LATFS is part of the NSF Industry/University Cooperative Research Center on Energy Efficient Electronic Systems (E3S), conducting research on exergy-based approaches for data center design and waste energy recovery.', image_url: 'images/re02.gif', sort_order: 1 },
    { title: 'Droplet Impingement and Spray Cooling', description: 'Research into heat transfer and fluid dynamics in liquid droplet impingement on surfaces, including spray cooling applications and enhancement techniques using surfactants.', image_url: 'images/re02.gif', sort_order: 2 },
    { title: 'Mini and Microchannel Heat Exchangers', description: 'Experimental and computational characterization of water-cooled multi-layer mini-channel heat sinks in single and two-phase flow, including biologically inspired designs using constructal scaling principles.', image_url: 'images/re03.png', sort_order: 3 },
    { title: 'Flow and Convective Heat Transfer in Jets', description: 'Investigation of heat transfer and fluid dynamics in synthetic impinging jets over heated surfaces, including complex flow regimes and transitional flows.', image_url: 'images/re01.png', sort_order: 4 },
    { title: 'Energy Technology', description: 'Research in ground source heat pump systems, geothermal well modeling, and advanced cooling for concentrated photovoltaics.', image_url: 'images/re04.png', sort_order: 5 },
    { title: 'Experimental Techniques', description: 'Development of advanced experimental techniques including liquid crystal transient thermal imaging and high speed video imaging for thermal and fluid measurements.', image_url: 'images/re05.png', sort_order: 6 },
  ];
  for (const r of areas) {
    db.prepare('INSERT INTO research (title, description, image_url, sort_order) VALUES (?, ?, ?, ?)').run(r.title, r.description, r.image_url, r.sort_order);
  }
}

// Seed sponsors
const sponsorCount = db.prepare('SELECT COUNT(*) as cnt FROM sponsors').get();
if (sponsorCount.cnt === 0) {
  const sponsors = [
    { name: 'National Science Foundation', logo_url: '/images/sponnsf.gif', website_url: 'https://www.nsf.gov', sort_order: 1, show_in_footer: 1 },
    { name: 'Intel Corporation', logo_url: '/images/sponintel.gif', website_url: 'https://www.intel.com', sort_order: 2, show_in_footer: 0 },
    { name: 'AMD', logo_url: '/images/sponamd.gif', website_url: 'https://www.amd.com', sort_order: 3, show_in_footer: 0 },
    { name: 'Cisco Systems', logo_url: '/images/sponcis.gif', website_url: 'https://www.cisco.com', sort_order: 4, show_in_footer: 0 },
    { name: 'Honeywell', logo_url: '/images/sponhon.gif', website_url: 'https://www.honeywell.com', sort_order: 5, show_in_footer: 0 },
    { name: 'Raytheon', logo_url: '/images/sponray.gif', website_url: 'https://www.rtx.com', sort_order: 6, show_in_footer: 0 },
    { name: 'Texas Instruments', logo_url: '/images/sponti.gif', website_url: 'https://www.ti.com', sort_order: 7, show_in_footer: 0 },
    { name: 'SRC', logo_url: '/images/sponsrc.gif', website_url: 'https://www.src.org', sort_order: 8, show_in_footer: 0 },
    { name: 'Delphi Technologies', logo_url: '/images/sponde.gif', website_url: 'https://www.delphi.com', sort_order: 9, show_in_footer: 0 },
    { name: 'Villanova University', logo_url: '/images/templatemo_logo_villanova.png', website_url: 'https://www.villanova.edu', sort_order: 10, show_in_footer: 1 },
    { name: 'ES2 - Energy Efficient Electronic Systems', logo_url: '/images/sponses2.svg', website_url: 'https://www.e3s-center.org', sort_order: 11, show_in_footer: 1 },
  ];
  for (const s of sponsors) {
    db.prepare('INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)').run(s.name, s.logo_url, s.website_url, s.sort_order, s.show_in_footer);
  }
}

// Seed gallery
const galleryCount = db.prepare('SELECT COUNT(*) as cnt FROM gallery').get();
if (galleryCount.cnt === 0) {
  const galleryPhotos = [
    { image_url: '/images/top1a.png', caption: 'Lab Overview', sort_order: 1 },
    { image_url: '/images/top2a.png', caption: 'Research Equipment', sort_order: 2 },
    { image_url: '/images/top3a.png', caption: 'Experiments', sort_order: 3 },
    { image_url: '/images/CSP123_20130911_0195-Edit.jpg', caption: 'Lab Members', sort_order: 4 },
    { image_url: '/images/IMG_1526.JPG', caption: 'Thermal Systems', sort_order: 5 },
  ];
  for (const g of galleryPhotos) {
    db.prepare('INSERT INTO gallery (image_url, caption, sort_order) VALUES (?, ?, ?)').run(g.image_url, g.caption, g.sort_order);
  }
}

// Seed hero slides (separate from photo gallery)
const heroSlideCount = db.prepare('SELECT COUNT(*) as cnt FROM hero_slides').get();
if (heroSlideCount.cnt === 0) {
  const heroSlides = [
    { image_url: '/images/top1a.png', title: 'Lab Overview', caption: 'State-of-the-art facilities for thermal and fluid research at Villanova University.', sort_order: 1 },
    { image_url: '/images/top2a.png', title: 'Research Equipment', caption: 'High-speed imaging, precision flow meters, and custom test sections for boiling experiments.', sort_order: 2 },
    { image_url: '/images/top3a.png', title: 'Active Experiments', caption: 'Ongoing research into two-phase flow, spray cooling, and thermal energy storage.', sort_order: 3 },
    { image_url: '/images/CSP123_20130911_0195-Edit.jpg', title: 'Our Team', caption: 'Graduate students, postdocs, and faculty collaborating on cutting-edge engineering challenges.', sort_order: 4 },
    { image_url: '/images/IMG_1526.JPG', title: 'Thermal Systems', caption: 'Advanced thermal management solutions for electronics, energy, and industrial applications.', sort_order: 5 },
  ];
  for (const s of heroSlides) {
    db.prepare('INSERT INTO hero_slides (image_url, title, caption, sort_order) VALUES (?, ?, ?, ?)').run(s.image_url, s.title, s.caption, s.sort_order);
  }
}

// Seed facilities
const facilityCount = db.prepare('SELECT COUNT(*) as cnt FROM facilities').get();
if (facilityCount.cnt === 0) {
  const facilities = [
    { name: 'Two-Phase Flow & Boiling Lab', description: 'High-speed imaging systems, precision flow meters, and custom test sections for boiling and two-phase flow experiments.', content: 'The Two-Phase Flow & Boiling Lab is equipped with state-of-the-art instrumentation for studying boiling heat transfer and two-phase flow phenomena. Key capabilities include high-speed visualization, precision calorimetry, and custom-fabricated test sections that allow researchers to study nucleate boiling, flow boiling in microchannels, and spray cooling under controlled conditions.', photo_url: '/images/facilities_1a.png', doc_url: '', doc_name: '', sort_order: 1 },
    { name: 'Thermal Characterization Suite', description: 'Advanced tools for measuring thermal resistance, conductivity, and transient thermal response of materials and systems.', content: 'Our Thermal Characterization Suite provides comprehensive capabilities for thermal property measurement and system-level thermal performance evaluation. The suite includes IR thermography for non-contact full-field temperature measurement, laser flash diffusivity for precise thermal conductivity determination, and precision calorimetry for heat capacity measurements across a wide temperature range.', photo_url: '/images/facilities_2a.png', doc_url: '', doc_name: '', sort_order: 2 },
    { name: 'Computational Resources', description: 'High-performance computing cluster and licensed CFD software for large-scale simulations.', content: 'LATFS maintains a dedicated high-performance computing cluster for numerical simulation of thermal and fluid systems. The cluster supports parallel CFD computations using ANSYS Fluent, ANSYS CFX, and OpenFOAM. Researchers have access to MATLAB, Python (with NumPy/SciPy), and in-house codes for data analysis and reduced-order modeling.', photo_url: '/images/facilities_3a.png', doc_url: '', doc_name: '', sort_order: 3 },
    { name: 'Microfluidics Lab', description: 'Cleanroom-class fabrication and testing of microchannels and heat spreaders for electronics cooling.', content: 'The Microfluidics Lab supports design, fabrication, and testing of microfluidic systems for thermal management. Facilities include soft lithography tools for PDMS device fabrication, an inverted optical microscope with μPIV capability for flow visualization, and a precision pressure and flow measurement system for microchannel characterization.', photo_url: '/images/facilities_4a.png', doc_url: '', doc_name: '', sort_order: 4 },
    { name: 'Electronics Cooling Testbed', description: 'Dedicated infrastructure for testing advanced cooling solutions for high-power electronics.', content: 'The Electronics Cooling Testbed provides a realistic environment for evaluating thermal management solutions for high-power electronic assemblies. The facility includes programmable DC power supplies, precision junction temperature measurement instrumentation, custom cold plates and heat sink test fixtures, and data acquisition systems capable of high-speed multi-channel temperature logging.', photo_url: '/images/facilities_5a.png', doc_url: '', doc_name: '', sort_order: 5 },
    { name: 'Energy Systems Lab', description: 'Research into sustainable energy conversion, heat exchangers, and thermal energy storage systems.', content: 'The Energy Systems Lab supports research in ground-source heat pump modeling, concentrated photovoltaic cooling, and thermal energy storage. Facilities include heat exchanger test rigs for single and two-phase flow, phase-change material (PCM) storage modules, flat-plate and evacuated-tube solar thermal collectors, and a data-logging infrastructure for long-term experimental campaigns.', photo_url: '/images/facil01.png', doc_url: '', doc_name: '', sort_order: 6 },
  ];
  for (const f of facilities) {
    db.prepare('INSERT INTO facilities (name, description, content, photo_url, doc_url, doc_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(f.name, f.description, f.content, f.photo_url, f.doc_url, f.doc_name, f.sort_order);
  }
}

// Seed platform tables (Schedule, Tasks, Meetings, Inventory, Projects)
if (db.prepare('SELECT COUNT(*) as cnt FROM events').get().cnt === 0) {
  const events = [
    [0, 9, 1, 'Group meeting', 'Lab A', 'navy'],
    [1, 11, 3, 'Boiling rig \u00b7 thermal imaging', 'Lab A', 'gold'],
    [1, 14, 1, '1:1 \u00b7 Ortega', 'Office', 'info'],
    [2, 10, 2, 'PIV calibration', 'Lab B', 'gold'],
    [2, 13, 2, 'Droplet impingement run', 'Lab B', 'navy'],
    [3, 9, 4, 'Paper writing block', 'Office', 'info'],
    [4, 15, 2, 'Equipment maintenance', 'Lab A', 'warn'],
  ];
  const stmt = db.prepare('INSERT INTO events (day, start_hour, duration_hours, title, room, color) VALUES (?,?,?,?,?,?)');
  for (const e of events) stmt.run(...e);
}

if (db.prepare('SELECT COUNT(*) as cnt FROM tasks').get().cnt === 0) {
  const tasks = [
    ['Order K-type thermocouples', 'M. Reyes', 'inventory', 'Fri', 'todo', 1],
    ['Calibrate PIV camera (Lab B)', 'A. Park', 'experiment', 'Wed', 'todo', 2],
    ['Book high-speed camera next week', 'S. Kim', 'lab', 'Mon', 'todo', 3],
    ['Draft E3S quarterly report outline', 'Dr. Ortega', 'paper', 'Apr 5', 'todo', 4],
    ['Replace O-rings on droplet rig', 'D. Hernandez', 'maintenance', '\u2014', 'todo', 5],
    ['Draft ITherm 2024 abstract', 'M. Reyes', 'paper', 'today', 'doing', 1],
    ["Process last week's IR data", 'S. Kim', 'data', 'Wed', 'doing', 2],
    ['Run boiling experiment \u00b7 4-point', 'M. Reyes', 'experiment', 'today', 'doing', 3],
    ['Data review \u00b7 synthetic jet', 'M. Reyes', 'data', '\u2014', 'review', 1],
    ['Reviewing: Silva et al. draft', 'Dr. Ortega', 'paper', 'Thu', 'review', 2],
    ['Weekly group meeting agenda', 'Dr. Ortega', 'team', 'Mon', 'done', 1],
    ['Fix leak in coolant loop', 'D. Hernandez', 'maintenance', '\u2014', 'done', 2],
  ];
  const stmt = db.prepare('INSERT INTO tasks (title, assignee, tag, due_label, status, sort_order) VALUES (?,?,?,?,?,?)');
  for (const t of tasks) stmt.run(...t);
}

if (db.prepare('SELECT COUNT(*) as cnt FROM meetings').get().cnt === 0) {
  const meetings = [
    ['TODAY', '09:30 \u2013 10:30', 'Weekly group meeting', 'Tolentine 344', 'AO,SK,MR,AP,DH,VH,+9', 'team', 1],
    ['TODAY', '14:00 \u2013 14:30', '1:1 \u00b7 Ortega \u2194 Reyes', 'Office 218', 'AO,MR', '1:1', 2],
    ['TUE',   '11:00 \u2013 12:00', 'E3S quarterly sync', 'Remote \u00b7 Zoom', 'AO,SK,+4', 'external', 3],
    ['WED',   '15:00 \u2013 16:00', 'Paper review \u00b7 Silva et al.', 'Tolentine 344', 'AO,SK,MR,AP', 'review', 4],
    ['FRI',   '10:00 \u2013 11:30', 'New student onboarding', 'Mendel 270', 'SK,+2', 'onboarding', 5],
  ];
  const stmt = db.prepare('INSERT INTO meetings (day_label, time_label, title, room, attendees, type, sort_order) VALUES (?,?,?,?,?,?,?)');
  for (const m of meetings) stmt.run(...m);
}

if (db.prepare('SELECT COUNT(*) as cnt FROM inventory').get().cnt === 0) {
  const inv = [
    ['A', 'SN-LAT-00472', 'K-type thermocouples (0.010\")', 'Sensors',     3,  20, 1],
    ['A', 'SN-LAT-00488', 'Silicon-carbide cold plates',     'Hardware',    12, 4,  2],
    ['A', 'SN-LAT-00501', 'Viton O-rings \u00b7 size 012',  'Consumables', 0,  50, 3],
    ['A', 'SN-LAT-00512', 'Deionized water (4L)',            'Fluids',      6,  3,  4],
    ['A', 'SN-LAT-00530', 'Pressure transducers \u00b7 Omega','Sensors',   2,  2,  5],
    ['A', 'SN-LAT-00544', 'PTFE tubing (1/4\")',            'Consumables', 18, 25, 6],
    ['A', 'SN-LAT-00562', 'Glycol-water mixture 50/50',      'Fluids',      4,  2,  7],
    ['B', 'SN-LAT-01004', 'Nikon high-speed camera lens',    'Optics',      1,  1,  1],
    ['B', 'SN-LAT-01012', 'PIV seeding particles (10 \u00b5m)','Consumables',0,2, 2],
    ['B', 'SN-LAT-01020', 'Laser safety goggles',            'PPE',         8,  6,  3],
    ['B', 'SN-LAT-01035', 'Nitrogen cylinder \u00b7 compressed','Fluids', 2,   1,  4],
    ['B', 'SN-LAT-01044', 'IR transparent windows \u00b7 ZnSe','Optics',  5,   3,  5],
  ];
  const stmt = db.prepare('INSERT INTO inventory (lab, sku, name, category, qty, min_qty, sort_order) VALUES (?,?,?,?,?,?,?)');
  for (const i of inv) stmt.run(...i);
}

if (db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt === 0) {
  const projs = [
    ['NSF E3S \u2014 Phase III', 'Dr. A. Ortega', 'active', 'Energy-efficient electronic systems \u00b7 Villanova node.', 1],
    ['Microchannel cold plates', 'L. Kim',     'active', 'Industry partnership \u00b7 cooling for high-flux electronics.', 2],
    ['Droplet impingement rig', 'M. Reyes',    'active', 'Spray cooling experiments + numerical model validation.', 3],
    ['Synthetic jet program',   'A. Park',     'paused', 'Convective enhancement using synthetic impinging jets.', 4],
    ['Geothermal storage',      'D. Hernandez','active', 'DOE-funded underground storage characterization.', 5],
  ];
  const stmt = db.prepare('INSERT INTO projects (title, lead, status, description, sort_order) VALUES (?,?,?,?,?)');
  for (const p of projs) stmt.run(...p);
}

// Post-seed data migration: add ES2 sponsor if it doesn't exist in an existing DB
try {
  const es2Exists = db.prepare("SELECT id, show_in_footer FROM sponsors WHERE name LIKE '%ES2%' OR name LIKE '%E3S%' OR name LIKE '%Energy Efficient Electronic%'").get();
  if (!es2Exists) {
    db.prepare('INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)').run('ES2 - Energy Efficient Electronic Systems', '/images/sponses2.svg', 'https://www.e3s-center.org', 11, 1);
  } else if (!es2Exists.show_in_footer) {
    db.prepare('UPDATE sponsors SET show_in_footer=1 WHERE id=?').run(es2Exists.id);
  }
} catch(e) { console.error('ES2 migration error:', e.message); }

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'latfs-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite: 'strict' }
}));
app.use(express.static(path.join(__dirname, 'public')));
// Serve old static files for legacy URLs
app.use(express.static(__dirname));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const apiWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const apiReadLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// CSRF token middleware for mutating admin routes
function requireCsrf(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

// Role-based access control
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Auth required' });
    const role = req.session.role || 'student';
    if (!roles.includes(role)) return res.status(403).json({ error: 'Forbidden — needs role: ' + roles.join('/') });
    next();
  };
}

// Convenience: admin or professor (anyone who can manage the lab)
const requireStaff = requireRole('admin', 'professor');

// Admin auth routes
app.post('/admin/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'student';
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
    res.json({ success: true, username: user.username, name: user.name || '', role: user.role || 'student', csrfToken: req.session.csrfToken });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/admin/check', (req, res) => {
  if (req.session && req.session.userId) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
    }
    const u = db.prepare('SELECT id, username, name, role, email FROM users WHERE id=?').get(req.session.userId) || {};
    res.json({ loggedIn: true, username: req.session.username, name: u.name || '', role: u.role || req.session.role || 'student', email: u.email || '', csrfToken: req.session.csrfToken });
  } else {
    res.json({ loggedIn: false });
  }
});

// NEWS API — write operations restricted to staff (admin/professor)
app.get('/api/news', apiReadLimiter, (req, res) => {
  const news = db.prepare('SELECT * FROM news ORDER BY date DESC, id DESC').all();
  res.json(news);
});

app.post('/api/news', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { title, content, date, image_url, slug } = req.body;
  if (!title || !content || !date) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO news (title, content, date, image_url, slug) VALUES (?, ?, ?, ?, ?)').run(title, content, date, image_url || '', slug || '');
  res.json({ id: result.lastInsertRowid, title, content, date });
});

app.put('/api/news/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { title, content, date, image_url, slug } = req.body;
  db.prepare('UPDATE news SET title=?, content=?, date=?, image_url=?, slug=? WHERE id=?').run(title, content, date, image_url || '', slug || '', req.params.id);
  res.json({ success: true });
});

app.delete('/api/news/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM news WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// PUBLICATIONS API — write operations restricted to staff
app.get('/api/publications', apiReadLimiter, (req, res) => {
  const pubs = db.prepare('SELECT * FROM publications ORDER BY year DESC, id DESC').all();
  res.json(pubs);
});

app.post('/api/publications', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { title, authors, venue, year, pdf_url, doi_url, citation_url } = req.body;
  if (!title || !authors || !venue || !year) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO publications (title, authors, venue, year, pdf_url, doi_url, citation_url) VALUES (?, ?, ?, ?, ?, ?, ?)').run(title, authors, venue, year, pdf_url || null, doi_url || null, citation_url || null);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/publications/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { title, authors, venue, year, pdf_url, doi_url, citation_url } = req.body;
  db.prepare('UPDATE publications SET title=?, authors=?, venue=?, year=?, pdf_url=?, doi_url=?, citation_url=? WHERE id=?').run(title, authors, venue, year, pdf_url || null, doi_url || null, citation_url || null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/publications/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM publications WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// PEOPLE API — write operations restricted to staff
app.get('/api/people', apiReadLimiter, (req, res) => {
  const { category, active } = req.query;
  let sql = 'SELECT * FROM people WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category=?'; params.push(category); }
  if (active !== undefined) { sql += ' AND active=?'; params.push(active === 'true' || active === '1' ? 1 : 0); }
  sql += ' ORDER BY category, name';
  const people = db.prepare(sql).all(...params);
  res.json(people);
});

app.post('/api/people', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, role, category, bio, photo_url, photo_position, email, linkedin_url, website_url, active } = req.body;
  if (!name || !role || !category) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO people (name, role, category, bio, photo_url, photo_position, email, linkedin_url, website_url, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, role, category, bio || '', photo_url || '', photo_position || 'center center', email || '', linkedin_url || '', website_url || '', active !== false ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/people/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, role, category, bio, photo_url, photo_position, email, linkedin_url, website_url, active } = req.body;
  db.prepare('UPDATE people SET name=?, role=?, category=?, bio=?, photo_url=?, photo_position=?, email=?, linkedin_url=?, website_url=?, active=? WHERE id=?').run(name, role, category, bio || '', photo_url || '', photo_position || 'center center', email || '', linkedin_url || '', website_url || '', active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/people/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM people WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// RESEARCH API — write operations restricted to staff
app.get('/api/research', apiReadLimiter, (req, res) => {
  const areas = db.prepare('SELECT * FROM research ORDER BY sort_order, id').all();
  res.json(areas);
});

app.post('/api/research', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { title, description, content, image_url, links, sort_order } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO research (title, description, content, image_url, links, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(title, description, content || '', image_url || '', links || '[]', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/research/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { title, description, content, image_url, links, sort_order } = req.body;
  db.prepare('UPDATE research SET title=?, description=?, content=?, image_url=?, links=?, sort_order=? WHERE id=?').run(title, description, content || '', image_url || '', links || '[]', sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/research/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM research WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// SPONSORS API — write operations restricted to staff
app.get('/api/sponsors', apiReadLimiter, (req, res) => {
  const sponsors = db.prepare('SELECT * FROM sponsors ORDER BY sort_order, id').all();
  res.json(sponsors);
});

app.post('/api/sponsors', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, logo_url, website_url, sort_order, show_in_footer } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const result = db.prepare('INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)').run(name, logo_url || '', website_url || '', sort_order || 0, show_in_footer ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/sponsors/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, logo_url, website_url, sort_order, show_in_footer } = req.body;
  db.prepare('UPDATE sponsors SET name=?, logo_url=?, website_url=?, sort_order=?, show_in_footer=? WHERE id=?').run(name, logo_url || '', website_url || '', sort_order || 0, show_in_footer ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/sponsors/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM sponsors WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PHOTO UPLOAD API
const uploadRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.post('/api/upload/photo', uploadRateLimiter, requireAuth, requireCsrf, (req, res) => {
  photoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// DOCUMENT UPLOAD API
app.post('/api/upload/document', uploadRateLimiter, requireAuth, requireCsrf, (req, res) => {
  docUpload.single('document')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    if (!req.file) return res.status(400).json({ error: 'No document file provided' });
    res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
  });
});

// GALLERY API
app.get('/api/gallery', apiReadLimiter, (req, res) => {
  const photos = db.prepare('SELECT * FROM gallery ORDER BY sort_order, id').all();
  res.json(photos);
});

app.post('/api/gallery', uploadRateLimiter, requireAuth, requireCsrf, (req, res) => {
  photoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const image_url = `/uploads/${req.file.filename}`;
    const caption = (req.body.caption || '').slice(0, 200);
    const sort_order = parseInt(req.body.sort_order, 10) || 0;
    const result = db.prepare('INSERT INTO gallery (image_url, caption, sort_order) VALUES (?, ?, ?)').run(image_url, caption, sort_order);
    res.json({ id: result.lastInsertRowid, image_url, caption, sort_order });
  });
});

app.delete('/api/gallery/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const photo = db.prepare('SELECT * FROM gallery WHERE id=?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);
  // Delete uploaded file from disk if it lives in /uploads/
  if (photo.image_url && photo.image_url.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, photo.image_url);
    fs.unlink(filePath, (err) => { if (err) console.error('Failed to delete gallery file:', filePath, err.message); });
  }
  res.json({ success: true });
});

// HERO SLIDES API (separate from photo gallery)
app.get('/api/hero-slides', apiReadLimiter, (req, res) => {
  const slides = db.prepare('SELECT * FROM hero_slides ORDER BY sort_order, id').all();
  res.json(slides);
});

app.post('/api/hero-slides', uploadRateLimiter, requireAuth, requireCsrf, (req, res) => {
  photoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const image_url = `/uploads/${req.file.filename}`;
    const title = (req.body.title || '').slice(0, 200);
    const caption = (req.body.caption || '').slice(0, 400);
    const sort_order = parseInt(req.body.sort_order, 10) || 0;
    const result = db.prepare('INSERT INTO hero_slides (image_url, title, caption, sort_order) VALUES (?, ?, ?, ?)').run(image_url, title, caption, sort_order);
    res.json({ id: result.lastInsertRowid, image_url, title, caption, sort_order });
  });
});

app.put('/api/hero-slides/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, caption, sort_order } = req.body;
  db.prepare('UPDATE hero_slides SET title=?, caption=?, sort_order=? WHERE id=?').run(title || '', caption || '', sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/hero-slides/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const slide = db.prepare('SELECT * FROM hero_slides WHERE id=?').get(req.params.id);
  if (!slide) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM hero_slides WHERE id=?').run(req.params.id);
  if (slide.image_url && slide.image_url.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, slide.image_url);
    fs.unlink(filePath, (err) => { if (err) console.error('Failed to delete hero slide file:', filePath, err.message); });
  }
  res.json({ success: true });
});

// FACILITIES API
app.get('/api/facilities', apiReadLimiter, (req, res) => {
  const items = db.prepare('SELECT * FROM facilities ORDER BY sort_order, id').all();
  res.json(items);
});

app.post('/api/facilities', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, description, content, photo_url, doc_url, doc_name, sort_order } = req.body;
  if (!name || !description) return res.status(400).json({ error: 'Missing required fields' });
  const result = db.prepare('INSERT INTO facilities (name, description, content, photo_url, doc_url, doc_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, description, content || '', photo_url || '', doc_url || '', doc_name || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/facilities/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, description, content, photo_url, doc_url, doc_name, sort_order } = req.body;
  db.prepare('UPDATE facilities SET name=?, description=?, content=?, photo_url=?, doc_url=?, doc_name=?, sort_order=? WHERE id=?').run(name, description, content || '', photo_url || '', doc_url || '', doc_name || '', sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/facilities/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const item = db.prepare('SELECT * FROM facilities WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM facilities WHERE id=?').run(req.params.id);
  // Clean up uploaded files from disk
  for (const urlField of [item.photo_url, item.doc_url]) {
    if (urlField && urlField.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, urlField);
      fs.unlink(filePath, (err) => { if (err) console.error('Failed to delete file:', filePath, err.message); });
    }
  }
  res.json({ success: true });
});

// ────────────────────────────────────────────────────────────────────────
// PLATFORM API — Schedule, Tasks, Meetings, Inventory, Projects
// ────────────────────────────────────────────────────────────────────────

// EVENTS — schedule entries (meetings, seminars, reservations) used by /platform Schedule
app.get('/api/events', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM events ORDER BY COALESCE(start_time, ""), id').all());
});
app.post('/api/events', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, event_type, start_time, end_time, location, visibility, attendees } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'Title and start time are required' });
  const result = db.prepare('INSERT INTO events (title, event_type, start_time, end_time, location, visibility, attendees, owner_user_id) VALUES (?,?,?,?,?,?,?,?)')
    .run(title, event_type || 'meeting', start_time, end_time || '', location || '', visibility || 'public', attendees || '', req.session.userId || null);
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/events/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Not found' });
  const role = req.session.role || 'student';
  const isOwner = ev.owner_user_id === req.session.userId;
  if (!isOwner && role !== 'admin' && role !== 'professor') return res.status(403).json({ error: 'Only the owner or staff can edit this event' });
  const { title, event_type, start_time, end_time, location, visibility, attendees } = req.body;
  const sets = [], params = [];
  if (title !== undefined)      { sets.push('title=?');      params.push(title); }
  if (event_type !== undefined) { sets.push('event_type=?'); params.push(event_type); }
  if (start_time !== undefined) { sets.push('start_time=?'); params.push(start_time); }
  if (end_time !== undefined)   { sets.push('end_time=?');   params.push(end_time || ''); }
  if (location !== undefined)   { sets.push('location=?');   params.push(location || ''); }
  if (visibility !== undefined) { sets.push('visibility=?'); params.push(visibility || 'public'); }
  if (attendees !== undefined)  { sets.push('attendees=?');  params.push(attendees || ''); }
  if (!sets.length) return res.json({ success: true });
  params.push(req.params.id);
  db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id=?`).run(...params);
  res.json({ success: true });
});
app.delete('/api/events/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// TASKS
app.get('/api/tasks', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM tasks ORDER BY status, sort_order, id').all());
});
app.post('/api/tasks', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, description, assignee_user_id, priority, due_date, status, tag, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Missing title' });
  const result = db.prepare('INSERT INTO tasks (title, description, assignee_user_id, created_by_user_id, priority, due_date, status, tag, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(title, description || '', assignee_user_id || null, req.session.userId || null, priority || 'normal', due_date || '', status || 'todo', tag || 'lab', sort_order || 0);
  // Email notification — alert the assignee if different from creator
  if (assignee_user_id && Number(assignee_user_id) !== req.session.userId) {
    const assignee = db.prepare('SELECT name, email FROM users WHERE id=?').get(assignee_user_id);
    const creator  = db.prepare('SELECT name FROM users WHERE id=?').get(req.session.userId);
    if (assignee && assignee.email) {
      sendMail(
        assignee.email,
        `[LATFS] Task assigned to you: ${title}`,
        `Hi ${assignee.name || assignee.email},\n\nA new task has been assigned to you by ${creator ? creator.name : 'a lab member'}.\n\nTask: ${title}\nPriority: ${priority || 'normal'}${due_date ? '\nDue: ' + due_date : ''}\n\nLog in to the LATFS Platform to view details.\n`
      );
    }
  }
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/tasks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, description, assignee_user_id, priority, due_date, status, tag, sort_order } = req.body;
  const sets = [], params = [];
  if (title !== undefined)            { sets.push('title=?');            params.push(title); }
  if (description !== undefined)      { sets.push('description=?');      params.push(description || ''); }
  if (assignee_user_id !== undefined) { sets.push('assignee_user_id=?'); params.push(assignee_user_id || null); }
  if (priority !== undefined)         { sets.push('priority=?');         params.push(priority || 'normal'); }
  if (due_date !== undefined)         { sets.push('due_date=?');         params.push(due_date || ''); }
  if (status !== undefined)           { sets.push('status=?');           params.push(status || 'todo'); }
  if (tag !== undefined)              { sets.push('tag=?');              params.push(tag || 'lab'); }
  if (sort_order !== undefined)       { sets.push('sort_order=?');       params.push(sort_order || 0); }
  if (!sets.length) return res.json({ success: true });
  params.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id=?`).run(...params);
  res.json({ success: true });
});
app.delete('/api/tasks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// MEETINGS — group meetings, seminars and announcements
app.get('/api/meetings', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM meetings ORDER BY COALESCE(scheduled_at, ""), sort_order, id').all());
});
app.post('/api/meetings', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, meeting_type, scheduled_at, location, description, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = db.prepare('INSERT INTO meetings (title, meeting_type, scheduled_at, location, description, sort_order) VALUES (?,?,?,?,?,?)')
    .run(title, meeting_type || 'group', scheduled_at || '', location || '', description || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/meetings/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, meeting_type, scheduled_at, location, description, sort_order } = req.body;
  const sets = [], params = [];
  if (title !== undefined)        { sets.push('title=?');        params.push(title); }
  if (meeting_type !== undefined) { sets.push('meeting_type=?'); params.push(meeting_type || 'group'); }
  if (scheduled_at !== undefined) { sets.push('scheduled_at=?'); params.push(scheduled_at || ''); }
  if (location !== undefined)     { sets.push('location=?');     params.push(location || ''); }
  if (description !== undefined)  { sets.push('description=?');  params.push(description || ''); }
  if (sort_order !== undefined)   { sets.push('sort_order=?');   params.push(sort_order || 0); }
  if (!sets.length) return res.json({ success: true });
  params.push(req.params.id);
  db.prepare(`UPDATE meetings SET ${sets.join(', ')} WHERE id=?`).run(...params);
  res.json({ success: true });
});
app.delete('/api/meetings/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM meetings WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// INVENTORY
app.get('/api/inventory', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM inventory ORDER BY lab, sort_order, id').all());
});
app.post('/api/inventory', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { lab, sku, name, category, qty, min_qty, sort_order } = req.body;
  if (!sku || !name) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = db.prepare('INSERT INTO inventory (lab, sku, name, category, qty, min_qty, sort_order) VALUES (?,?,?,?,?,?,?)')
      .run(lab || 'A', sku, name, category || '', qty || 0, min_qty || 0, sort_order || 0);
    res.json({ id: result.lastInsertRowid });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU already exists' });
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/inventory/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { lab, sku, name, category, qty, min_qty, sort_order } = req.body;
  db.prepare('UPDATE inventory SET lab=?, sku=?, name=?, category=?, qty=?, min_qty=?, sort_order=? WHERE id=?')
    .run(lab || 'A', sku, name, category || '', qty || 0, min_qty || 0, sort_order || 0, req.params.id);
  res.json({ success: true });
});
app.delete('/api/inventory/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM inventory WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// APPS — HTML mini-applications featured on the public website
app.get('/api/apps', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM apps WHERE published=1 ORDER BY sort_order, id').all());
});
app.get('/api/apps/all', apiReadLimiter, requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM apps ORDER BY sort_order, id').all());
});
app.post('/api/apps', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { slug, title, summary, description, url, embed_html, thumbnail, sort_order, published } = req.body;
  if (!slug || !title) return res.status(400).json({ error: 'slug and title required' });
  try {
    const r = db.prepare('INSERT INTO apps (slug, title, summary, description, url, embed_html, thumbnail, sort_order, published) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(slug, title, summary||'', description||'', url||'', embed_html||'', thumbnail||'', sort_order||0, published===0?0:1);
    res.json({ id: r.lastInsertRowid });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/apps/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { slug, title, summary, description, url, embed_html, thumbnail, sort_order, published } = req.body;
  db.prepare('UPDATE apps SET slug=?, title=?, summary=?, description=?, url=?, embed_html=?, thumbnail=?, sort_order=?, published=? WHERE id=?')
    .run(slug, title, summary||'', description||'', url||'', embed_html||'', thumbnail||'', sort_order||0, published===0?0:1, req.params.id);
  res.json({ success: true });
});
app.delete('/api/apps/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM apps WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// PROJECTS
app.get('/api/projects', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM projects ORDER BY sort_order, id').all());
});
app.post('/api/projects', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, lead, status, description, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Missing title' });
  const result = db.prepare('INSERT INTO projects (title, lead, status, description, sort_order) VALUES (?,?,?,?,?)')
    .run(title, lead || '', status || 'active', description || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/projects/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, lead, status, description, sort_order } = req.body;
  db.prepare('UPDATE projects SET title=?, lead=?, status=?, description=?, sort_order=? WHERE id=?')
    .run(title, lead || '', status || 'active', description || '', sort_order || 0, req.params.id);
  res.json({ success: true });
});
app.delete('/api/projects/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ---- Self / current user ----
app.get('/api/me', apiReadLimiter, (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Auth required' });
  const u = db.prepare('SELECT id, username, name, role, email, person_id FROM users WHERE id=?').get(req.session.userId);
  if (!u) return res.status(401).json({ error: 'Auth required' });
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }
  res.json({ loggedIn: true, ...u, csrfToken: req.session.csrfToken });
});

// ---- Users (admin/professor manage; everyone can list lightweight roster for assignment) ----
app.get('/api/users', apiReadLimiter, requireAuth, (req, res) => {
  const rows = db.prepare("SELECT id, username, name, role, email, active FROM users WHERE active!=0 ORDER BY role, name, username").all();
  res.json(rows);
});
app.post('/api/users', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { username, password, name, role, email } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, role required' });
  if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username)) return res.status(409).json({ error: 'username exists' });
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (username, password, name, role, email, active) VALUES (?,?,?,?,?,1)')
    .run(username, hash, name || '', role, email || '');
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/users/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, role, email, active, password } = req.body;
  const sets = [], params = [];
  if (name !== undefined)   { sets.push('name=?');   params.push(name); }
  if (role !== undefined)   { sets.push('role=?');   params.push(role); }
  if (email !== undefined)  { sets.push('email=?');  params.push(email); }
  if (active !== undefined) { sets.push('active=?'); params.push(active ? 1 : 0); }
  if (password)             { sets.push('password=?'); params.push(bcrypt.hashSync(password, 10)); }
  if (!sets.length) return res.json({ success: true });
  params.push(req.params.id);
  db.prepare('UPDATE users SET ' + sets.join(', ') + ' WHERE id=?').run(...params);
  res.json({ success: true });
});
app.delete('/api/users/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  if (Number(req.params.id) === req.session.userId) return res.status(400).json({ error: "can't delete self" });
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(req.params.id); // soft-delete
  res.json({ success: true });
});

// ---- Equipment ----
app.get('/api/equipment', apiReadLimiter, (req, res) => {
  const rows = db.prepare(`
    SELECT e.*,
      lu.name AS last_used_user_name, lu.username AS last_used_username,
      cu.name AS current_user_name,   cu.username AS current_username
    FROM equipment e
    LEFT JOIN users lu ON lu.id = e.last_used_user_id
    LEFT JOIN users cu ON cu.id = e.current_user_id
    ORDER BY e.sort_order, e.name`).all();
  res.json(rows);
});
app.post('/api/equipment', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, sku, category, location, status, notes, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare('INSERT INTO equipment (name, sku, category, location, status, notes, sort_order) VALUES (?,?,?,?,?,?,?)')
    .run(name, sku || null, category || '', location || '', status || 'available', notes || '', sort_order || 0);
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/equipment/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  const { name, sku, category, location, status, notes, sort_order } = req.body;
  db.prepare('UPDATE equipment SET name=?, sku=?, category=?, location=?, status=?, notes=?, sort_order=? WHERE id=?')
    .run(name, sku || null, category || '', location || '', status || 'available', notes || '', sort_order || 0, req.params.id);
  res.json({ success: true });
});
app.delete('/api/equipment/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM equipment WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Check out: any authed user can claim a free piece of equipment
app.post('/api/equipment/:id/checkout', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id);
  if (!eq) return res.status(404).json({ error: 'not found' });
  if (eq.current_user_id) return res.status(409).json({ error: 'already checked out' });
  if (eq.status === 'broken' || eq.status === 'maintenance') return res.status(409).json({ error: 'unavailable: ' + eq.status });
  const note = (req.body && req.body.note) || '';
  const userId = req.session.userId;
  db.prepare('UPDATE equipment SET status=?, current_user_id=?, last_used_user_id=?, last_used_at=CURRENT_TIMESTAMP WHERE id=?')
    .run('in_use', userId, userId, eq.id);
  db.prepare('INSERT INTO equipment_log (equipment_id, user_id, action, note) VALUES (?,?,?,?)').run(eq.id, userId, 'checkout', note);
  res.json({ success: true });
});

// Check in: only the current holder, an admin, or a professor can return
app.post('/api/equipment/:id/checkin', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id);
  if (!eq) return res.status(404).json({ error: 'not found' });
  const role = req.session.role || 'student';
  if (eq.current_user_id !== req.session.userId && role !== 'admin' && role !== 'professor') {
    return res.status(403).json({ error: 'only current holder or staff can check in' });
  }
  const note = (req.body && req.body.note) || '';
  db.prepare('UPDATE equipment SET status=?, current_user_id=NULL, last_used_at=CURRENT_TIMESTAMP WHERE id=?')
    .run('available', eq.id);
  db.prepare("UPDATE equipment_log SET ended_at=CURRENT_TIMESTAMP WHERE equipment_id=? AND user_id=? AND action='checkout' AND ended_at IS NULL")
    .run(eq.id, eq.current_user_id || req.session.userId);
  db.prepare('INSERT INTO equipment_log (equipment_id, user_id, action, note) VALUES (?,?,?,?)').run(eq.id, req.session.userId, 'checkin', note);
  res.json({ success: true });
});

app.get('/api/equipment/:id/log', apiReadLimiter, requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, u.username, u.name AS user_name
    FROM equipment_log l LEFT JOIN users u ON u.id = l.user_id
    WHERE l.equipment_id=? ORDER BY l.id DESC LIMIT 100`).all(req.params.id);
  res.json(rows);
});

// ---- Issues ----
app.get('/api/issues', apiReadLimiter, requireAuth, (req, res) => {
  const { status, mine } = req.query;
  let sql = `SELECT i.*,
      r.name AS reporter_name, r.username AS reporter_username,
      a.name AS assignee_name, a.username AS assignee_username,
      e.name AS equipment_name
    FROM issues i
    LEFT JOIN users r ON r.id = i.reporter_user_id
    LEFT JOIN users a ON a.id = i.assignee_user_id
    LEFT JOIN equipment e ON e.id = i.related_equipment_id
    WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND i.status=?'; params.push(status); }
  if (mine === '1') { sql += ' AND (i.reporter_user_id=? OR i.assignee_user_id=?)'; params.push(req.session.userId, req.session.userId); }
  sql += " ORDER BY CASE i.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, CASE i.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, i.created_at DESC";
  res.json(db.prepare(sql).all(...params));
});
app.post('/api/issues', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, body, category, priority, related_equipment_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = db.prepare('INSERT INTO issues (title, body, category, priority, reporter_user_id, related_equipment_id) VALUES (?,?,?,?,?,?)')
    .run(title, body || '', category || 'other', priority || 'normal', req.session.userId, related_equipment_id || null);
  // Email notification — alert all professors/admins about new issues
  const reporter = db.prepare('SELECT name FROM users WHERE id=?').get(req.session.userId);
  const staffEmails = db.prepare("SELECT email FROM users WHERE role IN ('admin','professor') AND email != '' AND active != 0").all().map(u => u.email);
  if (staffEmails.length) {
    sendMail(
      staffEmails,
      `[LATFS] New ${priority || 'normal'}-priority issue: ${title}`,
      `A new lab issue has been reported.\n\nTitle: ${title}\nCategory: ${category || 'other'}\nPriority: ${priority || 'normal'}\nReported by: ${reporter ? reporter.name : 'a lab member'}\n${body ? '\nDetails:\n' + body + '\n' : ''}\nLog in to the LATFS Platform to manage this issue.\n`
    );
  }
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/issues/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  // Anyone can update title/body if reporter; status/assignee only by staff
  const issue = db.prepare('SELECT * FROM issues WHERE id=?').get(req.params.id);
  if (!issue) return res.status(404).json({ error: 'not found' });
  const role = req.session.role || 'student';
  const isStaff = role === 'admin' || role === 'professor';
  const isReporter = issue.reporter_user_id === req.session.userId;
  if (!isStaff && !isReporter) return res.status(403).json({ error: 'not allowed' });
  const sets = [], params = [];
  const { title, body, category, priority, status, assignee_user_id, related_equipment_id } = req.body;
  if (title !== undefined && (isReporter || isStaff)) { sets.push('title=?'); params.push(title); }
  if (body !== undefined && (isReporter || isStaff)) { sets.push('body=?'); params.push(body); }
  if (category !== undefined && (isReporter || isStaff)) { sets.push('category=?'); params.push(category); }
  if (priority !== undefined && isStaff) { sets.push('priority=?'); params.push(priority); }
  if (status !== undefined && isStaff) { sets.push('status=?'); params.push(status); }
  if (assignee_user_id !== undefined && isStaff) { sets.push('assignee_user_id=?'); params.push(assignee_user_id || null); }
  if (related_equipment_id !== undefined && isStaff) { sets.push('related_equipment_id=?'); params.push(related_equipment_id || null); }
  if (!sets.length) return res.json({ success: true });
  sets.push('updated_at=CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare('UPDATE issues SET ' + sets.join(', ') + ' WHERE id=?').run(...params);
  res.json({ success: true });
});
app.delete('/api/issues/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM issues WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM issue_comments WHERE issue_id=?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/issues/:id/comments', apiReadLimiter, requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT c.*, u.name AS user_name, u.username FROM issue_comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.issue_id=? ORDER BY c.id`).all(req.params.id));
});
app.post('/api/issues/:id/comments', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  const r = db.prepare('INSERT INTO issue_comments (issue_id, user_id, body) VALUES (?,?,?)').run(req.params.id, req.session.userId, body);
  res.json({ id: r.lastInsertRowid });
});

// ---- Per-user task helpers ----
// Listing tasks already exists at /api/tasks; provide an enriched view with assignee info + filter "mine".
app.get('/api/tasks/full', apiReadLimiter, requireAuth, (req, res) => {
  const { mine, status } = req.query;
  let sql = `SELECT t.*, u.name AS assignee_name, u.username AS assignee_username
             FROM tasks t LEFT JOIN users u ON u.id = t.assignee_user_id WHERE 1=1`;
  const params = [];
  if (mine === '1') { sql += ' AND t.assignee_user_id=?'; params.push(req.session.userId); }
  if (status) { sql += ' AND t.status=?'; params.push(status); }
  sql += ' ORDER BY t.status, t.sort_order, t.id';
  res.json(db.prepare(sql).all(...params));
});

// ---- PI / Director dashboard overview (staff only) ----
// Returns a single JSON snapshot of key lab metrics useful for the director.
app.get('/api/dashboard/pi', apiReadLimiter, requireStaff, (req, res) => {
  const totalMembers     = db.prepare("SELECT COUNT(*) as n FROM users WHERE active!=0").get().n;
  const openIssues       = db.prepare("SELECT COUNT(*) as n FROM issues WHERE status='open'").get().n;
  const highIssues       = db.prepare("SELECT COUNT(*) as n FROM issues WHERE status='open' AND priority='high'").get().n;
  const equipmentInUse   = db.prepare("SELECT COUNT(*) as n FROM equipment WHERE current_user_id IS NOT NULL").get().n;
  const overdueTasks     = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status NOT IN ('done') AND due_date != '' AND date(due_date) < date('now')").get().n;
  const recentIssues     = db.prepare(`
    SELECT i.id, i.title, i.priority, i.status, i.created_at, u.name AS reporter_name
    FROM issues i LEFT JOIN users u ON u.id=i.reporter_user_id
    WHERE i.status='open' ORDER BY CASE i.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, i.created_at DESC LIMIT 5`).all();
  const checkedOutEq     = db.prepare(`
    SELECT e.name, e.sku, e.last_used_at, u.name AS held_by
    FROM equipment e LEFT JOIN users u ON u.id=e.current_user_id
    WHERE e.current_user_id IS NOT NULL ORDER BY e.last_used_at ASC LIMIT 10`).all();
  const upcomingEvents   = db.prepare(`
    SELECT title, start_time, location FROM events
    WHERE datetime(start_time) >= datetime('now') ORDER BY start_time LIMIT 5`).all();
  const overdueTasksList = db.prepare(`
    SELECT t.title, t.due_date, u.name AS assignee_name
    FROM tasks t LEFT JOIN users u ON u.id=t.assignee_user_id
    WHERE t.status NOT IN ('done') AND t.due_date != '' AND date(t.due_date) < date('now')
    ORDER BY t.due_date ASC LIMIT 10`).all();

  res.json({
    totalMembers, openIssues, highIssues, equipmentInUse, overdueTasks,
    recentIssues, checkedOutEq, upcomingEvents, overdueTasksList
  });
});

// ---- Generic documents (attached files for any entity) ----
app.get('/api/documents', apiReadLimiter, (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id required' });
  res.json(db.prepare('SELECT * FROM documents WHERE entity_type=? AND entity_id=? ORDER BY sort_order, id').all(entity_type, entity_id));
});
app.post('/api/documents', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { entity_type, entity_id, title, file_url, file_name, sort_order } = req.body;
  if (!entity_type || !entity_id || !file_url) return res.status(400).json({ error: 'entity_type, entity_id, file_url required' });
  const r = db.prepare('INSERT INTO documents (entity_type, entity_id, title, file_url, file_name, sort_order) VALUES (?,?,?,?,?,?)')
    .run(entity_type, entity_id, title || '', file_url, file_name || '', sort_order || 0);
  res.json({ id: r.lastInsertRowid });
});
app.delete('/api/documents/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM documents WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/platform', (req, res) => res.sendFile(path.join(__dirname, 'public', 'platform.html')));

// ── Lab calendar — iCal export ───────────────────────────────────────────────
// Public endpoint (no auth required) so users can subscribe in Google/Apple Calendar.
// URL: /api/events/calendar.ics
function toICSDate(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d)) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
function escapeICS(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
app.get('/api/events/calendar.ics', apiReadLimiter, (req, res) => {
  const events = db.prepare('SELECT * FROM events WHERE visibility != ? OR visibility IS NULL ORDER BY start_time').all('private');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LATFS//Lab Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LATFS Lab Schedule',
    'X-WR-CALDESC:Laboratory for Advanced Thermal and Fluid Systems — public schedule',
  ];
  for (const ev of events) {
    const dtStart = toICSDate(ev.start_time);
    if (!dtStart) continue;
    const dtEnd = toICSDate(ev.end_time) || dtStart;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:latfs-ev-${ev.id}@latfs.villanova.edu`);
    lines.push(`DTSTAMP:${toICSDate(new Date())}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`);
    if (ev.event_type) lines.push(`CATEGORIES:${escapeICS(ev.event_type)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="latfs-schedule.ics"');
  res.send(lines.join('\r\n'));
});

app.listen(PORT, () => {
  console.log(`LATFS Website running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Platform:    http://localhost:${PORT}/platform`);
});
