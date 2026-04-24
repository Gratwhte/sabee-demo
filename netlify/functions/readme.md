# Sabee

Sabee is a lightweight team time-off tracker built as a static frontend app with Supabase as the backend.

It lets a small team:

- create a shared team workspace
- add and manage team members
- assign each member a color
- track paid time off, sick leave, and parental leave
- view time off on a shared calendar
- see remaining allowance summaries
- update data in real time across browser tabs/users

The app is intentionally simple:
- no login/auth yet
- one shared workspace for Phase 1 / Phase 2A
- frontend served as static files
- backend powered directly by Supabase

---

## Table of contents

- [1. What the app does](#1-what-the-app-does)
- [2. Core user flows](#2-core-user-flows)
- [3. Current architecture](#3-current-architecture)
- [4. File-by-file code documentation](#4-file-by-file-code-documentation)
- [5. State model](#5-state-model)
- [6. Supabase data model](#6-supabase-data-model)
- [7. Realtime behavior](#7-realtime-behavior)
- [8. Rendering flow](#8-rendering-flow)
- [9. Event flow](#9-event-flow)
- [10. Admin mode behavior](#10-admin-mode-behavior)
- [11. Calendar selection behavior](#11-calendar-selection-behavior)
- [12. Known constraints / current limitations](#12-known-constraints--current-limitations)
- [13. Setup and configuration](#13-setup-and-configuration)
- [14. Development notes](#14-development-notes)
- [15. Suggested future phases](#15-suggested-future-phases)

---

# 1. What the app does

Sabee is a shared team calendar for tracking leave.

Each team member has:

- a name
- a color
- a PTO allowance
- a parental leave allowance

Each day-off entry has:

- a member
- a start date
- an end date
- a leave type:
  - PTO
  - sick
  - parental
- an optional note field in the data model

The UI has two major modes:

## User mode
This is the normal view. It shows:
- a month calendar
- colored dots on days with leave
- a team summary sidebar
- the selected person’s leave entries

## Admin mode
This is the management view. It allows:
- adding members
- editing member names
- editing member colors
- editing PTO allowances
- editing parental allowances
- removing members
- resetting all workspace data

---

# 2. Core user flows

## 2.1 First-time setup / onboarding

If the app loads and no members exist, it shows the onboarding screen.

User can:
- add team members one by one
- assign or change member colors
- start the app

When onboarding is submitted:
- members are created in Supabase
- the app loads the shared workspace
- the calendar view becomes active

---

## 2.2 Selecting a team member

In the sidebar, each member appears as a summary card.

Clicking a member card:
- sets that member as the active selected user
- updates the header
- updates the “Days Off” entry list
- keeps the shared calendar visible

This selection is local UI state, not a server-side preference.

---

## 2.3 Adding a new day off entry

The calendar uses a range selection model.

Flow:
1. click one date → sets start date
2. click a second date → defines end date
3. modal opens
4. choose:
   - Paid Time Off
   - Sick Leave
   - Parental Leave
5. app saves the entry to Supabase
6. app reloads current workspace data
7. UI rerenders

Rules:
- overlapping entries for the same member are prevented
- parental leave is disabled if allowance is zero
- leave type selection is blocked if the range is invalid

---

## 2.4 Viewing existing leave

The calendar shows dots for each leave day.

Dot semantics:
- PTO: solid dot
- Sick: outlined dot
- Parental: square/alternate style dot

The sidebar shows the selected member’s entries:
- type
- date range
- total number of days

Each entry can be deleted.

---

## 2.5 Admin mode

Admin mode allows editing team configuration.

Supported actions:
- add member
- remove member
- rename member
- change member color
- change PTO max
- change parental max
- save changes
- discard unsaved changes
- reset all workspace data

Important distinction:
- admin edits are first applied to a local draft
- nothing persists until "Save Changes" is clicked
- reset deletes persisted workspace data from Supabase

---

## 2.6 Realtime sync

When one user:
- adds leave
- deletes leave
- adds members
- edits members
- removes members

other open clients/tabs in the same workspace refresh automatically.

This is driven by Supabase realtime subscriptions on:
- `members`
- `days_off`

---

# 3. Current architecture

The app is a static frontend with a direct browser-to-Supabase connection.

## Frontend
Plain HTML/CSS/JavaScript:
- no framework
- no bundler required
- browser globals via `window.*`

## Backend
Supabase provides:
- Postgres database
- REST access via `supabase-js`
- realtime subscriptions
- row-level security

## Hosting
Can be hosted on:
- GitHub Pages
- Netlify
- any static host

Because the backend is Supabase, no custom server is required for the current phase.

---

# 4. File-by-file code documentation

---

## `index.html`

### Responsibility
Defines the app structure and loads CSS + JS.

### Contains
- onboarding markup
- app shell markup
- calendar section
- sidebar section
- admin section
- modal markup
- tooltip container
- script includes

### Important IDs used by JS
Examples:
- `onboarding`
- `app-wrap`
- `calendar-days`
- `summary-list`
- `entries-list`
- `admin-members`
- `modal-overlay`
- `modal-member`
- `modal-dates`
- `sync-status`

### Notes
This file should stay mostly declarative:
- structure
- semantic containers
- JS script includes

It should not contain large inline application logic anymore.

---

## `styles.css`

### Responsibility
Defines all visual appearance.

### Main sections
- design tokens / CSS variables
- buttons
- onboarding layout
- header/app shell
- calendar
- summary cards
- entries
- admin forms
- modal
- tooltip
- color popovers
- responsive behavior

### Important relationship to JS
JS renders markup using CSS class names. If class names change in JS or CSS without matching the other side, the UI may still function but look broken.

Examples of class-sensitive components:
- `.summary-card`
- `.entry-card`
- `.admin-member-row`
- `.modal-option`
- `.day-cell`

---

## `state.js`

### Responsibility
Owns shared app constants, shared UI state, and utility helpers.

### Main contents

#### Global constants
Examples:
- `STORAGE_KEY`
- `PALETTE`
- `MONTHS`
- `TYPE_LABEL`
- `TYPE_ICON`
- `DEFAULT_MAX_PTO`

#### Main app state: `window.S`
This is the central in-memory application state.

Fields:
- `members`: array of member objects
- `daysOff`: array of day-off entries
- `month`: currently visible month/year in calendar
- `selId`: currently selected member id
- `pickStart`: first clicked date in range selection
- `hoverDate`: current hover date during range selection
- `admin`: whether admin mode is active
- `draft`: admin draft object
- `draftDirty`: whether admin draft differs from persisted state
- `modalRange`: currently selected date range in modal
- `prevFocus`: used for modal focus restoration

#### Onboarding state: `window.OB`
Contains temporary onboarding member list before members are persisted.

#### Helpers
Examples:
- DOM helper: `$()`
- string escape helper: `esc()`
- date formatting helpers
- date span calculation
- overlap check
- member lookup
- used-days calculations
- next-color selection

### Why this file exists
This file is the shared backbone:
- UI code reads from it
- app event handlers mutate it
- data layer populates it

---

## `supabase-client.js`

### Responsibility
Initializes the Supabase client.

### Contains
`window.SABEE_CONFIG`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `WORKSPACE_ID`

Also creates:
- `window.sb`

### Why this file exists
It isolates environment-specific backend configuration from the rest of the app.

### Important note
`SUPABASE_URL` must be:
- `https://your-project-ref.supabase.co`

Not:
- project ref alone
- `/rest/v1`
- placeholder text

### Current limitation
`WORKSPACE_ID` is hardcoded for now. That is acceptable in Phase 1 / Phase 2A, but later phases should move toward dynamic workspace selection.

---

## `data-service.js`

### Responsibility
This is the data access layer.

It is the only file that should know:
- Supabase table names
- database column names
- realtime subscription details

### Main responsibilities

#### Mapping DB rows to UI models
Functions:
- `dbMemberToUi`
- `uiMemberToDb`
- `dbDayOffToUi`
- `uiDayOffToDb`

These exist because database column naming differs from UI naming:
- DB uses snake_case
- UI uses camel-ish naming

Example:
- DB: `max_pto`
- UI: `maxPTO`

#### Loading data
Functions:
- `loadFromSupabase`
- `load`

`loadFromSupabase`:
- fetches members
- fetches days_off
- maps data into `window.S`

`load`:
- tries Supabase first
- falls back to localStorage cache if needed

#### Persistence helpers
Functions:
- `createMember`
- `updateMember`
- `deleteMember`
- `createDayOff`
- `deleteDayOff`

These do the actual writes to Supabase.

#### Realtime
Functions:
- `startRealtime`
- `stopRealtime`

Subscribes to changes on:
- `members`
- `days_off`

On change:
- reloads workspace data
- updates status pill
- rerenders UI when needed

#### Workspace reset
Function:
- `clearAllWorkspaceData`

Deletes:
- all `days_off` rows for the workspace
- all `members` rows for the workspace

This powers the admin “reset all data” behavior.

### Why this file exists
It separates “talk to database” from “render UI”.

That makes later refactors and debugging far easier.

---

## `ui.js`

### Responsibility
Owns presentation logic.

If a function mostly:
- changes HTML
- sets text
- updates classes
- shows/hides UI
- renders components

it belongs here.

### Main responsibilities

#### Rendering onboarding
- `renderOnboarding`
- `showOnboarding`

#### Rendering main app
- `render`
- `renderHeader`
- `renderCalendar`
- `renderSidebar`
- `renderEntries`
- `renderAdmin`

#### Modal behavior
- `openModal`
- `closeModal`

#### Status and tooltip
- `setSyncStatus`
- `showTooltip`
- `hideTooltip`

#### Color picker popovers
- `buildSwatchesHTML`
- `togglePopover`
- `closeAllPopovers`

### Important design note
`render()` is the master render entrypoint.

It decides:
- user mode vs admin mode
- which sub-renderers should run

### Why this file exists
It keeps HTML generation and UI updates out of `app.js`.

---

## `app.js`

### Responsibility
Owns behavior orchestration and event wiring.

This is the file that answers:
- what happens when the user clicks something?
- what happens on app boot?
- how do admin save/reset flows work?
- how is date selection handled?

### Main responsibilities

#### App boot
- `init`

Boot sequence:
1. bind onboarding events
2. load workspace data
3. choose onboarding or app mode
4. bind main app events
5. render UI

#### Onboarding actions
- `obAdd`
- `obRemove`
- `obStart`

#### Calendar interactions
- `onDayClick`
- `navMonth`

#### Modal confirmation
- `confirmType`

#### Admin flows
- `toggleAdmin`
- `adminAdd`
- `adminRemove`
- `adminSave`
- `adminDiscard`
- `adminReset`

#### Event binding
- `bindOnboarding`
- `bindApp`

### Why this file exists
It is the “glue layer” between:
- state
- UI
- data service

It should not directly own styling or database schema details.

---

# 5. State model

There are three main layers of state in the app.

## 5.1 Persistent backend state
Stored in Supabase:
- members
- day-off entries

This is the source of truth.

---

## 5.2 In-memory app state
Stored in `window.S`:
- currently loaded data
- current month
- selected member
- draft editing state
- modal state
- temporary selection state

This controls current UI behavior.

---

## 5.3 Temporary onboarding state
Stored in `window.OB`:
- team members being prepared before first save

This exists only before the team is created.

---

# 6. Supabase data model

## `workspaces`
Represents a workspace/team.

Current app phase assumes one shared workspace.

Fields typically include:
- `id`
- `slug`
- `name`
- `created_at`

---

## `members`
Represents a team member.

Fields:
- `id`
- `workspace_id`
- `name`
- `color`
- `max_pto`
- `max_parental`
- `created_at`

---

## `days_off`
Represents a leave entry.

Fields:
- `id`
- `workspace_id`
- `member_id`
- `start_date`
- `end_date`
- `type`
- `note`
- `created_at`
- `updated_at`

---

# 7. Realtime behavior

Supabase realtime is enabled for:
- `members`
- `days_off`

## Current behavior
On any insert/update/delete event:
- app reloads current workspace data
- updates sync status
- rerenders if not in admin mode

## Trade-off
This is simpler and safer than patching local state row-by-row, but less efficient than a more advanced event reducer.

For the current app size, this is acceptable.

---

# 8. Rendering flow

## High-level render sequence

`render()` calls:
- `renderHeader()`
- if admin mode:
  - `renderAdmin()`
- else:
  - `renderCalendar()`
  - `renderSidebar()`
  - `renderEntries()`

## Why this matters
If one UI section looks stale, the problem is often:
- state not updated
- correct render function not called
- or render function using stale assumptions

---

# 9. Event flow

## Calendar click flow
1. user clicks day
2. `bindApp` receives click
3. `onDayClick(ds)` runs
4. if no start selected:
   - set `pickStart`
5. else:
   - compute range
   - call `openModal`

## Modal save flow
1. user clicks leave type button
2. `confirmType(type)` runs
3. validation happens
4. `createDayOff(...)` persists to Supabase
5. `loadFromSupabase()` refreshes local state
6. modal closes
7. app rerenders

## Admin save flow
1. user edits `S.draft`
2. clicks Save
3. `adminSave()` compares draft against current members
4. missing members are deleted
5. new members are inserted
6. changed members are updated
7. app reloads from Supabase
8. UI rerenders

---

# 10. Admin mode behavior

Admin mode intentionally uses a draft.

## Why
This avoids partial persistence on every keystroke.

## Draft shape
`S.draft` contains:
- `members`
- `removedIds`

## Rules
- typing into inputs updates the draft only
- save button becomes enabled when draft changes
- discard resets draft from persisted state
- save persists changes to Supabase

## Important implementation detail
Admin inputs should not rerender the entire admin list on every keystroke, because that causes focus loss.

---

# 11. Calendar selection behavior

The calendar uses a two-click range selection.

## Flow
- first click = start date
- second click = end date
- modal opens for the selected range

## Related state
- `S.pickStart`
- `S.hoverDate`
- `S.modalRange`

## Validation
Before saving:
- same-member overlap is blocked
- parental is disabled if allowance is zero

---

# 12. Known constraints / current limitations

## No authentication yet
Everyone using the app shares the same workspace.

## Hardcoded workspace
`WORKSPACE_ID` is fixed in client config.

## No user roles
Admin mode is a UI mode, not a secured permission model.

## Realtime refresh strategy is simple
Current implementation reloads full workspace tables on changes.

## LocalStorage fallback is limited
Used as a convenience/fallback cache, not a real offline strategy.

---

# 13. Setup and configuration

## Required frontend files
Expected current structure:

```text
index.html
styles.css
state.js
supabase-client.js
data-service.js
ui.js
app.js
