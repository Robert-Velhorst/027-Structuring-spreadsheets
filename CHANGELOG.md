# Changelog

## 3.0.0 - 2026-08-09

### Added

- Windows 11 standalone React/FastAPI/SQLite workspace for CSV and XLSX.
- Production import, preview, quality, apply, history, download, restore, and deletion flows.
- Loopback launcher, fail-closed authenticated ngrok launcher, verified stop ledger, and one-folder executable build.
- Read-and-preview-default HAI connector with separately gated apply and restore.
- Private Sites delivery surface for the same frontend.
- XLSX formula-preservation, malformed-workbook, public-auth, HAI, deletion, React, and packaged-runtime tests.
- Preview-safe Apps Script CSV import, English/Dutch language support, feature flags, and expanded history/restore integration tests.

### Changed

- Blocking workbook work runs outside the FastAPI request loop and the runtime enforces a single process for lock safety.
- Public mode now states that traffic leaves the device through ngrok; local mode retains the no-external-transfer claim.
- CI now verifies the add-on and Windows build independently with supported Node and Python releases.

### Known limitations

- Live ngrok acceptance is blocked while the account's assigned endpoint is already online elsewhere (`ERR_NGROK_334`).
- In-app Browser and Computer screenshot helpers failed before page control; automated UI behavior passes, but rendered interaction evidence is not claimed.
- Real Apps Script deployment, multi-user tests, and Marketplace review remain owner-controlled Google actions.

## 2.0.0 - 2026-08-08

### Added

- Preview-token, backup-first, locked, idempotent, validated mutation workflow.
- Deterministic batch transformations and quality scoring.
- User-scoped presets, history, safety stop, support export, and deletion.
- Hidden same-spreadsheet backups with validated affected-range restore.
- Accessible single-sidebar UX, local CSV export, zero-dependency tests/build/doctor, and CI.

### Removed

- Disconnected chart, pivot, formula, sharing, remote-fetch, notification, and fake XLSX/PDF export surfaces.
- Public Execution API exposure and unrelated provider calls.
- Direct mutations that bypassed preview, backup, authorization, and validation.

### Known limitations

- Google deployment and Marketplace review remain external owner actions.
- Dutch UI localization and production CSV import are partial.
