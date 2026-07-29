# Safari Restored Stale MVST Page - 2026-07-29

## Symptom
After the Trustee progress recovery was deployed, iPhone still showed the old `Trustee WhatsApp queue ready` message, `0 Sent`, and AMARNATH CA.

## Root cause
Production was already serving the current bundle with `Cache-Control: no-store`. The screenshot therefore came from Safari restoring a frozen in-memory page snapshot rather than requesting the current app shell. A restored old JavaScript runtime cannot execute recovery logic added in a newer deployment.

## Fix
Added a frontend freshness check that compares the currently loaded hashed JavaScript bundle with the no-store app shell. It runs on initial load, `pageshow`, and when the page becomes visible after returning from WhatsApp. If the bundle changed, the app replaces the current URL with a cache-busting refresh.

The Trustees screen now also displays a permanent recovery notice stating that recipients 1–23 are Sent through Jayalakshmi K S and the queue continues with Kala Pradeep.

## Regression coverage
- Hashed bundle paths are extracted from both the live document scripts and fresh app-shell HTML.
- Different bundle hashes trigger an update; identical hashes do not.
- Static checks require page-restore and visibility-return listeners plus the recovery notice.

## Checks
- `npm test` passed.
- `npm run build` passed.

## Status
DONE
