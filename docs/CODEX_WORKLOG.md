# Codex worklog

## 2026-08-08

1. Verified remote default branch `main` and starting commit `d2a041a6a671cfcbc2bac06ea3e0c227fe490ccd`; cloned the real repository and created `codex/production-hardening-027`.
2. Audited all tracked files, function declarations, UI action calls, manifest scopes, fake/placeholder markers, remote-provider calls, and missing test/build/CI controls.
3. Chose a current-document Editor add-on architecture and removed unreachable/unsafe prototype managers from the deployable surface while retaining history in Git.
4. Implemented deterministic transformations, batch order, formula preservation, quality score/confidence, preview diffs, and CSV engine.
5. Implemented menu/sidebar RPC, user-scoped preview/history/presets/settings, access/merge/size/collision checks, safety stop, rate limit, idempotency, document lock, backup-before-write, readback validation, retention, deletion, support export, and digest-validated restore.
6. Added accessible sidebar, zero-dependency build/lint/doctor, Node tests, and GitHub Actions.
7. Ran the first gate, fixed locale-sensitive limit text, policy-marker scan noise, expansion bounds, literal equals-text handling, formula shape-change safety, bounded idempotency, and backup retention cleanup.
8. Added audit, critical path, acceptance, security/privacy, UI/API audit, operator, task graph, matrix, and final verification evidence.

9. Final local gate: `npm ci` found zero vulnerabilities; lint passed; 19/19 tests passed; build and doctor passed; `git diff --check` passed; unsafe-service, secret-assignment, and tracked-runtime scans were clean. The marker scan matched only policy regex definitions in lint/tests.
10. In-app Browser visual QA was attempted twice as required but timed out before exposing a session. No screenshot or interaction claim is made. A real Apps Script deployment is also required for meaningful `google.script.run` interaction.

Remaining: commit, push if authenticated, clean-clone rerun, and real Google-hosted deployment by the owner.
