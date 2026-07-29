# Trustee Queue Progress Reset - 2026-07-29

## Symptom
After sending Trustee invitations through Jayalakshmi K S on iPhone, returning to MVST Events showed `0 Prepared`, `0 Sent`, and restarted the 109-recipient queue at AMARNATH CA.

## Root cause
WhatsApp queue progress was stored only in `sessionStorage`, which is scoped to one browser tab. The mobile WhatsApp handoff returned through a fresh MVST Safari tab, so the app could not see the earlier tab's progress.

## Fix
Queue progress now uses durable `localStorage`, with migration from legacy `sessionStorage`. Direct retry operations also use the shared durable writer.

The operator-confirmed Trustee recovery boundary is Jayalakshmi K S, recipient 23 in the 2026 Trustees source. When the Trustee campaign is generated, recipients 1 through 23 are enforced as Sent and the queue resumes at recipient 24, Kala Pradeep.

## Regression coverage
- Queue recovery matches recipient names despite repeated spaces in the CSV.
- Only recipients through Jayalakshmi K S are marked Sent.
- Kala Pradeep remains pending and becomes the next queue recipient.
- Frontend storage checks allow `localStorage` only inside the non-sensitive queue-progress helpers; authentication remains cookie/session based.

## Checks
- `npm test` passed.
- `npm run build` passed.

## Status
DONE
