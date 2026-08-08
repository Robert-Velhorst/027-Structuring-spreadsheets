# Technical debt and roadmap

## P1 before public production

- Complete real Apps Script critical-path and two-user isolation tests.
- Add production CSV import only with the same preview/collision/backup/validation contract; the parser alone is not a user feature.
- Verify formula behavior for array formulas, protected ranges, filters, pivot sources, charts, and named ranges in Google-hosted execution.
- Record performance at 10k, 50k, 100k, and 250k cells across relevant Workspace editions; lower caps if evidence requires it.
- Make and document the repository license decision before public distribution.

## P2 usability

- Dutch localization with user-selectable language and translated error catalog.
- History page controls beyond first-page search.
- Dedicated exception panel for FAILED operations and expiring backups.
- Hosted accessibility test with keyboard, zoom, and a screen reader; multi-browser sidebar pass.

## P3 optional, only with user evidence

- Safe schema mapping/import templates.
- Additional deterministic transforms requested by users.
- Domain-admin deployment guidance.

Do not add external AI, email, analytics, remote APIs, billing, uploads, or background triggers without a separate necessity, privacy, scope, quota, failure, and approval review.
