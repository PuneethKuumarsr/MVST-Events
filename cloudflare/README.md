# MVST Cloudflare Pages

Production project: `mvst-seva`

Public address: https://mvst-seva.pages.dev

The page and its assets are served from Cloudflare Pages. Requests under `/api/`
are forwarded to the existing MVST service at `https://mvst-events.onrender.com`.
Authentication, permissions, Google Sheets access and existing database records
remain in that service. No service-account credentials are deployed to Pages.

This deployment removes the Render startup wait when a new visitor opens the
login page. Signing in or loading records can still wait for the Render service
to start. It is not a complete backend migration.

## Build and deploy

Run from the MVST-Events repository:

```powershell
npm run test:cloudflare
npm test
npm run build:cloudflare
npx wrangler pages deploy dist-cloudflare --project-name mvst-seva --branch main
```

The Cloudflare build uses `https://mvst-seva.pages.dev` as the public portal
origin. It writes to `dist-cloudflare`, leaving the regular Render build in
`dist`. The root `wrangler.jsonc` configures the Pages project.

Deploy only `dist-cloudflare`. Do not upload the repository root, `.env`, server
private data, output reports or Google service-account files.

## Verification

- `/` and `/qr/receipt` load the application through Pages' SPA routing.
- `/api/portal-health` identifies the Cloudflare project without contacting Render.
- `/api/health` checks the existing records service through the API connection.
- `/api/auth/me` returns 401 immediately for a visitor without a session cookie.
- Existing session cookies are always verified by the original service.
- API responses are not cached. Session cookies stay HttpOnly and host-only.
- Cross-origin writes are rejected by the Pages connection.

The production address above is the address to share. Cloudflare also creates
deployment-specific preview addresses; these are not the public portal address.

## Published 16 September 2026

Production deployment: `a49c05c3-d144-4e62-b863-7f8af4062753`.

Verified on the clean production address:

- Home page: HTTP 200 and the MVST login form rendered in the browser.
- QR receipt route: HTTP 200 and the same protected app shell.
- Cloudflare health: HTTP 200.
- Render health through the connection: HTTP 200.
- Unauthenticated session and registrations requests: HTTP 401.
- Eight Cloudflare connection tests and the existing event regression checks passed.

The first Render health request took about 34 seconds to wake the service;
the home page response took about 0.4 seconds in the same verification session.
An authenticated user workflow was not exercised because login credentials were
not available to the deployment check.
