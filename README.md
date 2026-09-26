# LATFS website and lab platform

The public research website, content management interface, and internal lab platform for the Laboratory for Advanced Thermal and Fluid Systems at Villanova University.

The application uses Express, SQLite, and browser JavaScript. It runs as one Node.js service with durable database and upload storage. Existing API URLs, hash links, database tables, and lab workflows are retained by this refactor.

## Local development

Requirements: Node.js 22.13+ on the 22 LTS line, or Node.js 24+. The CI matrix checks Node 22 and 24. Use the committed npm lockfile.

```sh
npm ci
cp .env.example .env
# Set ADMIN_SEED_PASSWORD in .env to create your initial admin account.
npm run build
npm run dev
```

Open `http://localhost:3000` for the website, `/platform` for the lab workspace, and `/admin` for website administration. The initial administrator username is `admin`. There are no default accounts or sample lab records unless local demo mode is explicitly enabled.

`npm start` and `npm run dev` load `.env` using Node's built-in environment-file support. Existing process environment variables take precedence. Never commit `.env`.

For a disposable local demo, set `SEED_DEMO_DATA=true` before starting with a separate database. This enables sample content and the documented demo accounts in `src/server/db/seed-demo.js`; production rejects demo mode. Changing seed settings does not change existing passwords or remove existing records. Reuse your real database path when upgrading.

## Commands

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm start`            | Run the application                                        |
| `npm run dev`          | Restart automatically on server changes                    |
| `npm run build`        | Compile Tailwind CSS and copy the locked local icon bundle |
| `npm run watch:css`    | Rebuild Tailwind styles while editing                      |
| `npm test`             | Run HTTP integration, frontend DOM, and service tests      |
| `npm run lint`         | Check JavaScript with ESLint                               |
| `npm run check:syntax` | Parse JavaScript files and remaining inline app scripts    |
| `npm run format`       | Apply the repository's formatting rules                    |
| `npm run check`        | Build, syntax check, lint, format check, and tests         |

The build creates `public/vendor/` from the version of Lucide recorded in the lockfile. This directory is generated and ignored by Git. Build before running or deploying; there is no executable icon dependency on an unversioned CDN.

## Code organization

```text
server.js                     Process startup and graceful shutdown
src/server/
  app.js                      Application factory and dependency wiring
  config.js                   Validated runtime configuration
  db/                         Schema, additive migrations, seeds, connection lifecycle
  middleware/                 HTTP security, sessions, authentication, rate limits
  routes/                     Feature routers, preserving existing API paths
  services/                   Shared business rules, validation, email, uploads
  session-store.js             Persistent SQLite-backed session storage
public/
  index.html                  Public website shell
  platform.html               Lab platform shell
  admin.html                  CMS shell
  reset-password.html         Password-reset form
  js/site/                    Native ES modules for public pages, data, and routing
  js/platform/                Lab feature scripts
  js/admin/                   Content-management feature scripts
  js/shared/                  Same-origin HTTP/CSRF client and dialog helpers
  js/reset-password/          Password-reset controller
  css/                        Styles separated by application surface
  assets/                     Existing lab images and brand assets
  apps/                       Standalone research calculator
scripts/                      Reproducible asset build and syntax validation
test/                         Automated regression checks
```

See [architecture and maintenance](docs/architecture.md) for the module contracts and upgrade details.

## Configuration

| Variable                                                        | Purpose                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NODE_ENV`                                                      | Set to `production` on the server to require a session secret and secure cookies |
| `PORT`                                                          | Listening port; defaults to `3000`                                               |
| `BASE_URL`                                                      | Trusted public origin for generated links and sitemap                            |
| `SESSION_SECRET`                                                | Stable random secret; required in production                                     |
| `ADMIN_SEED_PASSWORD`                                           | Initial admin password; at least 12 characters in production                     |
| `SEED_DEMO_DATA`                                                | Explicit local-only demo mode; defaults to disabled                              |
| `LAB_SEED_PASSWORD`                                             | Optional password override for local demo lab accounts                           |
| `DATABASE_PATH`                                                 | SQLite file path; defaults to `latfs.db` in the project                          |
| `UPLOADS_PATH`                                                  | Upload directory; defaults to `uploads/` in the project                          |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional SMTP notifications; no emails are sent without `SMTP_HOST`              |

Generate a session secret using `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. Keep it stable across deploys so signed session cookies remain valid. SQLite stores sessions beside the application data, with expiration and cleanup.

## Production deployment

Build with `npm ci && npm run build`, start with `npm start`, and use `/healthz` for health checks. Set `NODE_ENV=production`, `SESSION_SECRET`, and the actual `BASE_URL`. Set `ADMIN_SEED_PASSWORD` for the first administrator only. Deploy behind HTTPS; production trusts one reverse proxy, matching the documented Render setup. Adapt that setting before using a different proxy topology.

Both SQLite and uploads require durable storage. The design supports a single application instance; do not point independent replicas at separate SQLite files and expect shared state.

### Docker Compose

```sh
# Set production SESSION_SECRET and ADMIN_SEED_PASSWORD in .env or the environment.
docker compose up --build -d
```

The image builds its assets in a separate stage, contains only production dependencies at runtime, and runs as a non-root user. Compose retains the existing `latfs_db` and `latfs_uploads` volume names. Back up the database and uploads before changing any volume mounts or paths.

### Render

Use a web service, not a static-site service. Set the build command to `npm ci && npm run build`, start command to `npm start`, and health check to `/healthz`.

For native Node, mount a disk at `/opt/render/project/src/data`, set `DATABASE_PATH=/opt/render/project/src/data/latfs.db`, and `UPLOADS_PATH=/opt/render/project/src/data/uploads`. For Docker, mount at `/app/data` and use corresponding paths under that directory. Move existing data before changing paths; otherwise the application will open a new database.

## Access and privacy

Public content APIs serve the research website. Lab records require an authenticated session. Content and lab mutations retain their role checks and require the `X-CSRF-Token` returned by login or session-check endpoints. The application refreshes account status and role from the database on requests, so disabled accounts and role changes take effect for existing sessions.

The public calendar feed includes only events explicitly marked `public`. Direct upload URLs require authentication unless the file is referenced by published public content. Unpublishing a download removes anonymous access to the underlying file, unless another public record also references it.

Public pages distinguish loading, empty, and error states and never substitute sample people, papers, or news for missing live data. Browser Back and Forward work with the existing hash links. The public site remains a client-rendered application; server-rendered, individually indexable pages would be a separate architectural change.
