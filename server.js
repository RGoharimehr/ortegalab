const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
`);

// Migrations: add new columns to existing databases (errors for duplicate columns are expected and ignored)
const migrations = [
  'ALTER TABLE research ADD COLUMN content TEXT DEFAULT ""',
  'ALTER TABLE research ADD COLUMN links TEXT DEFAULT "[]"',
  'ALTER TABLE publications ADD COLUMN doi_url TEXT',
  'ALTER TABLE people ADD COLUMN linkedin_url TEXT DEFAULT ""',
  'ALTER TABLE people ADD COLUMN website_url TEXT DEFAULT ""',
  'ALTER TABLE sponsors ADD COLUMN show_in_footer INTEGER DEFAULT 0',
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

// Seed admin user
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
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
  secret: 'latfs-secret-key-2024',
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

// Admin auth routes
app.post('/admin/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
    res.json({ success: true, username: user.username, csrfToken: req.session.csrfToken });
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
    res.json({ loggedIn: true, username: req.session.username, csrfToken: req.session.csrfToken });
  } else {
    res.json({ loggedIn: false });
  }
});

// NEWS API
app.get('/api/news', apiReadLimiter, (req, res) => {
  const news = db.prepare('SELECT * FROM news ORDER BY date DESC, id DESC').all();
  res.json(news);
});

app.post('/api/news', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, content, date } = req.body;
  if (!title || !content || !date) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO news (title, content, date) VALUES (?, ?, ?)').run(title, content, date);
  res.json({ id: result.lastInsertRowid, title, content, date });
});

app.put('/api/news/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, content, date } = req.body;
  db.prepare('UPDATE news SET title=?, content=?, date=? WHERE id=?').run(title, content, date, req.params.id);
  res.json({ success: true });
});

app.delete('/api/news/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM news WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// PUBLICATIONS API
app.get('/api/publications', apiReadLimiter, (req, res) => {
  const pubs = db.prepare('SELECT * FROM publications ORDER BY year DESC, id DESC').all();
  res.json(pubs);
});

app.post('/api/publications', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, authors, venue, year, pdf_url, doi_url, citation_url } = req.body;
  if (!title || !authors || !venue || !year) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO publications (title, authors, venue, year, pdf_url, doi_url, citation_url) VALUES (?, ?, ?, ?, ?, ?, ?)').run(title, authors, venue, year, pdf_url || null, doi_url || null, citation_url || null);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/publications/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, authors, venue, year, pdf_url, doi_url, citation_url } = req.body;
  db.prepare('UPDATE publications SET title=?, authors=?, venue=?, year=?, pdf_url=?, doi_url=?, citation_url=? WHERE id=?').run(title, authors, venue, year, pdf_url || null, doi_url || null, citation_url || null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/publications/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM publications WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// PEOPLE API
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

app.post('/api/people', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, role, category, bio, photo_url, email, linkedin_url, website_url, active } = req.body;
  if (!name || !role || !category) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO people (name, role, category, bio, photo_url, email, linkedin_url, website_url, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, role, category, bio || '', photo_url || '', email || '', linkedin_url || '', website_url || '', active !== false ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/people/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, role, category, bio, photo_url, email, linkedin_url, website_url, active } = req.body;
  db.prepare('UPDATE people SET name=?, role=?, category=?, bio=?, photo_url=?, email=?, linkedin_url=?, website_url=?, active=? WHERE id=?').run(name, role, category, bio || '', photo_url || '', email || '', linkedin_url || '', website_url || '', active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/people/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM people WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// RESEARCH API
app.get('/api/research', apiReadLimiter, (req, res) => {
  const areas = db.prepare('SELECT * FROM research ORDER BY sort_order, id').all();
  res.json(areas);
});

app.post('/api/research', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, description, content, image_url, links, sort_order } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO research (title, description, content, image_url, links, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(title, description, content || '', image_url || '', links || '[]', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/research/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, description, content, image_url, links, sort_order } = req.body;
  db.prepare('UPDATE research SET title=?, description=?, content=?, image_url=?, links=?, sort_order=? WHERE id=?').run(title, description, content || '', image_url || '', links || '[]', sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/research/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM research WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// SPONSORS API
app.get('/api/sponsors', apiReadLimiter, (req, res) => {
  const sponsors = db.prepare('SELECT * FROM sponsors ORDER BY sort_order, id').all();
  res.json(sponsors);
});

app.post('/api/sponsors', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, logo_url, website_url, sort_order, show_in_footer } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const result = db.prepare('INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)').run(name, logo_url || '', website_url || '', sort_order || 0, show_in_footer ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/sponsors/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, logo_url, website_url, sort_order, show_in_footer } = req.body;
  db.prepare('UPDATE sponsors SET name=?, logo_url=?, website_url=?, sort_order=?, show_in_footer=? WHERE id=?').run(name, logo_url || '', website_url || '', sort_order || 0, show_in_footer ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/sponsors/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
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

app.post('/api/facilities', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, description, content, photo_url, doc_url, doc_name, sort_order } = req.body;
  if (!name || !description) return res.status(400).json({ error: 'Missing required fields' });
  const result = db.prepare('INSERT INTO facilities (name, description, content, photo_url, doc_url, doc_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, description, content || '', photo_url || '', doc_url || '', doc_name || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/facilities/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, description, content, photo_url, doc_url, doc_name, sort_order } = req.body;
  db.prepare('UPDATE facilities SET name=?, description=?, content=?, photo_url=?, doc_url=?, doc_name=?, sort_order=? WHERE id=?').run(name, description, content || '', photo_url || '', doc_url || '', doc_name || '', sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/facilities/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
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

// EVENTS
app.get('/api/events', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM events ORDER BY day, start_hour, id').all());
});
app.post('/api/events', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { day, start_hour, duration_hours, title, room, color } = req.body;
  if (title == null || day == null || start_hour == null || duration_hours == null) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO events (day, start_hour, duration_hours, title, room, color) VALUES (?,?,?,?,?,?)')
    .run(day, start_hour, duration_hours, title, room || '', color || 'navy');
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/events/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { day, start_hour, duration_hours, title, room, color } = req.body;
  db.prepare('UPDATE events SET day=?, start_hour=?, duration_hours=?, title=?, room=?, color=? WHERE id=?')
    .run(day, start_hour, duration_hours, title, room || '', color || 'navy', req.params.id);
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
  const { title, assignee, tag, due_label, status, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Missing title' });
  const result = db.prepare('INSERT INTO tasks (title, assignee, tag, due_label, status, sort_order) VALUES (?,?,?,?,?,?)')
    .run(title, assignee || '', tag || 'lab', due_label || '', status || 'todo', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/tasks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, assignee, tag, due_label, status, sort_order } = req.body;
  db.prepare('UPDATE tasks SET title=?, assignee=?, tag=?, due_label=?, status=?, sort_order=? WHERE id=?')
    .run(title, assignee || '', tag || 'lab', due_label || '', status || 'todo', sort_order || 0, req.params.id);
  res.json({ success: true });
});
app.delete('/api/tasks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// MEETINGS
app.get('/api/meetings', apiReadLimiter, (req, res) => {
  res.json(db.prepare('SELECT * FROM meetings ORDER BY sort_order, id').all());
});
app.post('/api/meetings', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { day_label, time_label, title, room, attendees, type, sort_order } = req.body;
  if (!title || !day_label || !time_label) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO meetings (day_label, time_label, title, room, attendees, type, sort_order) VALUES (?,?,?,?,?,?,?)')
    .run(day_label, time_label, title, room || '', attendees || '', type || 'team', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});
app.put('/api/meetings/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { day_label, time_label, title, room, attendees, type, sort_order } = req.body;
  db.prepare('UPDATE meetings SET day_label=?, time_label=?, title=?, room=?, attendees=?, type=?, sort_order=? WHERE id=?')
    .run(day_label, time_label, title, room || '', attendees || '', type || 'team', sort_order || 0, req.params.id);
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

// Serve the main app for all frontend routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => {
  console.log(`LATFS Website running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Default credentials: admin / admin123`);
});
