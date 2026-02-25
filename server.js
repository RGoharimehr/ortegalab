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
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
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
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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
    { name: 'National Science Foundation', logo_url: 'images/sponnsf.gif', website_url: 'https://www.nsf.gov', sort_order: 1 },
    { name: 'Intel Corporation', logo_url: 'images/sponintel.gif', website_url: 'https://www.intel.com', sort_order: 2 },
    { name: 'AMD', logo_url: 'images/sponamd.gif', website_url: 'https://www.amd.com', sort_order: 3 },
    { name: 'Cisco Systems', logo_url: 'images/sponcis.gif', website_url: 'https://www.cisco.com', sort_order: 4 },
    { name: 'Honeywell', logo_url: 'images/sponhon.gif', website_url: 'https://www.honeywell.com', sort_order: 5 },
    { name: 'Raytheon', logo_url: 'images/sponray.gif', website_url: 'https://www.rtx.com', sort_order: 6 },
    { name: 'Texas Instruments', logo_url: 'images/sponti.gif', website_url: 'https://www.ti.com', sort_order: 7 },
    { name: 'SRC', logo_url: 'images/sponsrc.gif', website_url: 'https://www.src.org', sort_order: 8 },
    { name: 'Delphi Technologies', logo_url: 'images/sponde.gif', website_url: 'https://www.delphi.com', sort_order: 9 },
    { name: 'Villanova University', logo_url: 'images/templatemo_logo_villanova.png', website_url: 'https://www.villanova.edu', sort_order: 10 },
  ];
  for (const s of sponsors) {
    db.prepare('INSERT INTO sponsors (name, logo_url, website_url, sort_order) VALUES (?, ?, ?, ?)').run(s.name, s.logo_url, s.website_url, s.sort_order);
  }
}

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
  const { title, authors, venue, year, pdf_url, citation_url } = req.body;
  if (!title || !authors || !venue || !year) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO publications (title, authors, venue, year, pdf_url, citation_url) VALUES (?, ?, ?, ?, ?, ?)').run(title, authors, venue, year, pdf_url || null, citation_url || null);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/publications/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, authors, venue, year, pdf_url, citation_url } = req.body;
  db.prepare('UPDATE publications SET title=?, authors=?, venue=?, year=?, pdf_url=?, citation_url=? WHERE id=?').run(title, authors, venue, year, pdf_url || null, citation_url || null, req.params.id);
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
  const { name, role, category, bio, photo_url, email, active } = req.body;
  if (!name || !role || !category) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO people (name, role, category, bio, photo_url, email, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, role, category, bio || '', photo_url || '', email || '', active !== false ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/people/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, role, category, bio, photo_url, email, active } = req.body;
  db.prepare('UPDATE people SET name=?, role=?, category=?, bio=?, photo_url=?, email=?, active=? WHERE id=?').run(name, role, category, bio || '', photo_url || '', email || '', active ? 1 : 0, req.params.id);
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
  const { title, description, image_url, sort_order } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO research (title, description, image_url, sort_order) VALUES (?, ?, ?, ?)').run(title, description, image_url || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/research/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { title, description, image_url, sort_order } = req.body;
  db.prepare('UPDATE research SET title=?, description=?, image_url=?, sort_order=? WHERE id=?').run(title, description, image_url || '', sort_order || 0, req.params.id);
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
  const { name, logo_url, website_url, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const result = db.prepare('INSERT INTO sponsors (name, logo_url, website_url, sort_order) VALUES (?, ?, ?, ?)').run(name, logo_url || '', website_url || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/sponsors/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
  const { name, logo_url, website_url, sort_order } = req.body;
  db.prepare('UPDATE sponsors SET name=?, logo_url=?, website_url=?, sort_order=? WHERE id=?').run(name, logo_url || '', website_url || '', sort_order || 0, req.params.id);
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
app.post('/api/upload/photo', uploadRateLimiter, requireAuth, requireCsrf, photoUpload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Serve the main app for all frontend routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => {
  console.log(`LATFS Website running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Default credentials: admin / admin123`);
});
