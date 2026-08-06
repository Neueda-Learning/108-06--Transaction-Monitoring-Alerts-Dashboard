# Transaction Monitoring & Alerts Dashboard — Team Reference

## PART 2 of 4: Frontend Deep Dive (React 19 + TypeScript + Vite)

> ⚠️ **Read this first — the most important architectural fact about the frontend:**
> This codebase currently contains **two parallel, independent UI implementations** that both talk to the same backend. Only **one** of them is actually wired up and reachable by a user. This is very likely leftover work-in-progress from separate feature branches that were merged without fully reconciling. The team should discuss whether to delete the unused one.

---

## 1. Routing Reality Check — What Actually Renders

`frontend/src/main.tsx` is the true source of truth for what's live:

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/alerts/:id" element={<AlertDetailsPage />} />
    <Route path="/*" element={<App />} />
  </Routes>
</BrowserRouter>
```

Only **two** route entries exist:
1. **`/alerts/:id`** → `pages/AlertDetailsPage.tsx` (MUI-based, uses `api/alertsApi.ts` which has a `VITE_USE_MOCK` mock-data fallback).
2. **`/*` (everything else, including `/`, `/dashboard`, `/transactions`, `/alerts`, `/rules`, `/simulator`)** → the monolithic **`App.tsx`** (1,605 lines), which does its **own internal tab-based navigation** (not real routes — it's `useState<TabType>` driven, no URL changes when you click a nav item).

### Files that exist but are **NOT reachable by any route** (dead/parallel code):
- `pages/DashboardPage.tsx`
- `pages/AlertsPage.tsx`
- `pages/RulesPage.tsx`
- `pages/TransactionsPage.tsx`
- `pages/AlertDetailPage.tsx` (singular — note there are **two** similarly-named alert detail pages: `AlertDetailPage.tsx` unused, `AlertDetailsPage.tsx` live)

These unused pages are a **more modern, more "properly React-Router" implementation** — each is its own route-worthy component using real server-side pagination (`PaginationControls.tsx`, added in the pagination feature branch), separate `PageHeader`/`StatusBadge` components, and cleaner separation of concerns than the monolithic `App.tsx`. They have their own test files (`RulesPage.test.tsx`, `TransactionsPage.test.tsx`) that presumably pass, but the pages themselves are invisible to a real user because `main.tsx` never routes to them.

**Practical implication for anyone reading code**: if you search for "where is the Rules page implemented", you'll find `RulesPage.tsx` — but the version a user actually sees is the `activeTab === 'rules'` block inside `App.tsx`. Any bug fix must be applied to `App.tsx` to have any real-world effect (unless the team decides to switch `main.tsx` over to the router-based pages instead).

---

## 2. The Live UI: `App.tsx` Walkthrough

A single ~1600-line function component. High-level structure:

### 2.1 Layout
- Left sidebar (`<aside className="left-nav">`) — brand block ("FBI — Financial Intelligence — AML Monitoring Platform") + 5 tabs: **Dashboard, Transactions, Alerts, Monitoring Rules, Simulator** (icons from `lucide-react`). The Alerts tab shows a red pill badge with the live open-alert count.
- Top header — page title, a "Live" status pill, dark-mode toggle (`Moon`/`Sun` icon — purely a CSS class swap, `theme-dark`), a manual refresh button (bell icon → re-runs `loadAll()`), and a static "OP" avatar chip (no real auth/user system exists).

### 2.2 Data Loading
`loadAll()` fires 3 parallel unpaged fetches on mount: `getTransactions()`, `getAlerts()`, `getRules()` (all **unpaged** — the live `App.tsx` never uses the paginated endpoints; pagination only exists in the unused `pages/*` components!). All 3 lists are held in top-level React state and re-fetched after every mutation (create transaction, change alert status, save/delete a rule, run a simulator scenario).

### 2.3 Dashboard Tab
- 4 KPI cards: Total Transactions, Flagged High-Risk Alerts (severity=HIGH count only — **not** all flagged/blocked, worth noting as a minor metric-naming inconsistency vs. the backend's `flaggedOrBlockedCount`), Total Monitored Volume (hardcoded formatted as GBP regardless of actual transaction currencies — a cosmetic bug), Active Monitoring Rules. "Week-over-week" trend numbers are **entirely fabricated client-side placeholders** (`weekTrend` memo just returns `+8%`/`-4%`/`+12%`/`0%` if the corresponding count is non-zero) — there is no real historical time-series backing them; call this out to the team/customer honestly.
- 4 Recharts panels: Transactions bucketed into 8×3-hour buckets by hour-of-day (not by real chronological date — this only differentiates "what hour of day" not "which day", another simplification worth knowing), Alert Severity bar chart, Alert Lifecycle Status pie chart, Alerts-by-Rule-Type horizontal bar chart.
- "Recent Alerts Workload" table — first 10 non-closed/dismissed alerts, each with an "Investigate" button that switches to the Alerts tab and opens the investigation dialog.
- **AI Dashboard Summary** card — "Generate Summary" button calls `POST /api/dashboard/ai-summary`; on failure, silently substitutes a locally-computed heuristic summary (see Part 1 §6.4) and shows the error message alongside it. Includes Copy-to-clipboard and Download-as-.txt actions.

### 2.4 Transactions Tab
- "Create Transaction" form → `POST /api/transactions`. Newly created transaction is optimistically prepended to the in-memory list and highlighted (`new-transaction-row` CSS class) and auto-scrolled into view.
- Toolbar: free-text search (matches id/accountId/payeeId **client-side only** — note this is a different, weaker search than the backend's paged `search` param, because this tab uses the **unpaged** endpoint and filters in JS), status filter (`ALL/APPROVED/FLAGGED/BLOCKED`), min/max amount, sort (Newest / Amount High-Low / Amount Low-High) — all client-side via `useMemo` (`derivedTransactions`), **not** hitting the backend's paged/sorted/filtered endpoint.
- Ledger table with a "Details" button opening a `Modal` showing: which of the 4 non-SDN rule types triggered for that transaction (derived purely from whether any alert with that `ruleType` exists for the transaction — **not** using the dedicated `/rule-results` endpoint that returns the full picture including untriggered rules with messages) and the linked alert IDs.

### 2.5 Alerts Tab
- Filter panel: Alert ID, Transaction ID (labelled "Tid"), Account ID (labelled "Acc Id"), Severity, Rule Type, Status — all client-side substring/equality matches against the in-memory `alerts` array (again: **unpaged**, not the backend's paged+search endpoint).
- "Investigation Queue" table with **sortable column headers** (click to toggle asc/desc) for ID, Severity (custom rank order CRITICAL>HIGH>MEDIUM>LOW), Status, Created — a real client-side sort UX feature (`toggleAlertSort`), added in the `feature/filter-sort-functionality` branch.
- "Open Workspace" button → opens `InvestigationDialog` (MUI `Dialog`), which is the **shared component** also usable from the Dashboard tab's workload table.

### 2.6 `InvestigationDialog` Component (`components/InvestigationDialog.tsx`)
The main interactive artifact analysts use daily:
- Header chips: Alert ID (formatted `ALT-0042`), Severity (color-coded), Status.
- `WorkflowActions` sub-component: horizontal stepper (`OPEN → ACKNOWLEDGED → INVESTIGATING → CLOSED`, `DISMISSED` always available as an off-ramp) with clickable next-step buttons that call `onWorkflowStatusChange` (staged locally, not saved yet) and a running local `history` log of clicks.
- `InvestigationNotes` sub-component: add free-text notes (client-side only in this dialog — held in `notesByAlertId` React state, **never actually persisted to the backend's `POST /api/alerts/{id}/notes` endpoint from this dialog** — a real gap worth flagging: the "Add Note" feature in the live UI is currently **not wired to the database**).
- **"Investigate with AI"** button → `POST /api/alerts/{id}/ai-investigate`, displays Risk Level / Summary / Recommendation inline.
- **"Save Investigation"** button → if the staged status differs from the alert's current status, calls `PATCH /api/alerts/{id}/status`; then reloads all data and closes the dialog. Toast notifications (`react-hot-toast`) confirm success or surface the error.

### 2.7 Rules Tab
- Create/Edit form with conditional fields shown based on selected `RuleType` (Amount Limit / Velocity Count+Window / Daily Limit), matching backend validation exactly.
- Rules Catalog table with an ON/OFF toggle switch (`PATCH /api/rules/{id}/toggle` — implemented client-side here as a full `updateRule` PUT call with `active` flipped, not the dedicated toggle endpoint — functionally equivalent but an extra network payload), Edit (populates the form), Delete.

### 2.8 Simulator Tab
- 6 scenario buttons (icons: PlaySquare/AlertTriangle/Clock3/Bot/ShieldAlert ×2), each disabled while any scenario is running. On completion, shows a result panel: scenario name/description, a table of created transactions (with risk-score badges), and a table of generated alerts (empty state handled explicitly).

---

## 3. `alertsApi.ts` — the Legacy/Mock API Layer

A **separate, Axios-based API client** (`frontend/src/api/alertsApi.ts`) exists alongside the primary `fetch`-based `client.ts`. It:
- Uses `axios.create({ baseURL: '/api' })`.
- Has a `USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'` flag — when true, every function (`fetchAlert`, `fetchAlertTransactions`, `fetchAlertNotes`, `fetchAlertHistory`, `postNote`, `closeAlert`, `dismissAlert`) returns **canned mock data** from `mocks/alertMockData.ts` after an artificial 400ms delay, instead of hitting the real backend.
- Is used **exclusively** by `AlertDetailsPage.tsx` (the one live route at `/alerts/:id`).
- Calls endpoints that **do not exist on the real backend** in some cases: `closeAlert`/`dismissAlert` POST to `/alerts/{id}/close` and `/alerts/{id}/dismiss` — **neither of these routes exist** in `AlertController` (which only has `PATCH /status`). So visiting `/alerts/:id` directly in a browser with `VITE_USE_MOCK` unset/false and clicking "Close"/"Dismiss" in that page's `WorkflowActions` will produce a **404 network error** against the real backend. This is a real, demo-breaking bug to be aware of if anyone deep-links into `/alerts/{id}`.
- `fetchAlertTransactions` similarly calls `/alerts/{id}/transactions`, which also does not exist server-side (the real backend only exposes rule-results per *transaction*, not a transaction-list per *alert*).

**Recommendation for the team**: either wire `AlertDetailsPage` fully onto the real API (add the missing endpoints or repoint to existing ones), or retire this page/route entirely in favor of the `InvestigationDialog` inside `App.tsx`, which is fully functional against the real backend for status changes and AI investigation.

---

## 4. `api/` Layer Reference (frontend)

| File | Backend endpoint(s) | Notes |
|---|---|---|
| `client.ts` | — | Shared `apiRequest<T>()` wrapper around `fetch`. Builds URLs from `VITE_API_BASE_URL` (empty by default → relative paths, works behind a same-origin proxy like the Docker/nginx setup in Part 4). Throws `ApiError{message, status}` on non-2xx, parsing the backend's `{message}` error body when present. Returns `undefined` for `204 No Content`. |
| `transactions.ts` | `GET/POST /api/transactions` | `getTransactions()` is **overloaded**: returns `TransactionResponse[]` if no `page`/`size`, else `PagedResponse<TransactionResponse>` — mirrors the backend's dual-mapping trick. |
| `alerts.ts` | `GET /api/alerts`, `GET /api/alerts/{id}`, `PATCH /api/alerts/{id}/status`, `POST /api/alerts/{id}/ai-investigate` | Same paged/unpaged overload pattern. |
| `rules.ts` | Full CRUD on `/api/rules` | Same overload pattern for `getRules`. |
| `dashboard.ts` | `POST /api/dashboard/ai-summary` | Single function. |
| `simulator.ts` | `GET /api/simulator/scenarios`, `POST /api/simulator/scenarios/{scenario}` | |
| `types.ts` | — | Hand-written TypeScript mirrors of every backend DTO/enum — kept manually in sync (no codegen from the Java side; a drift risk to watch). |
| `alertsApi.ts` | Legacy/mock, see §3 | Not part of the "real" typed API surface. |

---

## 5. Shared Components Inventory

| Component | Used by (live) | Purpose |
|---|---|---|
| `InvestigationDialog.tsx` | `App.tsx` | The main alert-triage modal (see §2.6). |
| `WorkflowActions.tsx` | `InvestigationDialog`, `AlertDetailsPage` | Status stepper + local history log. |
| `InvestigationNotes.tsx` | `InvestigationDialog`, `AlertDetailsPage` | Note composer + list. |
| `Modal.tsx` | `App.tsx` (Transaction Detail popup) | Minimal accessible modal wrapper. |
| `ConfirmDialog.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx` | Only `AlertDetailsPage`'s component tree | Generic MUI-styled helpers. |
| `AlertHeaderCard.tsx`, `AuditTimeline.tsx`, `TransactionTable.tsx`, `TriggerExplanation.tsx` | Only `AlertDetailsPage` | Presentation pieces for the (partially broken, see §3) alert-details route. |
| `PageHeader.tsx`, `StatusBadge.tsx`, `PaginationControls.tsx` | Only the **unused** `pages/*.tsx` files | Not visible to end users today. |
| `Layout.tsx` | Appears unused by both live routes — likely leftover scaffold | |

---

## 6. Utilities

`utils/format.ts`:
- `formatCurrency(amount, currency)` — `Intl.NumberFormat` currency formatting.
- `formatDate(value)` — locale date-time string, `'--'` for null/invalid.
- `toIsoFromLocalDateTime(value)` — converts an HTML `datetime-local` input value to ISO 8601 for the API.
- `riskBucket(score)` — maps 0–100 risk score → `low (<25) / medium (<60) / high (<85) / critical (≥85)` for badge coloring. **Note**: these thresholds are a frontend-only convention and don't need to match backend severity weights exactly, but worth knowing they're separate scales (backend severity weights: LOW=15, MEDIUM=35, HIGH=60, CRITICAL=100 cap).

`utils/tableState.ts` — (used by the unused `pages/*` components for shared pagination/sort state shape).

---

## 7. Styling & Theming

- `index.css` (~region grew significantly across branches) defines the entire design system as hand-written CSS classes (`.card`, `.badge.sev-*`, `.badge.st-*`, `.tab-btn`, `.shell.theme-dark`, etc.) — **no Tailwind/CSS-in-JS** for the primary `App.tsx` UI.
- The unused `pages/*` + `AlertDetailsPage` tree instead leans on **MUI (`@mui/material`, `@mui/icons-material`, `@emotion/*`)** — meaning the codebase currently ships **two styling systems simultaneously** (hand-rolled CSS classes + MUI's CSS-in-JS `sx` prop), inflating bundle size for functionality most users never see. This is a good target for cleanup.
- Dark mode: a single boolean flips a `theme-dark` class on the outer shell; only affects the `App.tsx` design system, not MUI (MUI components would need a separate `ThemeProvider` dark palette, which does not currently exist).

---

## 8. Frontend Build & Test Tooling

`frontend/package.json` key scripts:
```json
"dev": "vite",
"build": "tsc -b && vite build",
"lint": "eslint .",
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```
Key dependencies: React 19, React Router 7, Recharts 3, react-hot-toast, lucide-react (icon set for the live UI), MUI 9 + Emotion (styling for the unused/legacy tree), Axios (only used by the legacy `alertsApi.ts`).
Dev dependencies: Vite 8, Vitest 3 + `@vitest/coverage-v8`, Testing Library (React + jest-dom + user-event), ESLint 10 + typescript-eslint 8, `babel-plugin-react-compiler` (React Compiler enabled via Babel — an experimental optimization).

Existing frontend tests: `RulesPage.test.tsx`, `TransactionsPage.test.tsx`, `api/client.test.ts`, `utils/format.test.ts` — note the page-level tests exercise the **unused** router-based pages, not the live `App.tsx` tab content, so they don't actually protect the code path real users hit.

---

*Continue to **Part 3** for concrete end-to-end user stories and a suggested customer demo script, and **Part 4** for the `feature/cicd-docker-jenkins` branch (Docker + Jenkins CI/CD) analysis.*

