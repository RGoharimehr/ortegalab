# Architecture and maintenance

## Server lifecycle

`require('./src/server/app').createApp(options)` constructs an application without binding a port. It returns `{ app, db, config, sessionStore, close }`. Tests use isolated temporary databases and uploads; the CLI entrypoint owns the HTTP listener and signal handling.

Supported options are `env`, `databasePath`, `uploadsPath`, `sessionSecret`, `seedDemo`, `logger`, `db`, and `sessionStore`. Passing a database or session store transfers lifecycle ownership to the caller. Call `close()` after the HTTP server drains; it stops internal resources and closes only the database/store owned by the application.

Each route module exports a factory with explicit dependencies and owns one feature area. `routes/index.js` registers them. Shared validation, role rules, query construction, and equipment/task rules live in services. Add endpoints to the appropriate feature router and add HTTP regression tests for authorization and observable behavior.

## Database compatibility

The existing database schema and record IDs remain intact. Startup creates missing tables and applies additive column migrations in a transaction. SQLite uses WAL mode and a busy timeout. Backups must include a consistent SQLite snapshot and uploaded files; copying a live WAL database file by itself is not a reliable backup procedure.

Demo content is now opt-in and prohibited in production. Existing databases are not scrubbed: review any sample content that was seeded by previous versions in the normal administration interface. Public frontend fallback data has been removed.

The `sessions` table is new. Existing in-memory sessions from the old process cannot migrate; users sign in once after upgrading. Subsequent restarts preserve sessions when the database and session secret are retained. Expired records are cleaned up automatically. A future multi-instance deployment would need a shared database/storage/session architecture.

## Frontend boundaries

The public website uses native ES modules. Its data module owns API loading, the router preserves legacy hash URLs, and page/components modules render DOM. Empty and failed API responses are explicit states, and page navigation updates the document title and focus.

The platform and CMS retain ordered classic scripts to preserve existing HTML event handlers and cross-feature bindings during the refactor. Each HTML shell declares the dependency order: shared helpers, core state, feature modules, navigation/authentication, then bootstrap as applicable. Keep bootstrapping last and cover changes with the DOM regression tests. A future conversion to fully scoped modules can remove this compatibility layer incrementally.

`LabHttp.createClient({ getCsrfToken })` attaches the current token to mutating same-origin requests and reports structured `HttpError` failures. It preserves multipart bodies for uploads. `LabUI` provides escaping and keyboard dialog handling. These interfaces are shared; application-specific UI remains in feature files.

Frontend styles live under `public/css`; the standalone calculator is retained under `public/apps`. Google Fonts are explicitly allowed by the content security policy. Lucide is built locally from a locked package. Inline handlers remain in the legacy platform/CMS, so the script policy still permits inline scripts; removing that allowance requires migrating those handlers and embedded apps.

## Validation and dependency updates

`npm run check` is the local and CI gate. Tests exercise real HTTP endpoints, session persistence, access controls, calendar/upload privacy, and frontend behavior in jsdom. DOM tests are not a pixel-level visual audit or a real-browser accessibility certification.

ESLint applies recommended rules to server code and public ES modules. The platform/CMS classic scripts intentionally share globals, so cross-file undefined/unused-variable checks are not applied to those files; syntax and executable DOM tests protect their load order. New independent browser code should prefer scoped modules.

The `qs` override selects the patched query parser while Express 4 pins an older version. Revisit it when upgrading Express. The mailer dependency was updated to address published advisories; test SMTP in the target environment before enabling production notifications. The refactor does not send test messages to real recipients.

CI builds and tests on Node 22 and 24. Keep `package.json`, the lockfile, Docker runtime, and this documentation aligned when changing Node support or runtime dependencies.
