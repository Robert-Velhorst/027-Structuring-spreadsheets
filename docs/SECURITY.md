# Security and privacy

## Scope and authorization

The manifest declares only:

- `https://www.googleapis.com/auth/spreadsheets.currentonly`
- `https://www.googleapis.com/auth/script.container.ui`

`@OnlyCurrentDoc` is present in production script files. There is no Execution API, web app, anonymous endpoint, remote fetch, Drive service, Gmail service, advanced service, or time-driven trigger. Apps Script runs as the user at the keyboard. Real authorization and account policy are enforced by Google at deployment/runtime.

## Threat model

| Threat | Control | Residual risk |
|---|---|---|
| Accidental wrong-range write | Exact sheet/A1 shown, preview counts/diffs, acknowledgement | User can intentionally approve the wrong target |
| Target changes after preview | SHA-256 digest is recomputed under document lock | Google-side concurrent changes after final check but during write are limited by the script lock, not by external editors |
| Double click/retry | Idempotency key and consumed preview token | A new intentional preview can create a new operation |
| Partial/incorrect write | Whole-sheet backup before write; readback digest after write | Apps Script quota failure can require manual recovery |
| Cross-user operation access | Temporary active user key is one-way hashed; metadata uses UserProperties; owner check on preview/restore | Hidden backup sheets are visible to spreadsheet editors if unhidden |
| Formula flattening | Formula strings are preserved and included in digests | Array/spill, pivot, filter, protection, and merge edge cases require real-host testing; merged targets are blocked |
| Expansion overwrite | Non-empty cells outside the selected target are detected before apply | Formatting-only cells outside selection may be reused because collision checks examine displayed content |
| Data exfiltration | No network/Drive/Gmail services; support bundle excludes content and names | Google processes data as part of Sheets/Apps Script itself |
| Property/log leakage | No cell values/formulas in operation records; RPC errors omit stack | `console.error` includes error code/message and is visible to project operators |
| Supply-chain compromise | Zero production/test npm dependencies; pinned GitHub Actions majors; read-only CI permissions | Node, GitHub Actions, Google, and browser runtimes remain trusted dependencies |

## Retention and deletion

- Preview metadata lives in user cache for at most 10 minutes.
- Up to 30 operation records are retained per user per spreadsheet namespace.
- At most 10 referenced hidden backup sheets are retained; older referenced backups are deleted and records note expiry.
- Presets/settings/history are user properties and contain no cell content.
- **Delete my Sheet Shaper data and backups** removes the current user's namespaced properties and referenced backup sheets.
- Spreadsheet revision history remains governed by Google and the spreadsheet owner; Sheet Shaper cannot delete it with current scopes.

## Incident response

1. Use the sidebar safety stop.
2. Do not delete or modify `_SS Backup …` sheets.
3. Export the privacy-safe support bundle.
4. Record the operation ID/status/error code and Apps Script execution ID; do not copy sensitive cell content into tickets.
5. Follow restore in `OPERATOR_RUNBOOK.md`.
6. If compromise is suspected, revoke the add-on's Google Account connection, remove the deployment, rotate owner access to the Apps Script project, and review Google Workspace audit logs.

## Privacy impact summary

Purpose: transform user-selected spreadsheet data in place. Data minimization: no external transport, no persistent cell snapshots outside the spreadsheet backup, no email identity storage, and compact user-scoped metadata. Users control preview/apply, export, pause, restore, and deletion. The main privacy risk is collaborator visibility of hidden backup sheets; the UI and docs state this explicitly.
