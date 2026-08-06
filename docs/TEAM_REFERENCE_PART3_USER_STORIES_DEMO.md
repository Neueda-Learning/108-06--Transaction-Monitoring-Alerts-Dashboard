# Transaction Monitoring & Alerts Dashboard — Team Reference

## PART 3 of 4: User Stories & Customer Demo Script

---

## 1. Personas

| Persona | Goal |
|---|---|
| **Ava, Compliance Analyst** | Reviews alerts daily, triages them through the lifecycle, writes investigation notes, decides escalate vs. dismiss. |
| **Raj, Compliance Manager** | Configures monitoring rules/thresholds, checks the dashboard for team workload and trends. |
| **Prospective Customer / Stakeholder** | Wants to see the platform "in action" in a live demo without needing real transaction data. |

---

## 2. End-to-End User Stories (mapped to actual code paths)

### Story A — "As Ava, I want to log a new transaction so it gets automatically screened."
1. Ava opens the app at `http://localhost:5173` → lands on **Dashboard** tab (`App.tsx`, `activeTab='dashboard'` default).
2. Clicks **Transactions** in the left nav → `setActiveTab('transactions')`.
3. Fills in Account ID, Payee ID, Amount, Currency, Description → clicks **Create Transaction**.
4. Frontend calls `POST /api/transactions` (`createTransaction` in `api/transactions.ts`).
5. Backend (`TransactionService.createTransaction`):
   - Screens payee name against the SDN list (Jaro-Winkler ≥ 0.85). If matched → transaction saved as `BLOCKED`, risk score `100`, a `CRITICAL` alert created immediately, response returned.
   - Otherwise, transaction is saved, then all **active** rules are evaluated (amount threshold / velocity / new payee / daily limit); any triggers create `OPEN` alerts and set transaction status to `FLAGGED`; if none trigger, status is `APPROVED`.
6. New transaction appears at the top of the Ledger table, highlighted green/highlighted row briefly, and the page auto-scrolls to it.
7. If any alert was created, Ava can immediately switch to the **Alerts** tab and see it in the Investigation Queue.

### Story B — "As Ava, I want to investigate and resolve an open alert."
1. Ava clicks **Alerts** tab, optionally filters by Severity=`HIGH` or Status=`OPEN`.
2. Clicks **"Open Workspace"** on a row → `InvestigationDialog` opens (`openInvestigateDialog(alertId)`).
3. Reviews the Workflow stepper — sees current status highlighted.
4. Clicks **"Investigate with AI"** → `POST /api/alerts/{id}/ai-investigate` → Gemini returns a Risk Level, Summary, and Recommendation, rendered inline within a couple of seconds (assuming `GEMINI_API_KEY` is configured).
5. Based on the AI recommendation, Ava clicks the next workflow step button, e.g. **Acknowledge** → staged locally (`pendingAlertStatus`).
6. Ava optionally adds an investigation note (⚠️ **currently client-side-only, not persisted to the backend** — see Part 2 §2.6 caveat).
7. Clicks **"Save Investigation"** → `PATCH /api/alerts/{id}/status` persists the new status; toast confirms; dialog closes; alert list refreshes.
8. Repeats for Investigating → Closed, or short-circuits to Dismissed at any point if it's a false positive.

### Story C — "As Raj, I want to tune a monitoring rule's threshold."
1. Raj opens **Monitoring Rules** tab.
2. Clicks **Edit** on "High Amount > 10000" → form populates.
3. Changes Amount Limit to `25000`, clicks **Update Rule** → `PUT /api/rules/{id}`.
4. Toggles a rule OFF via the ON/OFF switch → effectively a `PUT` with `active:false` — that rule is excluded from all future `RuleEvaluationService` evaluations (but existing alerts already created remain untouched).

### Story D — "As Raj, I want a one-click narrative of what's happening right now."
1. Raj is on the Dashboard tab, clicks **"Generate Summary"** in the AI Dashboard Summary card.
2. `POST /api/dashboard/ai-summary` gathers live stats + open CRITICAL/HIGH/MEDIUM alerts and asks Gemini for a narrative + insights + prioritized action steps referencing specific Alert IDs/accounts.
3. If the AI call fails (e.g. missing API key in this environment), the UI transparently falls back to a locally-computed heuristic summary labeled `local-heuristic`, so the demo never shows a dead card.
4. Raj can Copy or Download the summary as a `.txt` file for a stand-up meeting.

