# Codex checkpoints

## CP0 - Repository truth

- Default branch: `main`
- Start: `d2a041a6a671cfcbc2bac06ea3e0c227fe490ccd`
- Working branch: `codex/production-hardening-027`
- Initial tree: prototype Apps Script files; no tests/build/CI
- Status: complete

## CP1 - Safety architecture

- Single supported UI/runtime path
- Current-document scopes only
- Preview/backup/lock/idempotency/validation/restore implemented
- Status: complete locally

## CP2 - Automated baseline

- Syntax/UI lint: passed
- Tests: 19 passed, 0 failed
- Build: passed
- Status: complete locally

## CP3 - Documentation truth

- Required audit/critical path/acceptance/matrix/final report/UI/API/security/runbook/worklog/checkpoint/task graph files present
- External Google gates separated from local code status
- Status: complete, pending final result refresh

## CP4 - Google runtime

- Apps Script project, OAuth consent, test deployment, real spreadsheet, collaborator test, Marketplace review
- Status: blocked on owner-controlled Google account/project/approval

## CP5 - Rendered UI proof

- In-app Browser connection attempted twice; both timed out before session/tab creation
- Static HTML/client JavaScript syntax and 16 RPC call sites passed
- Status: blocked on Browser connection plus Apps Script hosted bridge
