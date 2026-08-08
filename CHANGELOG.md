# Changelog

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
