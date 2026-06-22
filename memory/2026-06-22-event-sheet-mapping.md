# Debug Report - 2026-06-22 - Event Sheet Mapping

Symptom: Shashtipoorthi tab displayed Bhimaratha participants, and Bhimaratha tab displayed Shashtipoorthi participants.

Root cause: The Google Sheet source IDs were reversed in SHEETS. The first provided sheet is the Bhimaratha source, but it was assigned to shashtipoorthi. The second provided sheet is the Shashtipoorthi source, but it was assigned to bhimaratha. Row event type also depended on fallback/inference instead of treating the source sheet as authoritative.

Fix: Swapped SHEETS ids/source labels, made normalizeRow assign eventType directly from source.id, added participant source badge, and added scripts/verify-event-mapping.mjs regression checks.

Evidence: npm test passed with "Event mapping regression checks passed." npm run build passed.

Status: DONE
