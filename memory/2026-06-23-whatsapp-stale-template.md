# WhatsApp Stale Template Bug - 2026-06-23

## Symptom
WhatsApp URL still contained old welcome text: "Thank you for registering ... by Mane Manege Vasavi Seva Trust...".

## Root cause
Current source no longer contained the old welcome text, but WhatsApp URL generation still had multiple weak points: KIT remained inline outside the template module, URL encoding was not expressed in the requested explicit `message -> encodedText -> url` path, and there was no debug log before opening to prove which decoded message was being used. Earlier PowerShell writes had also left encoding artifacts in the template/test files.

## Fix
Rebuilt `src/whatsappMessages.js` as the single source for all WhatsApp message kinds, including KIT, using multiline `lines.join('\n')` templates. Updated `src/main.jsx` so all buttons and bulk queue opens use `buildWhatsAppMessage`, normalize the message, call `encodeURIComponent(message)`, build `https://wa.me/91${mobile}?text=${encodedText}`, and log the decoded message before opening.

## Evidence
Searched app source and rebuilt dist for the stale phrases; no matches found. Direct URL sample contains `%0A`, does not contain old text, and decodes to: `🙏 *Namaskara HusbandName & WifeName*` followed by a blank line and the new Shashtipoorthi welcome line.

## Checks
- `npm test` passed.
- `npm run build` passed.

## Status
DONE
