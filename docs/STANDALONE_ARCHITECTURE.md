# Standalone architecture

## Runtime shape

Sheet Shaper keeps the verified Google Sheets add-on and adds a standalone product with one local origin:

- `apps/web`: React and TypeScript workspace. React owns application state, controls, routing, tables, and accessibility summaries.
- `apps/api`: FastAPI service. It owns authentication, request limits, workbook parsing, transformations, previews, backups, validation, audit records, and the HAI boundary.
- SQLite: structured document/version/preview/operation/audit state in WAL mode with foreign keys and bounded indexes.
- File store: immutable source and backup workbook bytes. SQLite stores metadata and hashes, not large workbook blobs.
- `scripts/windows`: loopback startup, health verification, and opt-in ngrok exposure.

The compiled web app is served by the API in standalone mode, so browser and API share one origin. A Sites-hosted web build can connect to an explicitly configured authenticated ngrok endpoint; it never guesses a backend or embeds a secret.

## Trust boundaries

- Local mode binds to `127.0.0.1` by default. Local-only mode is never reused for a public bind.
- Public/ngrok mode fails closed unless a strong bearer token and explicit allowed origins are configured.
- Health endpoints reveal no document names, paths, cell data, tokens, or stack traces.
- Uploaded names are treated as labels; server paths are generated UUIDs under the configured data root.
- CSV formula-like literals are escaped on spreadsheet output. Shape-changing operations are blocked when formulas are present unless the operation explicitly preserves their positions.
- Every apply requires an unexpired preview token, unchanged source hash, explicit acknowledgement, and idempotency key.
- A backup is durably written and hashed before the active version changes. The result is reopened and validated after the write.

## Persistence model

- `documents`: owner, original label, media type, current version, timestamps.
- `versions`: immutable file path, SHA-256, dimensions, source/backup/result kind.
- `previews`: owner, document/version, normalized request, digest, diff summary, expiry, consumed time.
- `operations`: preview, before/after/backup versions, status, validation, error code, idempotency key.
- `audit_events`: bounded, non-cell-data event metadata for security and support.

Indexes follow actual access paths: owner/time history, document versions, preview expiry, and unique owner/idempotency keys. Startup applies idempotent migrations and runs `PRAGMA optimize` after schema changes.

## Resource and performance budget

- One table viewport; the API returns a bounded row/column window rather than serializing 250,000 cells to the browser.
- Workbook work runs off the event loop in a bounded worker pool. Per-document locks serialize mutations while reads remain concurrent.
- Upload limit: 25 MB by default; cell limit: 250,000; preview examples: 20; history page: 50 maximum.
- SQLite uses WAL, a five-second busy timeout, prepared parameterized statements, and short transactions.
- The browser keeps only the visible data window and metadata. It does not duplicate whole workbook payloads in persistent storage.
- No polling when the local document is idle. Connection health uses backoff and visibility-aware refresh.

## HAI connector

The connector is an authenticated REST capability under `/hai/v1` with an OpenAPI description and a machine-readable manifest. Default HAI capabilities are read/analyze/preview. Mutating calls require both server-side enablement and the same explicit preview acknowledgement used by the human UI. The connector reports `local`, `live`, `setup_required`, or `unavailable`; it never converts configuration into a success state.

Gmail and Google Drive are optional upstream sources, not hidden runtime dependencies. Future provider adapters must use owner-scoped read-only consent, bounded ingestion, provider-native cursors, and fail-closed health. This repository does not send mail or modify Drive files during setup.

## Visualization ownership

The product needs one operational table, one compact quality summary, and history status views. React owns labels, table structure, selected state, and accessible summaries. No chart runtime is required. The fallback for constrained/mobile rendering is the same directly labeled table and issue list, not a reduced-fidelity canvas.
