# Sheet Shaper standalone design contract

Status: implementation reference, generated 2026-08-09.

## Accepted references

- `workspace-desktop-concept.png` (1536 x 1024): primary desktop workspace.
- `workspace-mobile-concept.png`: mobile portrait sibling state.

The generated concepts were reviewed as complete, practical product screens. They are the binding visual reference for the standalone workspace; the existing Apps Script sidebar remains a compact secondary surface.

## Product and reading path

The first scan must answer, in order:

1. Which file and service connection are active?
2. Which cells are selected?
3. Which data-quality problems exist?
4. Which operation sequence will run?
5. Is a preview ready, and what is the next safe action?
6. Can a failed or unwanted operation be restored?

The primary artifact family is an operational table workspace. A compact quality score and directly labeled issue counts support the table. There is no decorative chart, detached legend, or hover-only evidence.

## Locked visible copy

Above the desktop fold: `Sheet Shaper`, `Import spreadsheet`, `customer-import.xlsx`, `Local service connected`, `Cloud (ngrok)`, `HAI (read-only)`, `Workspace`, `History`, `Connections`, `Settings`, `Data`, `Preview`, `Quality`, `Analyze`, `Create preview`, `Target range`, `Contains header`, `Operation sequence`, `Preview ready`, `Changes detected`, `Apply once`.

The mobile state may shorten `Local service connected` to `Local`, but does not introduce new product claims. Labels remain code-native.

## Layout and container model

- Desktop: 212 px navigation rail, flexible central table, 320 px operation inspector, lower quality/history band.
- Mobile: compact command header, table first, sticky command bar, operation bottom sheet, four-item bottom navigation.
- Use rails, quiet bands, semantic tables, dividers, and one elevated sheet. Do not turn repeated content into a card grid.
- The spreadsheet is the focal evidence and remains visible around controls.

## Design tokens

- Canvas: true white `#ffffff`.
- Rails and inactive bands: cool gray `#f7f9fc` and `#f2f5f9`.
- Text: deep navy `#0b1f3a`; secondary `#5f6f86`.
- Primary: cobalt `#075ee8`; selected surface `#edf4ff`.
- Border: `#d6dde8`; stronger grid line `#c4cedc`.
- Success: `#0a9b52`; warning: `#b86a00`; failure: `#d92d20`.
- Radius: 8 px controls and elevated surfaces; table cells remain square.
- Shadow: only menus, dialogs, and the mobile operation sheet.
- Type: system UI (`Inter`, `Segoe UI`, Arial fallback); 14 px table and control body, 12 px secondary labels, 20-24 px app headings; 400/500/600 weights.
- Motion: 120-180 ms state transitions; no ambient animation; reduced-motion removes transitions.

## Component and icon inventory

- App shell: brand, primary import action, file switcher, connection selectors, account menu.
- Navigation: workspace, history, connections, settings; 1.5 px outline icons.
- Data grid: row/column headers, selected-range outline, frozen header, horizontal/vertical viewport.
- Commands: analyze, preview, apply once, restore.
- Inspector: target range, header toggle, ordered operations, preview status.
- Quality: score ring plus direct issue values; the text values are authoritative.
- History: quiet table, status icon plus text, explicit restore buttons.
- Mobile: menu, file, local state, table, command bar, operation sheet, bottom navigation.

Use the installed icon family only when its metaphor, stroke, size, and state match the concepts. Icons never replace visible labels for critical actions.

## Responsive and accessibility contract

- Desktop reference viewport: 1536 x 1024. Also verify a 1280 px desktop.
- Mobile portrait reference: 390 x 844. The table appears before configuration.
- Touch targets are at least 44 px. Hover detail has a tap/focus equivalent.
- The operation sheet returns focus to the triggering control when closed.
- Keyboard users can import, select an operation, preview, apply, filter history, and restore.
- Quality state never depends on color alone; status uses icon and text.
- Table caption/summary states total rows/columns, selected range, and current quality state.
- Offline, stale, and disconnected states keep the last known document view visible and name its age.

## Deliberate flexibility

Exact sample values, number of visible rows, and text wrapping may adapt to real data. Backend-authentication setup may add a focused connection dialog. These changes must retain the table-first hierarchy, palette, typography, and safe-action sequence.
