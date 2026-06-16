# Changelog

## Maintenance — 2026-06-15

- Repository hygiene: commit history consolidated to a single author and authored via a GitHub noreply address. No functional changes to the taxonomy or dashboard.

## v0.2.0 — 2026-06-15

- **Interactive ops routing queue.** Click a team tile to filter the worklist to that team's transactions (terminal items included, which the default actionable view hides). Click a retryability chip (retryable / after fix / terminal) to narrow further. Selected tile and chip are highlighted; a Clear button resets; toggling steps the filter back out. Keyboard accessible.

## v0.1.0 — 2026-06-11

- Initial release.
- Unified taxonomy of 166 payment decline codes across 6 rails (ISO 20022, NACHA ACH, NPCI UPI, ISO 8583 cards, UK FPS, SG FAST), each mapped to leg, root category, retryability, ops owner, customer message, and ISO 20022 equivalent.
- `data/taxonomy.json` + `taxonomy.csv` + `sources.md` + `docs/schema.md`.
- Decline Intelligence dashboard demo (corridor health, failure drill-down, ops routing queue) running on the taxonomy with simulated transactions.
