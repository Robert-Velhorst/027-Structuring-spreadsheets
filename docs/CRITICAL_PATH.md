# Critical path

## Contract

`User opens sheet → add-on menu/sidebar → operation preview → backup/dry-run → transformation → validation report → undo/restore → batch workflow → help/docs`

## Automated evidence

`npm test` verifies transformation correctness, formula preservation, batch ordering, shape changes, CSV escaping/parsing, adversarial input, size limits, scope restrictions, UI-to-server connectivity, backup-before-write ordering, document locking, stale-preview rejection, idempotency presence, output validation, owner-scoped restore, and restore digest validation.

## Manual Google-hosted smoke test

Prerequisites: owner-approved Apps Script test deployment, one test spreadsheet, an editor account, and optionally a second collaborator account. Use synthetic data only.

1. Open the test spreadsheet. Expected: **Extensions → Sheet Shaper** contains **Open Sheet Shaper**, **Run safety check**, and **Help and privacy**.
2. Open the sidebar. Expected: first-run safety explanation, current spreadsheet/sheet/A1 target, READY badge, and no mutation.
3. Add this range at `A1:C5`:

   | Name | Team | Score |
   |---|---|---:|
   | `  ADA  ` | A | 10 |
   | `  ADA  ` | A | 10 |
   | Grace | B | 20 |
   |  |  |  |

4. Select `A1:C5`; choose Smart trim, Title case, Remove duplicate rows, and Compact empty rows. Expected preview: target `A1:C5`, before/after counts, nonzero changed cells, quality score improvement, backup warning, and sample differences. Sheet data remains unchanged.
5. Edit one target cell after preview, then press Apply. Expected: `STALE_PREVIEW`; no backup/write occurs. Revert the test edit.
6. Preview again, acknowledge, and press Apply once. Expected: one hidden `_SS Backup …` sheet, transformed compacted data, status APPLIED, validation passed, and history item. Pressing Apply again does not repeat the write.
7. Press Restore. Expected: original `A1:C5` content/formulas/formats return, state becomes UNDONE, and restore validation passes.
8. Select a one-column target with `Ada,Lovelace`; preview Split text into occupied adjacent cells. Expected: `EXPANSION_COLLISION` and no write. Clear safe space, preview again, then apply and validate.
9. Save the batch as a preset, reload it, and verify a fresh preview is still required.
10. Download CSV. Expected: browser download; no Drive file and no external request.
11. Download support bundle. Expected: version, hashed spreadsheet ID, configuration, and operation metadata; no spreadsheet name, cell value, formula, email, token, or stack.
12. Pause mutations. Expected: preview/apply/restore are disabled or fail with `SAFETY_STOP`; analysis/export remain available. Resume.
13. With the second collaborator, verify that their history/presets do not show the first user's records. Expected: user isolation. Note: the collaborator can still see/unhide backup sheets because Sheets visibility is not a security boundary.
14. Delete **my Sheet Shaper data and backups**. Expected: user-owned history/settings/presets and referenced backups are removed; unrelated sheets and collaborator properties are not touched.
15. Open the README, Help/privacy section, troubleshooting, and operator runbook. Expected: recovery and external deployment limits match actual behavior.

## Current execution status

Automated critical-path contract: Passed locally.
Google-hosted smoke test: Blocked pending real Apps Script project, deployment, authorization, and test spreadsheet.
Marketplace/administrator test: Blocked pending owner and Google Workspace actions.
