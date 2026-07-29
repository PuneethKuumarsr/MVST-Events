# Mobile WhatsApp Blank Tab Bug - 2026-07-29

## Symptom
After an invitation recipient opened in WhatsApp on iPhone, Safari left an empty browser page behind. This happened after each recipient in the invitation bulk queues.

## Root cause
The donor invitation flows synchronously opened an empty `_blank` window before asynchronous QR generation to avoid desktop popup blocking. They redirected that reserved window to the recipient-specific `wa.me` URL after the files were ready. On iOS, the WhatsApp app handoff occurred, but Safari retained the reserved tab. The Trustee flow also always opened WhatsApp in a new tab.

## Fix
Added a shared mobile-aware WhatsApp handoff. iPhone, iPad, iPadOS, and Android now open the recipient-specific WhatsApp URL in the current tab. Desktop continues to reserve and reuse a separate tab for the asynchronous donor package workflow. Donor Prepared status and queue progress are saved before the mobile handoff.

## Regression coverage
The invitation queue checks now require the same-tab mobile handoff in Trustees, General Donors, and Mangalya Donors, including iPadOS detection. They also reject the previous direct blank-window redirect pattern in both donor queues.

## Checks
- `npm test` passed.
- `npm run build` passed.
- The production build bundle contains the new no-blank-page mobile guidance.

## Status
DONE
