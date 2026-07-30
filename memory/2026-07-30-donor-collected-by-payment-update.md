# Donor "Collected By" payment update

## Debug report

- **Symptom:** Mangalya collection drilldown showed `Not entered` for Bank Transfer and Cheque payments even after those donations were marked received.
- **Root cause:** The live `Sponsorship 2026` rows had blank `Collected By` cells. The quick `Mark Payment Received` action wrote the received status, amount, and quantity but did not supply a collector, and the backend accepted the incomplete monetary payment update.
- **Fix:** Monetary payment-related donor updates now backfill a missing `Collected By` value with the authenticated PST member who records the update. Existing collector values are preserved. Direct material sponsorships and unrelated donor updates are not changed.
- **Evidence:** The targeted collector tests, complete `npm test` suite, production `npm run build`, and `git diff --check` pass.
- **Regression test:** `scripts/verify-event-invitation.mjs` covers Bank Transfer, Cheque, existing collectors, material sponsorships, and non-payment updates. `scripts/verify-event-mapping.mjs` checks the backend integration.
- **Related:** The dashboard was rendering the Sheet correctly; this was an incomplete write-path problem rather than a display or cache problem.
- **Status:** DONE
