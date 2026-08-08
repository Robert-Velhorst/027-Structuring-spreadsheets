# Task graph

```text
repository audit
  ├─> supported product boundary
  │     ├─> least-privilege manifest
  │     ├─> deterministic Core.gs
  │     └─> single connected sidebar
  ├─> safety state model
  │     ├─> user-owned expiring preview
  │     ├─> stale/collision/access checks
  │     ├─> document lock + idempotency + rate limit
  │     ├─> hidden backup before write
  │     └─> readback digest validation
  ├─> recovery and accountability
  │     ├─> owner-scoped operation record
  │     ├─> validated affected-range restore
  │     ├─> retention/deletion
  │     └─> privacy-safe support bundle
  └─> release evidence
        ├─> syntax/UI lint
        ├─> deterministic/adversarial tests
        ├─> build + doctor
        ├─> security/UI/API audits
        └─> real Google deployment gate (external)
```

Resume order after context loss: read `FINAL_VERIFICATION_REPORT.md`, run `git status --short`, run `npm run verify`, inspect unresolved Partial/Blocked rows in `GOAL_COMPLETION_MATRIX.md`, then continue only from an evidence-backed checkpoint.
