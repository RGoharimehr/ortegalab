# LATFS Website v2.0

**Laboratory for Advanced Thermal and Fluid Systems**  
Villanova University · College of Engineering

## Overview

Modern Node.js/Express web application for the LATFS research lab. Features a dynamic SPA frontend, SQLite database, REST API, and an admin panel for content management.

## Requirements

- Node.js 16+
- npm

## Setup & Running

```bash
# Install dependencies
npm install

# Build the CSS (required before starting)
npm run build:css

# Start the server
npm start
```

The site will be available at **http://localhost:3000**

## Default Admin Credentials

- **URL:** http://localhost:3000/admin
- **Username:** `admin`
- **Password:** `admin123`

> Change the admin password after first login via the database or by extending the admin panel.

## Project Structure

```
├── server.js          # Express server + REST API + SQLite setup
├── package.json
├── tailwind.config.js # Tailwind CSS configuration
├── src/
│   └── input.css      # Tailwind CSS source
├── public/
│   ├── index.html     # Main SPA (responsive)
│   ├── admin.html     # Admin dashboard
│   └── tailwind.css   # Compiled Tailwind CSS (built via npm run build:css)
├── uploads/           # File uploads (auto-created)
├── latfs.db           # SQLite database (auto-created, gitignored)
└── .gitignore
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm run build:css` | Compile Tailwind CSS (run after HTML changes) |
| `npm run watch:css` | Watch and recompile CSS on HTML changes |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/news | No | List news items |
| POST | /api/news | Yes | Create news item |
| PUT | /api/news/:id | Yes | Update news item |
| DELETE | /api/news/:id | Yes | Delete news item |
| GET | /api/publications | No | List publications |
| POST | /api/publications | Yes | Create publication |
| PUT | /api/publications/:id | Yes | Update publication |
| DELETE | /api/publications/:id | Yes | Delete publication |
| GET | /api/people | No | List people |
| POST | /api/people | Yes | Create person |
| PUT | /api/people/:id | Yes | Update person |
| DELETE | /api/people/:id | Yes | Delete person |
| GET | /api/research | No | List research areas |
| POST | /api/research | Yes | Create research area |
| PUT | /api/research/:id | Yes | Update research area |
| DELETE | /api/research/:id | Yes | Delete research area |
| POST | /admin/login | No | Login |
| POST | /admin/logout | Yes | Logout |
| GET | /admin/check | No | Check auth status |

## Features

- **Single Page Application** with sections: Home, People, Research, Publications, Students, Facilities, Contact
- **Responsive design** using Tailwind CSS (mobile-first)
- **Sticky navigation** with dropdown menus
- **Admin panel** with CRUD for all content types
- **SQLite database** with seed data from original site
- **Session-based authentication**
- **Legacy URL support** – old static files still served

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
