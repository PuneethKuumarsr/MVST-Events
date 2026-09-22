# Gruha Seva booking coordination

## Implemented

- Private MongoDB singleton `seva_coordination_settings` / `gruha-seva`.
- Temple contacts, ordered drivers, Pooja & Bhajan heads, Office bearers and payment verifier.
- Driver reply window configured to 60 minutes.
- PST Admin-only `GET /api/seva/coordination`, with private/no-store caching.
- Office → Seva Bookings → Booking notifications & team contacts.
- User-supplied phone numbers are stored outside Git and the public bundle. Listing a contact does not create a user or grant a role.
- A provisioning script validates the private JSON and verifies the saved record. It is idempotent for identical input, but refuses to overwrite different existing settings.

## Not active

There is **no WhatsApp/SMS provider integration, message sending, reply webhook or escalation timer** in this change. The API and UI explicitly report setup required. Existing booking approval and financial records are unchanged. Do not interpret saved contacts as confirmed recipient consent, payment verification or active automation.

## Intended workflow

1. Save a new request as Pending Approval. Notify only the configured Office bearers (currently two contacts).
2. Route payment verification to the configured verifier; do not infer payment receipt from a notification.
3. Following Office approval, request availability from the first driver. Advance on decline or after 60 minutes without reply, then repeat for the second and third drivers.
4. If no driver accepts, alert the Office for manual arrangement. Never silently confirm transport.
5. Once booking and transport are finally confirmed, notify both temple contacts, the assigned driver and all Pooja & Bhajan heads.

## Activation prerequisites

- An approved official WhatsApp business sender/provider account and approved templates; confirm pricing and recipient consent before activation.
- Credentials stored as server secrets, not in chat, Git or the browser.
- Durable notification outbox with deduplication per booking/event/recipient, retryable failures, delivery receipts and signed provider callbacks.
- A durable scheduler independent of the browser and sleeping Render instance. Store each offer deadline in the database; do not rely on in-process timers.
- Explicit transport state separate from Office approval. Atomically assign at most one driver for the relevant booking version; reject expired/late replies and duplicate callbacks.
- Do not start the response window for a failed send. Failed delivery should retry or alert the Office, not count as a driver's non-response.
- Cancel obsolete offers on booking cancellation, date/slot changes or reassignment. Keep an audit history.
- Test with authorised test contacts before enabling live dispatch. No historical booking should be broadcast automatically on activation.

Booking dates use Asia/Kolkata and the existing 09:00–14:00 / 17:00–21:00 slots.