### Story E — "As a prospective customer, I want to see every rule type fire without waiting for real data."
1. Open the **Simulator** tab.
2. Click each of the 6 scenario buttons in turn (Normal / High Amount / Velocity Burst / New Payee / Daily Limit / OFAC SDN Match).
3. Each click runs real backend logic (`POST /api/simulator/scenarios/{scenario}`) — not canned front-end data — creating real transactions and alerts you can then go find in the Transactions/Alerts tabs.
4. The result panel shows exactly which transactions were created and which alerts fired, with full detail (risk score, severity, message).

---

## 3. Suggested Customer Demo Script (≈12–15 minutes)

> Goal: show the platform detects risk automatically, gives analysts a fast triage workflow, and adds an AI assist layer — without needing to explain database internals.

**0. Setup (before the call)**
- Have the backend + frontend running (`mvnw.cmd spring-boot:run` + `cd frontend && npm run dev`), `GEMINI_API_KEY` set so the AI features work live.
- Optionally pre-run the `sdn-match` and `velocity-burst` scenarios once so the Dashboard has non-zero numbers to show at the very start.

**1. Dashboard (2 min)**
- "This is the compliance team's home screen — total transactions monitored, high-risk alerts, monitored volume, and active rule count, plus a live breakdown of alerts by severity, lifecycle stage, and which rule detected them."
- Click **Generate Summary** — "and if we want a plain-English briefing of what's going on right now, one click gives us an AI-generated narrative with prioritized next actions, referencing the actual alert IDs."

**2. Simulator — the "magic trick" (4 min)**
- "Rather than typing in test data, we have a simulator that runs realistic scenarios through the exact same detection engine a real transaction would hit."
- Run **OFAC SDN Sanctions Match** — "this transaction is going to a payee whose name matches an entry on the US Treasury's sanctions list — watch it get blocked immediately, before it's even fully processed, with a critical alert." (Show the result panel: transaction status `BLOCKED`, alert severity `CRITICAL`.)
- Run **Daily Limit Exceeded** — "here we simulate six smaller transactions that individually look fine, but cumulatively bust the account's daily limit — this is exactly the kind of structuring pattern regulators expect us to catch."

**3. Alerts triage workflow (4 min)**
- Switch to **Alerts** tab — "everything the engine caught lands here as a prioritized queue. I can filter by severity or status, sort by any column."
- Open one alert → **Investigation Dialog** — walk through the status stepper, click **Investigate with AI** — "in seconds, we get a plain-English summary of the transaction context and a clear recommendation — escalate, or close as a false positive."
- Advance the status to Acknowledged → Investigating → Closed (or Dismiss) and **Save Investigation** — "every transition is timestamped and forms a full audit trail for regulators."

**4. Rules configuration (2 min)**
- Switch to **Monitoring Rules** — "compliance managers can tune every threshold without touching code: amount limits, transaction velocity, new-payee detection, daily cumulative limits — and toggle any rule on or off instantly."

**5. Wrap-up (1 min)**
- "Everything you just saw — the sanctions screening, the rule engine, the AI investigation — runs against a real Spring Boot backend with a real MySQL database. The simulator just gives us realistic data to demo without waiting for live traffic."

### Things to proactively **not** claim during a demo (internal honesty notes)
- The "week-over-week" trend arrows on the Dashboard KPI cards are **not real historical data** — they're placeholder deltas. Don't imply they're computed from real trend history.
- The "Total Monitored Volume" card is hardcoded to display in **GBP** regardless of the transactions' actual currencies — a display bug, avoid zooming in on it.
- Notes added inside the Investigation dialog are **not currently persisted** to the backend (client-side only in the live `App.tsx` flow) — avoid promising "notes are saved forever" unless this is fixed first.
- Don't deep-link to `/alerts/{id}` directly during a live demo unless `VITE_USE_MOCK=true` is set — that page's Close/Dismiss buttons call backend routes that don't exist yet (see Part 2 §3) and will throw a visible error.
- Swagger/OpenAPI (`/swagger-ui.html`) is **not available** on current `main` (dependency removed) — don't promise interactive API docs unless that's restored.

---

*Continue to **Part 4** for the `feature/cicd-docker-jenkins` branch analysis — Docker images, docker-compose, and the Jenkins pipeline.*

