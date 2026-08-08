# Operator runbook

## Local gates

```powershell
npm ci
npm run verify
git status --short
git diff --check
```

Expected: lint, tests, build, and doctor pass; `dist/` is generated but ignored; no secrets or `.clasp.json` are tracked.

## Test deployment

1. Create or select an owner-controlled Apps Script project.
2. Copy `.clasp.example.json` to `.clasp.json`; insert the project ID. Never commit this file.
3. Authenticate `clasp` as the intended project owner using the organization's approved installation.
4. Run `npm run verify` and inspect `dist/appsscript.json` scopes.
5. Run `clasp push` only after confirming the target project ID/account.
6. Create a version and Editor add-on test deployment in Apps Script.
7. Install only in a dedicated synthetic-data spreadsheet first.
8. Run every step in `CRITICAL_PATH.md` and record expected/actual results in `FINAL_VERIFICATION_REPORT.md`.

## Canary and release

Canary: project owner plus one trusted editor, synthetic data, at least one low-risk and one shape-changing operation, stale-preview test, collision test, restore test, and support-export inspection. Expand only after zero unexplained failures. Rollback by redeploying the previous Apps Script version; existing backups remain in spreadsheets until their owners delete them.

Marketplace publication additionally requires owner-approved branding, support/privacy URLs, OAuth consent and verification as applicable, license decision, Workspace administrator compatibility testing, and Google review. Do not imply publication until the listing is actually accepted and installable.

## Emergency stop

User level: press **Pause changes**.
Project level: disable or remove the test/production deployment in Apps Script.
Account level: revoke the add-on connection in Google Account security settings.
Domain level: a Workspace administrator can restrict or block the app.

## Restore

Preferred: sidebar **Restore from backup** on the operation's result card. It clears the operation's maximum before/after rectangle, copies the original affected range from the hidden backup with formulas/formats, and validates the original digest.

Manual fallback:

1. Stop further edits and preserve the named `_SS Backup …` sheet.
2. Unhide it in Google Sheets.
3. Compare the operation's sheet/range in the support bundle/history.
4. Copy only that original range from backup to the corresponding source range using normal paste.
5. Re-run quality analysis and compare expected values/formulas manually.
6. Keep the backup until the operator and data owner approve deletion.

## Quota or timeout

The run limit is 250,000 cells. If Apps Script times out or reports quota pressure, do not retry blindly. Inspect the operation status and backup first. Restore if needed, then split the job into smaller ranges. Sheet Shaper intentionally has no background job or hidden retry loop.

## Support bundle

The sidebar export includes version, timestamp, hashed spreadsheet ID, sheet numeric ID, locale/timezone, pause status, and compact operation records. It excludes cell values, formulas, spreadsheet/sheet names from the top-level environment, emails, credentials, and stack traces. Review before sharing anyway.
