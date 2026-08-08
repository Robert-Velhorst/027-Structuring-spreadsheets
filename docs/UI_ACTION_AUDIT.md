# UI action audit

All production UI is in `src/Sidebar.html`. There are no externally loaded scripts, styles, images, or fonts.

| Visible action | Server function | Mutation | Safety/result |
|---|---|---:|---|
| Refresh | `getBootstrap` | No | Re-reads target, settings, capabilities, history |
| Continue onboarding | `acknowledgeOnboarding` | Metadata only | Stores user-scoped first-run acknowledgement |
| Pause/resume changes | `setMutationPause` | Metadata only | User-scoped emergency stop; apply/restore fail closed |
| Analyze quality | `analyzeCurrentTarget` | No | Counts/score/confidence; no preview token needed |
| Create preview | `previewOperation` | No | Checks access/merges/size/collisions; 10-minute user token |
| Apply once | `applyOperation` | Yes | Acknowledgement, digest, lock, rate limit, idempotency, backup, validation |
| Restore from backup | `undoOperation` | Yes | Owner/state check, lock, affected-range copy, digest validation |
| Save preset | `savePreset` | Metadata only | Validated name/request in UserProperties |
| Refresh presets | `listPresets` | No | User-scoped list |
| Load preset | Client-only | No | Populates controls; fresh preview remains mandatory |
| Delete preset | `deletePreset` | Metadata only | Confirmation then user-scoped delete |
| Download target CSV | `exportCurrentRangeCsv` | No | Returns CSV to browser; no Drive/external request |
| Download support bundle | `exportSupportBundle` | No | Privacy-safe environment/audit JSON |
| Refresh/filter history | `getOperationHistory` | No | Bounded pagination/search over current user's records |
| Delete my data/backups | `deleteMySheetShaperData` | Yes | Destructive confirmation; only namespaced records/referenced backups |

Automated contract tests assert every listed RPC has a concrete server function. The former dashboard, chart, pivot, formula, sharing, sync, notification, and fake export actions were removed from the production build rather than left visible and disconnected.

Accessibility review: semantic headings/labels, keyboard-native controls, visible focus styles, status live region, text status in addition to color, sufficient contrast, and no pointer-only action. Google Sheets sidebars are desktop-oriented; final Chrome/Edge/Firefox/Safari behavior remains part of the real-host manual gate.
