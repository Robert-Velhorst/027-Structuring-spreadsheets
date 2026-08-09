# Sheet Shaper

Sheet Shaper structures CSV, XLSX, and Google Sheets data without hiding the
consequences of a write. It now ships as both a Windows 11 standalone workspace
and a least-privilege Google Sheets Editor add-on.

The supported mutation path is strict:

`import or select → analyze → preview → acknowledge → backup → locked write → readback validation → restore if needed`

## Windows workspace

The standalone workspace includes:

- CSV and XLSX import with bounded 25 MB / 250,000-cell limits.
- Smart trim, case conversion, duplicate removal, empty row/column compaction,
  text splitting, sorting, and ordered operation batches.
- Exact preview examples, before/after quality scores, risk classification, and
  ten-minute preview expiry.
- SQLite metadata in WAL mode, parameterized queries, idempotent writes,
  per-document locks, hashed backups, readback validation, history, download,
  stale-safe restore, and complete document/backup deletion.
- A responsive React interface for desktop and mobile-width browsers.
- Loopback-only local operation, authenticated ngrok mode, and a private Sites
  frontend that can connect to the ngrok service.
- A bearer-authenticated HAI connector that is read-and-preview only by default.

Spreadsheet bytes stay under `%LOCALAPPDATA%\SheetShaper` in local mode. Public
mode sends browser/API traffic through the operator's ngrok endpoint and the UI
states that change explicitly. Cell values are never stored in audit events.

### Install from source

Requirements: Windows 11, Python 3.11+, and an even-numbered supported Node.js
release (20, 22, or 24).

```powershell
.\scripts\windows\setup.ps1
.\scripts\windows\start-local.ps1
```

The launcher selects the first free loopback port from 8765 through 8790,
opens the browser, and records only verified process identity. Stop it with:

```powershell
.\scripts\windows\stop.ps1
```

### Build the standalone executable

```powershell
.\scripts\windows\build-standalone.ps1
```

The one-folder build appears under `dist\SheetShaper`. It contains the Python
runtime, API, workbook engine, and built web interface; Node and Python are not
required on the destination computer.

### Cloud access through ngrok

Configure the ngrok agent once, then run:

```powershell
.\scripts\windows\start-ngrok.ps1
```

The launcher always keeps the API bound to loopback, creates or reuses a
64-character bearer token protected with Windows DPAPI, isolates its ngrok
agent API from other local tunnels, checks the exact target and HTTPS URL,
performs an authenticated public readiness request, and copies the token to the
clipboard. If the account's endpoint is already active elsewhere, startup fails
closed instead of enabling pooling or stopping the other endpoint.

For the private Sites frontend, pass its origin explicitly:

```powershell
.\scripts\windows\start-ngrok.ps1 -AllowedOrigin 'https://YOUR-SITES-URL'
```

### HAI connector

The connector description is in `connectors/hai/connector.json`. HAI can list
documents, read bounded windows, analyze quality, and create previews after it
receives the bearer token through its own secret store. Apply and restore are
not advertised until the operator deliberately sets
`SS_HAI_MUTATIONS_ENABLED=true`; they still require review acknowledgement,
idempotency, backup, and validation.

## Google Sheets add-on

The Apps Script add-on retains its original least-privilege boundary. It uses
only the current spreadsheet and container UI scopes. Its English and Dutch UI
supports preview-safe CSV import, operations, presets, quality analysis,
paginated history, support export, validated restore, feature flags, safety
pause, and user-owned data deletion. It does not use Gmail, Drive, remote fetch,
scheduled triggers, or public Execution API access.

Build and verify it with a supported Node.js release:

```powershell
npm ci
npm run verify
```

`dist/` is generated for an owner-approved Apps Script project. Real Google
installation, OAuth consent, administrator policy, two-account tests, and
Marketplace publication remain owner/account actions and are never simulated.

## Architecture

- `apps/api`: FastAPI, SQLite, workbook adapters, safety engine, HAI surface.
- `apps/web`: React/Vite workspace used by Windows and the hosted frontend.
- `apps/site`: Cloudflare Workers-compatible private Sites delivery surface.
- `connectors/hai`: connector contract and setup guide.
- `scripts/windows`: setup, local start, ngrok start, stop, and executable build.
- `src`, `test`, `scripts`: the Google Sheets Apps Script add-on and its gates.
- `docs`: architecture, design contract, security, runbooks, and evidence.

## Verification

Local gates cover deterministic add-on behavior, the full preview/apply/restore
Apps Script contract, FastAPI CSV/XLSX integration, malformed inputs,
authorization, HAI default-deny behavior, formula preservation, deletion,
React review/apply and disconnected states, PowerShell parsing, production web
builds, loopback runtime startup/shutdown, and packaged executable startup.

GitHub Actions repeats the add-on gates and builds/tests the Windows stack with
Node 24 and Python 3.13. See `docs/FINAL_VERIFICATION_REPORT.md` and
`docs/GOAL_COMPLETION_MATRIX.md` for the exact status and external blockers.
