'use strict';

const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config');
const { applyOnce } = require('./migrations');

function seedDemoData(db, config) {
  applyOnce(db, 'demo-data-v1', () => {
    const seedAccounts = [
      {
        username: 'aortega',
        name: 'Dr. Alfonso Ortega',
        role: 'professor',
        email: 'aortega@villanova.edu',
      },
      { username: 'mreyes', name: 'M. Reyes', role: 'student', email: 'mreyes@villanova.edu' },
      { username: 'skim', name: 'S. Kim', role: 'postdoc', email: 'skim@villanova.edu' },
      {
        username: 'dhernandez',
        name: 'D. Hernandez',
        role: 'student',
        email: 'dhernandez@villanova.edu',
      },
      { username: 'apark', name: 'A. Park', role: 'student', email: 'apark@villanova.edu' },
    ];
    const seedHash = bcrypt.hashSync(config.labSeedPassword || 'latfs2024', BCRYPT_ROUNDS);
    for (const a of seedHash ? seedAccounts : []) {
      const exists = db.prepare('SELECT id FROM users WHERE username=?').get(a.username);
      if (!exists) {
        db.prepare(
          'INSERT INTO users (username, password, name, role, email, active) VALUES (?,?,?,?,?,1)',
        ).run(a.username, seedHash, a.name, a.role, a.email);
      }
    }

    // Seed equipment if empty
    const eqCount = db.prepare('SELECT COUNT(*) as cnt FROM equipment').get();
    if (eqCount.cnt === 0) {
      const eqs = [
        {
          name: 'Boiling rig · 4-point',
          sku: 'RIG-BOIL-04',
          category: 'Test rig',
          location: 'Lab A · Tolentine 344',
          status: 'available',
        },
        {
          name: 'Phantom v710 high-speed camera',
          sku: 'CAM-PHANTOM-V710',
          category: 'Imaging',
          location: 'Lab B · Tolentine 346',
          status: 'available',
        },
        {
          name: 'FLIR A655 IR camera',
          sku: 'IR-FLIR-A655',
          category: 'Imaging',
          location: 'Lab A · Tolentine 344',
          status: 'available',
        },
        {
          name: 'TSI micro-PIV system',
          sku: 'PIV-TSI-2C',
          category: 'Diagnostics',
          location: 'Lab B · Tolentine 346',
          status: 'available',
        },
        {
          name: 'Microchannel test rig',
          sku: 'RIG-MICRO-01',
          category: 'Test rig',
          location: 'Lab B · Tolentine 346',
          status: 'maintenance',
          notes: 'Awaiting new heater pad',
        },
        {
          name: 'Environmental chamber',
          sku: 'ENV-CHAMB-01',
          category: 'Conditioning',
          location: 'Lab A · Tolentine 344',
          status: 'available',
        },
        {
          name: 'Heat-flux meter (Vatell)',
          sku: 'HFM-VATELL-A',
          category: 'Sensor',
          location: 'Shared cabinet',
          status: 'available',
        },
        {
          name: 'Differential pressure transducer',
          sku: 'DP-OMEGA-01',
          category: 'Sensor',
          location: 'Shared cabinet',
          status: 'available',
        },
      ];
      const stmt = db.prepare(
        'INSERT INTO equipment (name, sku, category, location, status, notes, sort_order) VALUES (?,?,?,?,?,?,?)',
      );
      eqs.forEach((e, i) =>
        stmt.run(e.name, e.sku, e.category, e.location, e.status, e.notes || '', i),
      );
    }

    // Seed apps catalogue (HTML mini-apps embedded in the public website)
    const appsCount = db.prepare('SELECT COUNT(*) as cnt FROM apps').get();
    if (appsCount.cnt === 0) {
      const seed = [
        {
          slug: 'thermal-resistance',
          title: 'Thermal resistance calculator',
          summary: 'Plug in geometry + materials, get junction-to-ambient resistance.',
          description:
            'A simple browser-based calculator that estimates Rja for a heat-sink + spreader + interface stack. Useful for quick first-order sanity checks before running a CFD.',
          url: '',
          embed_html: '',
          sort_order: 1,
        },
        {
          slug: 'two-phase-map',
          title: 'Two-phase flow regime map',
          summary: 'Plot operating points on Mandhane / Taitel-Dukler maps.',
          description:
            'Enter mass flux, quality, and channel geometry to overlay your operating point on classic two-phase regime maps for design or teaching.',
          url: '',
          embed_html: '',
          sort_order: 2,
        },
      ];
      const ins = db.prepare(
        'INSERT INTO apps (slug, title, summary, description, url, embed_html, sort_order) VALUES (?,?,?,?,?,?,?)',
      );
      seed.forEach((a) =>
        ins.run(a.slug, a.title, a.summary, a.description, a.url, a.embed_html, a.sort_order),
      );
    }

    // Seed a couple of issues
    const issuesCount = db.prepare('SELECT COUNT(*) as cnt FROM issues').get();
    if (issuesCount.cnt === 0) {
      const aOrtegaId = db.prepare('SELECT id FROM users WHERE username=?').get('aortega')?.id || 1;
      const mReyesId = db.prepare('SELECT id FROM users WHERE username=?').get('mreyes')?.id || 1;
      db.prepare(
        'INSERT INTO issues (title, body, category, status, priority, reporter_user_id) VALUES (?,?,?,?,?,?)',
      ).run(
        'Microchannel rig heater pad failed',
        'Heater pad on the micro rig stopped responding mid-run on Friday. Powered down. Needs replacement before Tuesday.',
        'broken',
        'in_progress',
        'high',
        mReyesId,
      );
      db.prepare(
        'INSERT INTO issues (title, body, category, status, priority, reporter_user_id) VALUES (?,?,?,?,?,?)',
      ).run(
        'Order acetone (4 L)',
        'Stock cabinet only has ~500 mL left. Need a 4 L bottle for cleaning. Vendor: Sigma.',
        'supply',
        'open',
        'normal',
        aOrtegaId,
      );
      db.prepare(
        'INSERT INTO issues (title, body, category, status, priority, reporter_user_id) VALUES (?,?,?,?,?,?)',
      ).run(
        'Lab door latch sticking',
        'Tolentine 344 door latch sticks, especially in humid weather. Facilities ticket would be ideal.',
        'facility',
        'open',
        'low',
        mReyesId,
      );
    }

    // Seed news
    const newsCount = db.prepare('SELECT COUNT(*) as cnt FROM news').get();
    if (newsCount.cnt === 0) {
      db.prepare('INSERT INTO news (title, content, date) VALUES (?, ?, ?)').run(
        'LATFS Joins E3S Center',
        'LATFS is now part of the NSF Industry/University Cooperative Research Center on Energy Efficient Electronic Systems (E3S).',
        '2015-01-01',
      );
    }

    // Seed publications
    const pubCount = db.prepare('SELECT COUNT(*) as cnt FROM publications').get();
    if (pubCount.cnt === 0) {
      const pubs = [
        {
          title: 'The Energy Costs of Cooling Electronic Systems',
          authors: 'Ortega, A.',
          venue: 'Semitherm 2012 Keynote',
          year: 2012,
          pdf_url: './research/publications/Semitherm%202012.pdf',
          citation_url: './research/publications/Semitherm-2012.RIS',
        },
        {
          title:
            'Simulation of Two-Phase Flow and Heat Transfer in Mini- and Micro-Channels for Concentrating Photovoltaics Cooling',
          authors: 'Pellicone, D., Ortega, A., Del Valle, M., Schon, S.',
          venue: 'ESFuelcell 2011',
          year: 2011,
          pdf_url: './research/publications/ES2011-54206.pdf',
          citation_url: './research/publications/ES2011-54206.RIS',
        },
        {
          title:
            'Convective Heat Transfer due to an Impinging Synthetic Jet: A Numerical Investigation of a Canonical Geometry',
          authors: 'Silva, L., Ortega, A.',
          venue: 'ITherm 2010',
          year: 2010,
          pdf_url: './research/publications/silva-ITherm-2010.pdf',
          citation_url: './research/publications/silva-ITherm-2010.RIS',
        },
        {
          title:
            'Numerical Investigation of a Liquid Droplet Transported by a Gas Stream Impinging on a Heated Surface: Single-Phase Regime',
          authors: 'Diaz, A., Ortega, A.',
          venue: 'ITherm 2010',
          year: 2010,
          pdf_url: './research/publications/diaz-ITherm-2010.pdf',
          citation_url: './research/publications/diaz-ITherm-2010.RIS',
        },
      ];
      for (const p of pubs) {
        db.prepare(
          'INSERT INTO publications (title, authors, venue, year, pdf_url, citation_url) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(p.title, p.authors, p.venue, p.year, p.pdf_url, p.citation_url);
      }
    }

    // Seed people
    const peopleCount = db.prepare('SELECT COUNT(*) as cnt FROM people').get();
    if (peopleCount.cnt === 0) {
      const people = [
        {
          name: 'Dr. Alfonso Ortega',
          role: 'Director & Professor',
          category: 'director',
          bio: 'Dr. Ortega is a Professor of Mechanical Engineering at Villanova University and directs the Laboratory for Advanced Thermal and Fluid Systems (LATFS). His research focuses on thermal management of electronic systems, convective heat transfer, and energy technology.',
          photo_url: '',
          email: 'aortega@villanova.edu',
          active: 1,
        },
      ];
      for (const p of people) {
        db.prepare(
          'INSERT INTO people (name, role, category, bio, photo_url, email, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(p.name, p.role, p.category, p.bio, p.photo_url, p.email, p.active);
      }
    }

    // Seed research
    const researchCount = db.prepare('SELECT COUNT(*) as cnt FROM research').get();
    if (researchCount.cnt === 0) {
      const areas = [
        {
          title: 'NSF E3S Center - Energy Efficient Electronic Systems',
          description:
            'LATFS is part of the NSF Industry/University Cooperative Research Center on Energy Efficient Electronic Systems (E3S), conducting research on exergy-based approaches for data center design and waste energy recovery.',
          image_url: '/assets/research-droplet.png',
          sort_order: 1,
        },
        {
          title: 'Droplet Impingement and Spray Cooling',
          description:
            'Research into heat transfer and fluid dynamics in liquid droplet impingement on surfaces, including spray cooling applications and enhancement techniques using surfactants.',
          image_url: '/assets/research-droplet.png',
          sort_order: 2,
        },
        {
          title: 'Mini and Microchannel Heat Exchangers',
          description:
            'Experimental and computational characterization of water-cooled multi-layer mini-channel heat sinks in single and two-phase flow, including biologically inspired designs using constructal scaling principles.',
          image_url: '/assets/research-minichannel.png',
          sort_order: 3,
        },
        {
          title: 'Flow and Convective Heat Transfer in Jets',
          description:
            'Investigation of heat transfer and fluid dynamics in synthetic impinging jets over heated surfaces, including complex flow regimes and transitional flows.',
          image_url: '/assets/hero-3.png',
          sort_order: 4,
        },
        {
          title: 'Energy Technology',
          description:
            'Research in ground source heat pump systems, geothermal well modeling, and advanced cooling for concentrated photovoltaics.',
          image_url: '/assets/research-geothermal.png',
          sort_order: 5,
        },
        {
          title: 'Experimental Techniques',
          description:
            'Development of advanced experimental techniques including liquid crystal transient thermal imaging and high speed video imaging for thermal and fluid measurements.',
          image_url: '/assets/facility-3.png',
          sort_order: 6,
        },
      ];
      for (const r of areas) {
        db.prepare(
          'INSERT INTO research (title, description, image_url, sort_order) VALUES (?, ?, ?, ?)',
        ).run(r.title, r.description, r.image_url, r.sort_order);
      }
    }

    // Seed sponsors
    const sponsorCount = db.prepare('SELECT COUNT(*) as cnt FROM sponsors').get();
    if (sponsorCount.cnt === 0) {
      const sponsors = [
        {
          name: 'National Science Foundation',
          logo_url: '/assets/sponsors/nsf.svg',
          website_url: 'https://www.nsf.gov',
          sort_order: 1,
          show_in_footer: 1,
        },
        {
          name: 'Intel Corporation',
          logo_url: '/assets/sponsors/intel.svg',
          website_url: 'https://www.intel.com',
          sort_order: 2,
          show_in_footer: 0,
        },
        {
          name: 'AMD',
          logo_url: '/assets/sponsors/amd.svg',
          website_url: 'https://www.amd.com',
          sort_order: 3,
          show_in_footer: 0,
        },
        {
          name: 'Cisco Systems',
          logo_url: '',
          website_url: 'https://www.cisco.com',
          sort_order: 4,
          show_in_footer: 0,
        },
        {
          name: 'Honeywell',
          logo_url: '/assets/sponsors/honeywell.svg',
          website_url: 'https://www.honeywell.com',
          sort_order: 5,
          show_in_footer: 0,
        },
        {
          name: 'Raytheon',
          logo_url: '/assets/sponsors/rtx.svg',
          website_url: 'https://www.rtx.com',
          sort_order: 6,
          show_in_footer: 0,
        },
        {
          name: 'Texas Instruments',
          logo_url: '/assets/sponsors/ti.svg',
          website_url: 'https://www.ti.com',
          sort_order: 7,
          show_in_footer: 0,
        },
        {
          name: 'SRC',
          logo_url: '/assets/sponsors/src.svg',
          website_url: 'https://www.src.org',
          sort_order: 8,
          show_in_footer: 0,
        },
        {
          name: 'Delphi Technologies',
          logo_url: '',
          website_url: 'https://www.delphi.com',
          sort_order: 9,
          show_in_footer: 0,
        },
        {
          name: 'Villanova University',
          logo_url: '/assets/sponsors/villanova.svg',
          website_url: 'https://www.villanova.edu',
          sort_order: 10,
          show_in_footer: 1,
        },
        {
          name: 'ES2 - Energy Efficient Electronic Systems',
          logo_url: '/assets/sponsors/e3s.svg',
          website_url: 'https://www.e3s-center.org',
          sort_order: 11,
          show_in_footer: 1,
        },
      ];
      for (const s of sponsors) {
        db.prepare(
          'INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)',
        ).run(s.name, s.logo_url, s.website_url, s.sort_order, s.show_in_footer);
      }
    }

    // Seed gallery
    const galleryCount = db.prepare('SELECT COUNT(*) as cnt FROM gallery').get();
    if (galleryCount.cnt === 0) {
      const galleryPhotos = [
        { image_url: '/assets/hero-1.png', caption: 'Lab Overview', sort_order: 1 },
        { image_url: '/assets/hero-2.png', caption: 'Research Equipment', sort_order: 2 },
        { image_url: '/assets/hero-3.png', caption: 'Experiments', sort_order: 3 },
        { image_url: '/assets/facility-1.png', caption: 'Lab Members', sort_order: 4 },
        { image_url: '/assets/facility-2.png', caption: 'Thermal Systems', sort_order: 5 },
      ];
      for (const g of galleryPhotos) {
        db.prepare('INSERT INTO gallery (image_url, caption, sort_order) VALUES (?, ?, ?)').run(
          g.image_url,
          g.caption,
          g.sort_order,
        );
      }
    }

    // Seed hero slides (separate from photo gallery)
    const heroSlideCount = db.prepare('SELECT COUNT(*) as cnt FROM hero_slides').get();
    if (heroSlideCount.cnt === 0) {
      const heroSlides = [
        {
          image_url: '/assets/hero-1.png',
          title: 'Lab Overview',
          caption:
            'State-of-the-art facilities for thermal and fluid research at Villanova University.',
          sort_order: 1,
        },
        {
          image_url: '/assets/hero-2.png',
          title: 'Research Equipment',
          caption:
            'High-speed imaging, precision flow meters, and custom test sections for boiling experiments.',
          sort_order: 2,
        },
        {
          image_url: '/assets/hero-3.png',
          title: 'Active Experiments',
          caption:
            'Ongoing research into two-phase flow, spray cooling, and thermal energy storage.',
          sort_order: 3,
        },
        {
          image_url: '/assets/facility-1.png',
          title: 'Our Team',
          caption:
            'Graduate students, postdocs, and faculty collaborating on cutting-edge engineering challenges.',
          sort_order: 4,
        },
        {
          image_url: '/assets/facility-2.png',
          title: 'Thermal Systems',
          caption:
            'Advanced thermal management solutions for electronics, energy, and industrial applications.',
          sort_order: 5,
        },
      ];
      for (const s of heroSlides) {
        db.prepare(
          'INSERT INTO hero_slides (image_url, title, caption, sort_order) VALUES (?, ?, ?, ?)',
        ).run(s.image_url, s.title, s.caption, s.sort_order);
      }
    }

    // Seed facilities
    const facilityCount = db.prepare('SELECT COUNT(*) as cnt FROM facilities').get();
    if (facilityCount.cnt === 0) {
      const facilities = [
        {
          name: 'Two-Phase Flow & Boiling Lab',
          description:
            'High-speed imaging systems, precision flow meters, and custom test sections for boiling and two-phase flow experiments.',
          content:
            'The Two-Phase Flow & Boiling Lab is equipped with state-of-the-art instrumentation for studying boiling heat transfer and two-phase flow phenomena. Key capabilities include high-speed visualization, precision calorimetry, and custom-fabricated test sections that allow researchers to study nucleate boiling, flow boiling in microchannels, and spray cooling under controlled conditions.',
          photo_url: '/assets/facility-1.png',
          doc_url: '',
          doc_name: '',
          sort_order: 1,
        },
        {
          name: 'Thermal Characterization Suite',
          description:
            'Advanced tools for measuring thermal resistance, conductivity, and transient thermal response of materials and systems.',
          content:
            'Our Thermal Characterization Suite provides comprehensive capabilities for thermal property measurement and system-level thermal performance evaluation. The suite includes IR thermography for non-contact full-field temperature measurement, laser flash diffusivity for precise thermal conductivity determination, and precision calorimetry for heat capacity measurements across a wide temperature range.',
          photo_url: '/assets/facility-2.png',
          doc_url: '',
          doc_name: '',
          sort_order: 2,
        },
        {
          name: 'Computational Resources',
          description:
            'High-performance computing cluster and licensed CFD software for large-scale simulations.',
          content:
            'LATFS maintains a dedicated high-performance computing cluster for numerical simulation of thermal and fluid systems. The cluster supports parallel CFD computations using ANSYS Fluent, ANSYS CFX, and OpenFOAM. Researchers have access to MATLAB, Python (with NumPy/SciPy), and in-house codes for data analysis and reduced-order modeling.',
          photo_url: '/assets/facility-3.png',
          doc_url: '',
          doc_name: '',
          sort_order: 3,
        },
        {
          name: 'Microfluidics Lab',
          description:
            'Cleanroom-class fabrication and testing of microchannels and heat spreaders for electronics cooling.',
          content:
            'The Microfluidics Lab supports design, fabrication, and testing of microfluidic systems for thermal management. Facilities include soft lithography tools for PDMS device fabrication, an inverted optical microscope with μPIV capability for flow visualization, and a precision pressure and flow measurement system for microchannel characterization.',
          photo_url: '/assets/facility-4.png',
          doc_url: '',
          doc_name: '',
          sort_order: 4,
        },
        {
          name: 'Electronics Cooling Testbed',
          description:
            'Dedicated infrastructure for testing advanced cooling solutions for high-power electronics.',
          content:
            'The Electronics Cooling Testbed provides a realistic environment for evaluating thermal management solutions for high-power electronic assemblies. The facility includes programmable DC power supplies, precision junction temperature measurement instrumentation, custom cold plates and heat sink test fixtures, and data acquisition systems capable of high-speed multi-channel temperature logging.',
          photo_url: '/assets/research-minichannel.png',
          doc_url: '',
          doc_name: '',
          sort_order: 5,
        },
        {
          name: 'Energy Systems Lab',
          description:
            'Research into sustainable energy conversion, heat exchangers, and thermal energy storage systems.',
          content:
            'The Energy Systems Lab supports research in ground-source heat pump modeling, concentrated photovoltaic cooling, and thermal energy storage. Facilities include heat exchanger test rigs for single and two-phase flow, phase-change material (PCM) storage modules, flat-plate and evacuated-tube solar thermal collectors, and a data-logging infrastructure for long-term experimental campaigns.',
          photo_url: '/assets/research-geothermal.png',
          doc_url: '',
          doc_name: '',
          sort_order: 6,
        },
      ];
      for (const f of facilities) {
        db.prepare(
          'INSERT INTO facilities (name, description, content, photo_url, doc_url, doc_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(f.name, f.description, f.content, f.photo_url, f.doc_url, f.doc_name, f.sort_order);
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
      const stmt = db.prepare(
        'INSERT INTO events (day, start_hour, duration_hours, title, room, color) VALUES (?,?,?,?,?,?)',
      );
      for (const e of events) stmt.run(...e);
    }

    if (db.prepare('SELECT COUNT(*) as cnt FROM tasks').get().cnt === 0) {
      const tasks = [
        ['Order K-type thermocouples', 'M. Reyes', 'inventory', 'Fri', 'todo', 1],
        ['Calibrate PIV camera (Lab B)', 'A. Park', 'experiment', 'Wed', 'todo', 2],
        ['Book high-speed camera next week', 'S. Kim', 'lab', 'Mon', 'todo', 3],
        ['Draft E3S quarterly report outline', 'Dr. Ortega', 'paper', 'Apr 5', 'todo', 4],
        ['Replace O-rings on droplet rig', 'D. Hernandez', 'maintenance', '\u2014', 'todo', 5],
        ['Draft ITherm 2024 abstract', 'M. Reyes', 'paper', 'today', 'in_progress', 1],
        ["Process last week's IR data", 'S. Kim', 'data', 'Wed', 'in_progress', 2],
        [
          'Run boiling experiment \u00b7 4-point',
          'M. Reyes',
          'experiment',
          'today',
          'in_progress',
          3,
        ],
        ['Data review \u00b7 synthetic jet', 'M. Reyes', 'data', '\u2014', 'blocked', 1],
        ['Reviewing: Silva et al. draft', 'Dr. Ortega', 'paper', 'Thu', 'blocked', 2],
        ['Weekly group meeting agenda', 'Dr. Ortega', 'team', 'Mon', 'done', 1],
        ['Fix leak in coolant loop', 'D. Hernandez', 'maintenance', '\u2014', 'done', 2],
      ];
      const stmt = db.prepare(
        'INSERT INTO tasks (title, assignee, tag, due_label, status, sort_order) VALUES (?,?,?,?,?,?)',
      );
      for (const t of tasks) stmt.run(...t);
    }

    if (db.prepare('SELECT COUNT(*) as cnt FROM meetings').get().cnt === 0) {
      const meetings = [
        [
          'TODAY',
          '09:30 \u2013 10:30',
          'Weekly group meeting',
          'Tolentine 344',
          'AO,SK,MR,AP,DH,VH,+9',
          'team',
          1,
        ],
        [
          'TODAY',
          '14:00 \u2013 14:30',
          '1:1 \u00b7 Ortega \u2194 Reyes',
          'Office 218',
          'AO,MR',
          '1:1',
          2,
        ],
        [
          'TUE',
          '11:00 \u2013 12:00',
          'E3S quarterly sync',
          'Remote \u00b7 Zoom',
          'AO,SK,+4',
          'external',
          3,
        ],
        [
          'WED',
          '15:00 \u2013 16:00',
          'Paper review \u00b7 Silva et al.',
          'Tolentine 344',
          'AO,SK,MR,AP',
          'review',
          4,
        ],
        [
          'FRI',
          '10:00 \u2013 11:30',
          'New student onboarding',
          'Mendel 270',
          'SK,+2',
          'onboarding',
          5,
        ],
      ];
      const stmt = db.prepare(
        'INSERT INTO meetings (day_label, time_label, title, room, attendees, type, sort_order) VALUES (?,?,?,?,?,?,?)',
      );
      for (const m of meetings) stmt.run(...m);
    }

    if (db.prepare('SELECT COUNT(*) as cnt FROM inventory').get().cnt === 0) {
      const inv = [
        ['A', 'SN-LAT-00472', 'K-type thermocouples (0.010")', 'Sensors', 3, 20, 1],
        ['A', 'SN-LAT-00488', 'Silicon-carbide cold plates', 'Hardware', 12, 4, 2],
        ['A', 'SN-LAT-00501', 'Viton O-rings \u00b7 size 012', 'Consumables', 0, 50, 3],
        ['A', 'SN-LAT-00512', 'Deionized water (4L)', 'Fluids', 6, 3, 4],
        ['A', 'SN-LAT-00530', 'Pressure transducers \u00b7 Omega', 'Sensors', 2, 2, 5],
        ['A', 'SN-LAT-00544', 'PTFE tubing (1/4")', 'Consumables', 18, 25, 6],
        ['A', 'SN-LAT-00562', 'Glycol-water mixture 50/50', 'Fluids', 4, 2, 7],
        ['B', 'SN-LAT-01004', 'Nikon high-speed camera lens', 'Optics', 1, 1, 1],
        ['B', 'SN-LAT-01012', 'PIV seeding particles (10 \u00b5m)', 'Consumables', 0, 2, 2],
        ['B', 'SN-LAT-01020', 'Laser safety goggles', 'PPE', 8, 6, 3],
        ['B', 'SN-LAT-01035', 'Nitrogen cylinder \u00b7 compressed', 'Fluids', 2, 1, 4],
        ['B', 'SN-LAT-01044', 'IR transparent windows \u00b7 ZnSe', 'Optics', 5, 3, 5],
      ];
      const stmt = db.prepare(
        'INSERT INTO inventory (lab, sku, name, category, qty, min_qty, sort_order) VALUES (?,?,?,?,?,?,?)',
      );
      for (const i of inv) stmt.run(...i);
    }

    if (db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt === 0) {
      const projs = [
        [
          'NSF E3S \u2014 Phase III',
          'Dr. A. Ortega',
          'active',
          'Energy-efficient electronic systems \u00b7 Villanova node.',
          1,
        ],
        [
          'Microchannel cold plates',
          'L. Kim',
          'active',
          'Industry partnership \u00b7 cooling for high-flux electronics.',
          2,
        ],
        [
          'Droplet impingement rig',
          'M. Reyes',
          'active',
          'Spray cooling experiments + numerical model validation.',
          3,
        ],
        [
          'Synthetic jet program',
          'A. Park',
          'paused',
          'Convective enhancement using synthetic impinging jets.',
          4,
        ],
        [
          'Geothermal storage',
          'D. Hernandez',
          'active',
          'DOE-funded underground storage characterization.',
          5,
        ],
      ];
      const stmt = db.prepare(
        'INSERT INTO projects (title, lead, status, description, sort_order) VALUES (?,?,?,?,?)',
      );
      for (const p of projs) stmt.run(...p);
    }

    // Post-seed data migration: add ES2 sponsor if it doesn't exist in an existing DB
    try {
      const es2Exists = db
        .prepare(
          "SELECT id, show_in_footer FROM sponsors WHERE name LIKE '%ES2%' OR name LIKE '%E3S%' OR name LIKE '%Energy Efficient Electronic%'",
        )
        .get();
      if (!es2Exists) {
        db.prepare(
          'INSERT INTO sponsors (name, logo_url, website_url, sort_order, show_in_footer) VALUES (?, ?, ?, ?, ?)',
        ).run(
          'ES2 - Energy Efficient Electronic Systems',
          '/assets/sponsors/e3s.svg',
          'https://www.e3s-center.org',
          11,
          1,
        );
      } else if (!es2Exists.show_in_footer) {
        db.prepare('UPDATE sponsors SET show_in_footer=1 WHERE id=?').run(es2Exists.id);
      }
    } catch (e) {
      console.error('ES2 migration error:', e.message);
    }
  });
}

module.exports = { seedDemoData };
