# Troubleshooting and error catalog

| Code | Meaning | Safe next action |
|---|---|---|
| `PREVIEW_REQUIRED` / `PREVIEW_EXPIRED` | Missing, consumed, or older than 10 minutes | Refresh and create a new preview |
| `STALE_PREVIEW` | Target values/formulas changed after preview | Review latest data and preview again; no write occurred |
| `ACKNOWLEDGEMENT_REQUIRED` | Apply was called without explicit confirmation | Review preview and check acknowledgement |
| `READ_ONLY` | Google says target cannot be edited by current user | Obtain edit access or select editable cells |
| `MERGED_CELLS` | Target intersects a merge | Unmerge or choose a different target |
| `FORMULA_SHAPE_CHANGE` | Sort/split/compact/deduplicate target contains formulas | Select constant-value data or use trim/case operations |
| `RANGE_TOO_LARGE` | More than 250,000 cells | Split into smaller ranges |
| `EXPANSION_COLLISION` | Split result would overwrite adjacent content | Clear safe space or select a wider target |
| `BUSY` | Document lock held by another Sheet Shaper write | Wait briefly; inspect sheet/history before one retry |
| `RATE_LIMITED` | Mutations submitted too quickly | Wait briefly; do not automate retries |
| `SAFETY_STOP` | User paused changes | Resume only after confirming target and incident state |
| `VALIDATION_FAILED` | Readback differs from preview | Do not continue; use Restore and preserve backup |
| `BACKUP_MISSING` | Referenced backup or source sheet was removed | Stop; inspect revision history and operator runbook |
| `RESTORE_VALIDATION_FAILED` | Automatic recovery did not match input digest | Preserve/unhide backup and restore manually |
| `NOT_AUTHORIZED` / `WRONG_SPREADSHEET` | Preview/operation context does not belong to user/document | Return to original document and create your own preview |
| `IDENTITY_UNAVAILABLE` | Google did not provide temporary user boundary | Reauthorize/reopen; operator checks deployment/auth |

Errors never mean an external action “probably happened”: Sheet Shaper has no external provider. For ambiguous Apps Script termination, inspect the visible sheet, operation history, and named backup before any retry.
