# Technical audit

Date: 2026-08-08
Repository: `Noodzakelijk-Online/027-Structuring-spreadsheets`
Starting branch/commit: `main` / `d2a041a6a671cfcbc2bac06ea3e0c227fe490ccd`
Working branch: `codex/production-hardening-027`
Expected default branch: `main` (confirmed from remote `HEAD`)

## Starting state

The repository contained one archive-import commit after its README. It had 17 Apps Script `.gs` files, five HTML interfaces, one manifest, and seven overlapping long-form Markdown files. It had no package manifest, lockfile, automated tests, CI, reproducible build, release process, `.gitignore`, or `clasp` deployment boundary.

Useful code existed for matrix transformations, quality counts, menu/sidebar patterns, and Google Sheets range operations. The production boundary was not safe:

- Core menu actions mutated the active sheet immediately without a preview or mandatory backup.
- Batch operations called mutating functions independently, so one batch could create partial success with no atomic audit record.
- Whole-range `setValues` paths could replace formulas with calculated values.
- Placeholder chart export, comment, notification, XLSX, and PDF features were present in code or visible UI.
- Remote URL fetch, Drive import/export, spreadsheet sharing/protection, and scheduled sync code existed without matching scopes, policy controls, or a truthful production setup.
- The manifest exposed an Execution API to `ANYONE` despite there being no authenticated API contract.
- Error logging could write user context and stack traces into a visible sheet.
- Backup was optional and restore did not form a validated critical path.
- The comprehensive dashboard exposed actions that were not all connected to server functions.
- Documentation claimed broad production capabilities that were not verified.

## Decision

Preserve the product purpose and deterministic transformation behavior, but replace the runtime surface with a smaller supported architecture. Git history retains the archive code; the deployable build contains only the audited path.

The resulting Editor add-on uses the official Apps Script/Sheets model: custom menu and HTML sidebar, `@OnlyCurrentDoc`, explicit current-document/UI scopes, Apps Script user properties, user cache, document lock, and in-spreadsheet hidden sheet copies. No external service is used. Official references:

- https://developers.google.com/apps-script/guides/sheets
- https://developers.google.com/apps-script/guides/services/authorization
- https://developers.google.com/apps-script/guides/properties
- https://developers.google.com/apps-script/guides/services/quotas

## Current architecture

| Layer | Responsibility | Trust boundary |
|---|---|---|
| `Sidebar.html` | User target/options, preview review, explicit acknowledgement, result/recovery, presets/history/privacy | Treat all client input as untrusted |
| `Server.gs` | Active document authorization, validation, cache, lock, backup, write, readback validation, owner-scoped history/restore | Only server code may call Google services |
| `Core.gs` | Pure matrix operations, formulas-as-formulas, quality score, preview diffs, CSV parser/export | No network or Google service calls |
| `UserProperties` | Per-user settings, presets, compact operation records | Scoped to current Apps Script user |
| `UserCache` | Ten-minute preview record and current-input digest | Ephemeral; preview cannot be shared across users |
| Hidden backup sheet | Full pre-change copy | Recovery aid, not a confidentiality boundary |

## Data model

Operation record fields: operation UUID, one-way owner key, spreadsheet ID, sheet ID/name, A1 target, before/after dimensions, input/expected/actual digests, backup sheet ID/name, normalized operation list, counts/risk summary, validation result, status, and timestamps. Cell values and formulas are not stored in properties or logs.

States: `APPLYING → APPLIED → UNDONE`; write failures become `FAILED` and retain the backup. Only `APPLIED` or `FAILED` may be restored. Preview is an ephemeral pre-state, not a persisted operation.

## Invariants

1. No mutation without a non-expired user-owned preview and explicit acknowledgement.
2. No mutation if the current target digest differs from preview.
3. Backup is created before `clearContent` or `setValues`.
4. At most one document mutation is active under the document lock.
5. Expansion never overwrites non-empty cells outside the previewed selection.
6. Formula cells are carried as formula strings, not flattened values.
7. Apply is complete only after output digest validation.
8. Restore is complete only after input digest validation.
9. Public RPC results never expose owner keys or digests.
10. No cell content leaves the active spreadsheet/Apps Script boundary.

## Applicable and non-applicable infrastructure

There is no backend server, HTTP API, database, upload store, worker, scheduler, billing provider, or AI provider. Adding these only to satisfy generic phases would expand permissions and risk without advancing the product. Docker, database migrations, health endpoints, indexing, background jobs, provider credential rotation, and SaaS billing are therefore marked Not applicable. Local doctor/build/tests and Google deployment procedures cover the operational needs of this serverless add-on.

## Remaining external gates

- Create/select the owner-controlled Apps Script and Google Cloud projects.
- Configure `.clasp.json` locally and authenticate the intended Google account.
- Push `dist/`, create an Editor add-on test deployment, and install it in a dedicated test spreadsheet.
- Perform the manual critical-path test under a real editor account and a second collaborator account.
- Complete consent-screen, privacy/support URL, branding, Workspace administrator, license, and Marketplace review decisions.

No local code can truthfully mark these complete.
