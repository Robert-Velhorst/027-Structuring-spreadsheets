# Sheet Shaper

Sheet Shaper is a safety-first Google Sheets Editor add-on for cleaning and structuring a selected range. It provides smart trim, case conversion, duplicate removal, empty-row/column compaction, text splitting, row sorting, operation batches, quality scoring, presets, local CSV export, history, and validated restore.

The supported mutation path is deliberately strict:

`select target → preview → acknowledge → hidden backup → locked write → digest validation → restore if needed`

No cell content is transmitted outside Google Sheets and Apps Script. The production code does not use `UrlFetchApp`, Drive, Gmail, external APIs, a database, or scheduled triggers.

## Safety properties

- Every write requires a fresh, user-owned preview token that expires after 10 minutes.
- Apply fails closed if the spreadsheet, sheet, range, or input digest changed after preview.
- A document lock prevents concurrent Sheet Shaper writes.
- An idempotency key prevents duplicate submission from repeating a completed write.
- A hidden copy of the whole source sheet is created before the target changes.
- The written range is read back and compared to the preview digest.
- Restore is limited to the user-owned operation record and is itself validated.
- User history, presets, and settings use `UserProperties`; they are not shared with collaborators.
- Only the current-spreadsheet and container-UI OAuth scopes are declared.
- Merged cells, read-only ranges, oversized targets, stale previews, and expansion collisions are rejected before a write.

## Local verification

Requirements: Node.js 20 or newer. There are no third-party runtime or test dependencies.

```powershell
npm ci
npm run verify
```

If `npm` is unavailable but Node is installed:

```powershell
node scripts/lint.mjs
node --test --test-reporter=spec
node scripts/build.mjs
node scripts/doctor.mjs
```

The build creates `dist/` with `Core.gs`, `Server.gs`, `Sidebar.html`, and `appsscript.json`.

## Install in Apps Script

1. Run `npm run verify`.
2. Create an Apps Script project intended for a Google Sheets Editor add-on.
3. Copy `.clasp.example.json` to `.clasp.json` and replace the example project ID. `.clasp.json` is ignored because it is environment-specific.
4. Install Google `clasp` using your organization-approved method, sign in to the intended Google account, then run `clasp push` from the repository root after confirming `rootDir` is `dist`.
5. In Apps Script, create a test deployment and install it for a dedicated test spreadsheet.
6. Complete the critical-path test in [docs/CRITICAL_PATH.md](docs/CRITICAL_PATH.md).
7. Do not publish to the Marketplace until OAuth consent, privacy/support URLs, branding, administrator policy, and Google review are complete.

The repository cannot create or approve the Google project, consent screen, test deployment, or Marketplace listing. Those are real owner/account actions and are reported as external blockers, not simulated.

## User workflow

1. Open a spreadsheet and choose **Extensions → Sheet Shaper → Open Sheet Shaper**.
2. Review the target shown in the sidebar.
3. Choose the selection or sheet data region, one or more operations, and options.
4. Run quality analysis if helpful, then create a preview.
5. Review counts, risk, score change, warnings, and sample differences.
6. Acknowledge and apply once. The result card names the hidden backup and validation status.
7. Use **Restore from backup** if the result is not wanted.
8. Use presets for repeated batches and history/support export for troubleshooting.

## Architecture

- `src/Core.gs`: deterministic, testable matrix transformations and quality analysis.
- `src/Server.gs`: Apps Script UI/RPC, authorization boundary, preview cache, backups, locks, idempotency, audit records, retention, and restore.
- `src/Sidebar.html`: accessible single-sidebar workflow with no external assets.
- `test/`: deterministic, adversarial, contract, scope, and critical-path tests.
- `scripts/`: zero-dependency lint, build, and doctor checks.
- `docs/`: audit, security, acceptance, operations, traceability, and final verification evidence.

## Honest limitations

- Google-hosted execution and Marketplace deployment require a real Apps Script project and owner approval; they cannot be verified locally.
- Apps Script quotas vary by account and can interrupt very large work. Sheet Shaper caps a run at 250,000 cells and advises smaller ranges above 100,000 cells.
- Operations compact the target range's values rather than deleting physical spreadsheet rows or columns. This avoids silently changing unrelated layout, filters, charts, or references.
- The automatic restore returns affected cells/formulas/formats from the hidden backup. If Google rejects the copy or the backup was manually deleted, the operator must unhide the backup and restore manually.
- Spreadsheet collaborators can unhide or delete hidden backup sheets. Operation metadata is user-scoped, but a hidden sheet is not a security boundary.
- The UI is English in this release; Dutch localization is tracked as partial rather than claimed complete.
- CSV export is supported as a local browser download. CSV import parsing is tested in the deterministic engine but is not exposed in production until a preview-safe import UX is completed.

See [docs/FINAL_VERIFICATION_REPORT.md](docs/FINAL_VERIFICATION_REPORT.md) and [docs/GOAL_COMPLETION_MATRIX.md](docs/GOAL_COMPLETION_MATRIX.md) for the evidence-backed status.
