# API and provider usage audit

Sheet Shaper has no HTTP backend or external provider API. “API” here means Apps Script RPC functions invoked through `google.script.run` and built-in Google services.

## RPC contract

Every RPC returns `{ ok: true, data }` or `{ ok: false, error: { code, message, retrySafe, nextAction } }`. Raw stacks, owner keys, input/output digests, tokens, and cell data are not included in public operation results.

Read-only: `getBootstrap`, `previewOperation`, `analyzeCurrentTarget`, `getOperationHistory`, `exportCurrentRangeCsv`, `listPresets`, `exportSupportBundle`.
Metadata writes: `acknowledgeOnboarding`, `savePreset`, `deletePreset`, `setMutationPause`.
Spreadsheet writes: `applyOperation`, `undoOperation`, `deleteMySheetShaperData` (referenced backups only).

## Google service inventory

| Service | Use | Scope/data boundary |
|---|---|---|
| `SpreadsheetApp` | Active spreadsheet/range, backup sheet copy, write/readback, sidebar/toast | Current spreadsheet only |
| `HtmlService` | Local sidebar HTML | Container UI |
| `PropertiesService.getUserProperties` | Per-user settings/presets/history/idempotency | Current script + user |
| `CacheService.getUserCache` | Expiring preview record | Current script + user |
| `LockService.getDocumentLock` | Serialize Sheet Shaper mutations | Current document |
| `Session.getTemporaryActiveUserKey` | Pseudonymous owner boundary | Hashed immediately; no email stored |
| `Utilities` | UUID, UTC backup timestamp, SHA-256, base64 | No transport |

Not used: `UrlFetchApp`, `DriveApp`, Gmail/Mail, Calendar, advanced Sheets API, Script triggers, external databases, analytics SDKs, AI APIs, upload/file services, web apps, or Execution API.

## Quotas and failure behavior

The add-on caps a run at 250,000 cells, batches at eight operations, mutation frequency at one per 1.5 seconds per user/spreadsheet namespace, preview age at 10 minutes, operation history at 30, and backup retention at 10. It does not hide failures behind retries. Busy/rate/stale errors say whether retry is safe and require a fresh preview where input could have changed.
