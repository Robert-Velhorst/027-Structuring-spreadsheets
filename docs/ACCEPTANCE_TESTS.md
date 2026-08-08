# Acceptance tests

## Automated results

| ID | Scenario | Expected | Actual local result |
|---|---|---|---|
| A01 | Smart trim constants/formulas | Normalize whitespace; preserve formula string | Passed |
| A02 | Duplicate rows with header | Keep header and first occurrence | Passed |
| A03 | Batch order | Trim → case → deduplicate deterministically | Passed |
| A04 | Split text | Expand chosen column; keep adjacent data | Passed |
| A05 | Numeric sort | Header fixed; ascending/descending correct | Passed |
| A06 | Empty row/column compaction | Compact matrix without physical grid deletion | Passed |
| A07 | CSV escaping/parsing | Quotes, commas, and newlines round-trip | Passed |
| A08 | Invalid/adversarial requests | Reject empty delimiter, unknown op, >8 batch | Passed |
| A09 | Oversized target | Reject >250,000 cells | Passed |
| A10 | Quality confidence | Score and explicit confidence returned | Passed |
| A11 | Apply contract | Lock + stale check + backup before write + validation | Passed (static contract) |
| A12 | Restore contract | Owner check + backup copy + digest validation | Passed (static contract) |
| A13 | OAuth boundary | Only current-document + UI scopes; no Execution API | Passed |
| A14 | No fake/external provider | No remote/Drive/Gmail or fake-success markers | Passed |
| A15 | UI action wiring | All 14 RPC methods exist server-side | Passed |
| A16 | Public record privacy | Owner and digests excluded | Passed |
| A17 | Error envelope | Retry safety/next step; no stack | Passed |

The Node test runner also reports `test/helpers.mjs` as a test file with no cases; total reported tests are 19, all passing.

## Required real-host tests

| ID | Scenario | Expected | Current status |
|---|---|---|---|
| G01 | Editor add-on menu/sidebar | Menu opens sidebar after authorization | Blocked: no project/deployment |
| G02 | Preview has no writes | Data/revision unchanged | Blocked: no project/deployment |
| G03 | Apply and backup | Hidden copy precedes validated write | Blocked: no project/deployment |
| G04 | Stale preview under collaborator edit | Fail closed | Blocked: needs two accounts |
| G05 | Restore formulas/formats | Affected range digest returns to input | Blocked: no project/deployment |
| G06 | Protected/read-only range | Clear actionable error; no write | Blocked: no project/deployment |
| G07 | Apps Script quota/time pressure | Honest error; backup preserved | Blocked: account/runtime dependent |
| G08 | Chrome/Edge/Firefox/Safari | Sidebar usable with keyboard and browser zoom | Blocked: hosted sidebar needed |
| G09 | Workspace administrator policy | Installation/authorization behavior documented | Blocked: admin environment needed |
| G10 | Marketplace install | Listing accepted and installable | Blocked: owner/Google approval |

Detailed steps are in `CRITICAL_PATH.md`.
