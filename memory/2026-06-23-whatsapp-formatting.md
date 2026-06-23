# WhatsApp Formatting Bug - 2026-06-23

## Symptom
WhatsApp messages opened as one long paragraph instead of preserving template line breaks, blank lines, bullets, emojis, and WhatsApp bold formatting.

## Root cause
The templates themselves were multiline and encoded line breaks with `encodeURIComponent`, but newline-safe WhatsApp URL encoding was embedded directly in `makeWhatsAppUrl` without normalization or regression coverage. This left the formatting path fragile and untested for all six event-specific templates.

## Fix
Added `normalizeWhatsAppMessage` and `encodeWhatsAppMessage` in `src/whatsappMessages.js`, normalizing CRLF/CR to `\n` before URL encoding. Updated `src/main.jsx` to use the centralized encoder for WhatsApp URLs.

## Evidence
Verified all six message types contain raw `\n` and blank lines, encode to `%0A` and `%0A%0A`, and decode back to the exact multiline template.

## Checks
- `npm test` passed.
- `npm run build` passed.

## Status
DONE
