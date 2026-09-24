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

## Development credentials

- **URL:** http://localhost:3000/admin
- **Username:** `admin`
- **Password:** `admin123`

These credentials are for local development only. On a fresh production database, set a unique `ADMIN_SEED_PASSWORD`; startup fails without it. Demo lab accounts are created in production only when `LAB_SEED_PASSWORD` is explicitly set. Set `SESSION_SECRET` to a long random value. Existing accounts keep their passwords when these environment variables change.

The Docker Compose setup stores SQLite at `/app/data/latfs.db` on a persistent directory volume. Back up the database and uploads before changing volumes on an existing deployment.

This app requires a persistent Node process, native SQLite, sessions, and writable uploads. A static site host cannot run the admin and lab platform directly.

### Render web service

Use a **web service**, with build command `npm ci && npm run build:css`, start command `npm start`, and health check path `/healthz`. Set `NODE_ENV=production`, `SESSION_SECRET` (a long random secret), `ADMIN_SEED_PASSWORD` (a unique password for a fresh database), and `BASE_URL` (the public URL). Do not commit those values.

For native Node, attach one persistent disk at `/opt/render/project/src/data` and set `DATABASE_PATH=/opt/render/project/src/data/latfs.db` and `UPLOADS_PATH=/opt/render/project/src/data/uploads`. For the Docker runtime, use `/app/data` for the disk mount and corresponding `/app/data/latfs.db` and `/app/data/uploads` paths. Only files under the mount survive a redeploy. If a database or uploads already exist at another path, migrate them before changing these values; otherwise the app will appear to start with fresh content. The SQLite design expects a single running instance.

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
