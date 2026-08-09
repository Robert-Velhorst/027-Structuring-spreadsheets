# Final verification report

Date: 2026-08-09
Branch: `codex/production-hardening-027`
Starting commit: `64fad52b4ffe5a75f8256bd2ec4605a1976d484a`
Final commit: repository `HEAD` at handoff

## Delivered

- Retained and strengthened the Google Sheets add-on, including safe CSV
  preview/apply, English/Dutch language selection, feature flags, bounded
  history, and real preview → backup → write → validation → restore integration
  tests.
- Added a real standalone product: React/Vite frontend, FastAPI API, SQLite WAL
  metadata, CSV/XLSX adapters, deterministic engine, and local version files.
- Wired import, document selection, bounded table view, quality analysis,
  operation selection, preview examples, acknowledgement, idempotent apply,
  history/filtering, download, stale-safe restore, and complete deletion.
- Added Windows setup/local/ngrok/stop/build commands and produced a one-folder
  executable containing the API and web interface.
- Added a private Sites-compatible worker/frontend and a HAI connector contract.
- Added Windows and Linux CI jobs for add-on, web, API, PowerShell, PyInstaller,
  and packaged-runtime smoke checks.

## Security and resource controls

- API always binds to loopback; cloud access is through ngrok only.
- Public mode requires a bearer token of at least 32 UTF-8 bytes. The Windows
  launcher creates 48 random bytes, stores the token with current-user DPAPI,
  excludes it from runtime JSON, and copies it to the clipboard for setup.
- CORS uses an explicit origin list; Sites origins must be passed to the ngrok
  launcher. CSP, no-sniff, no-referrer, permissions policy, no-store API cache,
  request IDs, body limits, and public rate limiting are active.
- SQLite uses foreign keys, WAL, normal synchronization, a busy timeout,
  parameterized queries, indexes, and schema versioning.
- Workbook work is offloaded from the async request loop. One Uvicorn process is
  enforced because document locks are process-local.
- Previews expire, stale hashes fail closed, write attempts are idempotent,
  backups are copied and hashed before writing, output is read back and compared,
  and restore rejects newer-version conflicts.
- Audit events exclude cell content and tokens. Expired previews and bounded
  audit metadata are pruned. Critical source/result/backup versions are retained
  until explicit document deletion.
- CSV formula-injection literals are escaped; real XLSX formulas are preserved.
  Filenames are sanitized and user-controlled filesystem paths are not used.

## Verification evidence

### Google Sheets add-on

```text
node scripts/lint.mjs
  Passed; 19 RPC call sites checked.

node --test --test-reporter=spec "test/**/*.test.mjs"
  22 passed; 0 failed.

node scripts/build.mjs
  Passed; generated least-privilege Apps Script bundle.

node scripts/doctor.mjs
  Passed; files, runtime, scopes, and external-execution boundary healthy.
```

### Standalone API

```text
python -m pytest apps/api/tests -q
  11 passed; 0 failed.
```

Coverage includes CSV apply/restore/download/idempotency, public bearer auth,
HAI read-only default, malformed inputs, full deletion, single-process lock
guard, XLSX trimming, readback validation, and formula preservation. A test-only
Starlette warning recommends the newer `httpx2` TestClient transport; it does not
affect the production server.

### React and bundles

```text
npm --prefix apps/web run lint
  TypeScript and source-contract lint passed; 14 files checked.

vitest run src/App.test.tsx --pool=forks --maxWorkers=1
  2 passed; 0 failed.

vite build
  Passed; 224.38 KB JavaScript, 70.11 KB gzip.

node apps/site/scripts/build.mjs
  Passed; worker entry and static client created.
```

The UI tests exercise a loaded spreadsheet through preview acknowledgement and
apply, then verify the updated quality state. They also verify that an offline
service shows a disconnected error and invents no rows or success state.
That exact suite passed during the implementation run. Three final-repeat
attempts on the loaded Windows host timed out while starting the Vitest worker,
before transform/import or test execution; Node 24 and Node 25 showed the same
host-level handshake timeout. TypeScript/source lint and the production Vite
build passed again after those attempts.

### Windows runtime

- PowerShell parsing passed for setup, local start, ngrok start, stop, and build.
- Local startup detected another app on 8765, selected 8766, returned ready/local
  version 3.0.0, and stopped only its recorded process.
- The packaged `SheetShaper.exe` returned ready/local version 3.0.0, served the
  bundled interface with HTTP 200, and was stopped after exact path/PID checking.
- The final one-folder executable was rebuilt after the static-asset refresh;
  its launcher EXE measures 7,211,328 bytes.

## Live provider acceptance

### ngrok

The launcher found an existing local ngrok agent at port 4040 and correctly
rejected its unrelated `laro.internal` tunnel. The implementation then isolated
its agent API on a new port and matched the exact upstream. The ngrok service
rejected the new endpoint because the account's assigned public domain was
already online elsewhere (`ERR_NGROK_334`). The launcher stopped its own API and
ngrok processes. It did not stop the other endpoint and did not enable pooling,
because either action could misroute spreadsheet traffic.

### HAI

Local authenticated manifest and capability tests pass. The manifest is
read-and-preview only by default. Live HAI-to-public-endpoint acceptance depends
on resolving the ngrok endpoint conflict.

### Sites

The private Sites project, exact source version, and production deployment are
created during the release handoff. The connector-returned URL is reported in
the final response rather than embedded here so the committed source remains
the exact version used for packaging.

### Gmail and Google Drive

No Gmail or Drive writes were needed or performed. The product does not claim
those providers as runtime integrations. This preserves the requested
review-gated, owner-controlled boundary and avoids silent external actions.

## Visual verification status

The frontend-builder concept pass produced and inspected desktop and mobile
references under `docs/design`. The implementation follows their white canvas,
nav/command/inspector layout, quality band, history table, operation sheet, and
mobile bottom navigation.

Rendered interaction capture is not claimed:

- In-app Browser initialization timed out twice, including a full 120-second
  attempt, before exposing a tab.
- Computer control listed the exact local Chrome window, but both screenshot and
  accessibility state capture failed with `node_repl exec context not found`
  after the required recovery sequence.

No Playwright fallback was used because Browser and Computer were explicitly
requested and neither workflow authorized silently switching surfaces.

## Remaining external blockers

1. Stop or transfer ownership of the already-online ngrok endpoint, then rerun
   the authenticated public/HAI smoke test.
2. Complete the real Apps Script owner deployment, OAuth/admin review,
   two-account isolation test, and Marketplace process if publication is wanted.
3. Re-run desktop/mobile screenshot interaction QA when the Browser or Computer
   helper exposes a usable page state.
