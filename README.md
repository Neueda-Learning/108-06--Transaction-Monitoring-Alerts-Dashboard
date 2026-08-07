# Transaction Monitoring & Alerts Dashboard

A full-stack **AML / fraud transaction monitoring platform** for training and demonstration. The system ingests financial transactions, screens them against a sanctions-style list and configurable monitoring rules, generates alerts with a regulated lifecycle, and provides a React dashboard for analysts and compliance managers—with optional **Google Gemini** AI assistance and a **scenario simulator** for live demos.

Built with **Spring Boot 3.3.2** (Java 17, MySQL) and **React 19** (TypeScript, Vite 8).

---

## Table of Contents

- [What This Application Does](#what-this-application-does)
- [Feature Overview](#feature-overview)
- [How Detection Works](#how-detection-works)
- [Monitoring Rules](#monitoring-rules)
- [Alert Lifecycle](#alert-lifecycle)
- [Dashboard & Analytics](#dashboard--analytics)
- [AI Features](#ai-features)
- [Transaction Simulator](#transaction-simulator)
- [Web UI (Tabs)](#web-ui-tabs)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [REST API Reference](#rest-api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Documentation](#documentation)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)

---

## What This Application Does

This platform supports a **single compliance operator** (no authentication in this training build) who can:

1. **Record transactions** between accounts and payees.
2. **Automatically screen** every payment for sanctions-style name matches and suspicious patterns.
3. **Generate alerts** when rules fire or sanctions hit, with severity and risk scoring.
4. **Triage alerts** through a structured workflow (Open → Acknowledged → Investigating → Closed or Dismissed).
5. **Configure monitoring rules** (thresholds, velocity, new payee, daily limits) without code changes.
6. **View operational dashboards** with KPIs, charts, and optional AI-generated briefings.
7. **Run demo scenarios** that exercise every detection path through the real backend pipeline.

---

## Feature Overview

| Feature | Description |
|---|---|
| **Transaction ingest** | Create and store payments with account, payee, amount, currency, and metadata. |
| **SDN / sanctions screening** | Fuzzy name match against an in-memory sanctions-style list; hits block the payment immediately. |
| **Rule engine** | Four configurable rule types: amount threshold, velocity, new payee, daily cumulative limit. |
| **Risk scoring** | 0–100 score derived from alert severities on each transaction. |
| **Alerts queue** | Filterable, sortable worklist of all detections. |
| **Investigation workspace** | Modal workflow stepper, AI investigate button, status persistence. |
| **Alert notes & history** | API for analyst notes and reconstructed audit timeline from lifecycle timestamps. |
| **Monitoring rules admin** | Full CRUD plus on/off toggle for each rule. |
| **Dashboard** | KPI cards, Recharts visualizations, recent workload, AI summary card. |
| **AI alert investigation** | Gemini-powered plain-English summary and recommendation per alert. |
| **AI dashboard summary** | One-click narrative briefing with insights and prioritized action steps. |
| **Transaction simulator** | Six preset scenarios run through the same detection engine as live traffic. |
| **SDN lookup API** | Standalone fuzzy search against the loaded sanctions list. |
| **Pagination & search (API)** | Paged list endpoints for transactions, alerts, and rules (backend). |

---

## How Detection Works

Every new transaction passes through a **two-phase pipeline** in `TransactionService.createTransaction`:

### Phase 1 — Sanctions screening (hard stop)

- Runs **before** normal rule evaluation.
- Compares `payeeName` against every entry in `src/main/resources/sdn_list.txt` using **Jaro-Winkler** fuzzy matching (`StringSimilarityUtil`), default threshold **85%**.
- **On match:**
  - Transaction saved with status **`BLOCKED`**
  - Risk score set to **`100`**
  - **`CRITICAL`** alert created (`ruleType = SDN_MATCH`, synthetic rule name "SDN Sanctions Screening")
  - Pipeline **stops** — monitoring rules are not evaluated

### Phase 2 — Rule evaluation (pattern detection)

- Runs only if Phase 1 finds no sanctions match.
- Transaction is saved first (required for velocity, new-payee, and daily-limit queries).
- All **active** `MonitoringRule` rows are evaluated via `RuleEvaluationService`.
- For each triggered rule, an **`OPEN`** alert is created.
- Final transaction status:
  - **`FLAGGED`** if one or more rules fired
  - **`APPROVED`** if none fired
- Risk score computed by `RiskScoringService` (severity weights summed, capped at 100).

```
Payment submitted
       │
       ▼
  Sanctions screen ──match──► BLOCKED + CRITICAL alert (stop)
       │
    no match
       │
       ▼
  Save transaction
       │
       ▼
  Evaluate active rules ──hit──► FLAGGED + OPEN alert(s)
       │
    no hit
       │
       ▼
  APPROVED
```

---

## Monitoring Rules

Rules are stored in the `monitoring_rules` table and seeded on first boot if empty (`SeedDataConfig`).

| Rule type | What it detects | Configuration fields |
|---|---|---|
| **AMOUNT_THRESHOLD** | Single payment exceeds a limit | `amountThreshold` |
| **VELOCITY** | Too many payments from one account in a time window | `velocityCount`, `velocityWindowMinutes` |
| **NEW_PAYEE** | First payment from an account to a given payee | *(none — inferred from history)* |
| **DAILY_LIMIT** | Cumulative account spend in one UTC calendar day exceeds limit | `dailyLimit` |

**Default seeded rules (first boot):**

| Name | Type | Threshold |
|---|---|---|
| High Amount > 10000 | AMOUNT_THRESHOLD | $10,000 |
| Velocity > 5 in 10 min | VELOCITY | 5 txns / 10 minutes |
| New Payee | NEW_PAYEE | — |
| Daily Limit > 50000 | DAILY_LIMIT | $50,000 |

Rules can be **toggled off** (`active = false`); inactive rules are skipped during evaluation. Existing alerts from past runs are not removed.

---

## Alert Lifecycle

Alerts follow a validated state machine (`AlertService.validateTransition`):

```
OPEN ──────────► ACKNOWLEDGED ──────────► INVESTIGATING ──────────► CLOSED
  │                    │                         │
  └──── DISMISSED ◄────┴──── DISMISSED ◄─────────┘
```

| Status | Meaning |
|---|---|
| **OPEN** | Generated, not yet reviewed |
| **ACKNOWLEDGED** | Seen by an operator |
| **INVESTIGATING** | Active investigation in progress |
| **CLOSED** | Investigation complete (resolved or confirmed legitimate) |
| **DISMISSED** | False positive or no action required |

Each transition records a timestamp (`acknowledgedAt`, `investigatingAt`, `closedAt`, `dismissedAt`). `GET /api/alerts/{id}/history` reconstructs a chronological audit trail from these fields.

**Severity levels:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

---

## Dashboard & Analytics

**Backend:** `GET /api/dashboard/stats` returns aggregated KPIs for a configurable time window (default: last 24 hours):

- Transaction counts and volume (total and in-window)
- Flagged/blocked rate
- Alert counts by status, severity, and rule type
- Average alert resolution time (hours)
- Active rule counts

**Frontend (Dashboard tab):**

- KPI cards: total transactions, high-severity alerts, monitored volume, active rules
- Charts (Recharts): transactions by time bucket, severity breakdown, lifecycle pie, alerts by rule type
- Recent alerts workload table with quick **Investigate** action
- **AI Dashboard Summary** card — generate, copy, or download a briefing

---

## AI Features

Requires the **`GEMINI_API_KEY`** environment variable. Uses Google Gemini REST API via `GeminiClient` (no Google SDK).

### Alert investigation — `POST /api/alerts/{id}/ai-investigate`

- Gathers alert, linked transaction, recent account history, and SDN re-check
- Sends a structured prompt to Gemini; returns risk level, summary, recommendation, and key findings
- Invoked from the **Investigation Workspace** in the Alerts tab

### Dashboard summary — `POST /api/dashboard/ai-summary`

- Combines live dashboard stats with open CRITICAL/HIGH/MEDIUM alerts
- Returns narrative, insight bullets, and prioritized action steps
- Frontend falls back to a **local heuristic summary** if the API is unavailable (labeled `local-heuristic`)

### Deterministic investigation — `POST /api/alerts/{id}/investigate`

- Non-AI template-based findings (used as baseline for the AI agent)
- Optional persistence to `lifecycleNote`

---

## Transaction Simulator

**Purpose:** Generate realistic demo traffic through the **same** `TransactionService` pipeline—no mocked front-end data.

**API:** `GET /api/simulator/scenarios`, `POST /api/simulator/scenarios/{scenario}`

| Scenario key | UI button label | What it demonstrates |
|---|---|---|
| `clean` | Normal Safe Transaction | Low-value payment passes with no alerts |
| `amount-threshold` | High Amount Transaction | Single payment above amount threshold |
| `velocity-burst` | Rapid Velocity Burst (6 txns) | >5 payments in 10 minutes from one account |
| `new-payee` | First-Time New Payee | Payment to a never-seen payee |
| `daily-limit` | Daily Limit Exceeded (6 txns) | Six sub-threshold payments exceeding daily cumulative limit |
| `sdn-match` | OFAC SDN Sanctions Match | Payee "Viktor Petrov" → blocked + CRITICAL alert |

Each run uses fresh random `SIM-ACC-*` / `SIM-PAYEE-*` IDs. Amounts scale dynamically from **currently active** rule thresholds.

---

## Web UI (Tabs)

The live application is a **tabbed SPA** in `frontend/src/App.tsx` (sidebar navigation, not URL routes for main tabs).

| Tab | Features |
|---|---|
| **Dashboard** | KPIs, charts, recent alerts, AI summary generation |
| **Transactions** | Create payment, search/filter/sort ledger, transaction detail modal with linked alerts |
| **Alerts** | Filterable investigation queue, sortable columns, **Open Workspace** investigation dialog |
| **Monitoring Rules** | Create/edit/delete rules, ON/OFF toggle, conditional form fields by rule type |
| **Simulator** | Six scenario buttons, result panel with transactions and alerts tables |

**Additional route:** `/alerts/:id` → MUI-based `AlertDetailsPage` (partially separate API client; prefer main Alerts tab for demos).

**UI capabilities:** dark mode toggle, manual refresh, toast notifications, React Hot Toast.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              React Dashboard (Vite :5173)                │
│   App.tsx tabs │ InvestigationDialog │ DashboardCharts   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP /api/*  (proxied in dev)
┌──────────────────────────▼──────────────────────────────┐
│           Spring Boot REST API (:8080)                   │
│  Controllers → Services → Repositories → MySQL           │
├─────────────────────────────────────────────────────────┤
│  TransactionService  │  RuleEvaluationService          │
│  SdnScreeningService │  RiskScoringService             │
│  AlertService        │  MonitoringRuleService          │
│  DashboardService    │  SimulatorService               │
│  InvestigationAgentService │ DashboardAiSummaryService  │
│  GeminiClient (external HTTP)                           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    MySQL 8                               │
│  transactions │ alerts │ monitoring_rules │ alert_notes  │
└─────────────────────────────────────────────────────────┘
```

**Evaluation model:** Synchronous, in-request rule evaluation (no message queue). Suitable for training/demo scale.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Java 17 |
| Backend framework | Spring Boot 3.3.2, Spring Data JPA, Bean Validation |
| Database | MySQL 8 (H2 in tests) |
| ORM | Hibernate (`ddl-auto=update`) |
| Build | Maven (`mvnw`) |
| Frontend | React 19, TypeScript, Vite 8 |
| Routing | React Router 7 (minimal — main tabs use local state) |
| Charts | Recharts |
| UI components | Custom CSS + MUI (investigation dialog / detail page) |
| Icons | Lucide React |
| AI | Google Gemini REST (`HttpClient`) |
| Tests | JUnit 5, Vitest, Testing Library, JaCoCo |

---

## Quick Start

### Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8.0+
- Maven 3.9+ (or use `./mvnw`)

### 1. Database

```sql
CREATE DATABASE IF NOT EXISTS transaction_management;
```

### 2. Backend (project root)

**Windows (PowerShell):**

```powershell
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your-local-password"
.\mvnw.cmd spring-boot:run
```

**macOS / Linux:**

```bash
export DB_USERNAME=root
export DB_PASSWORD=your-local-password
./mvnw spring-boot:run
```

Backend: [http://localhost:8080](http://localhost:8080)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173) (proxies `/api` → `:8080`)

### 4. AI features (optional)

```powershell
$env:GEMINI_API_KEY = "your-api-key"
```

Restart the backend after setting the key.

**Full setup:** see [SETUP.md](./SETUP.md) and [QUICK_START_WINDOWS.md](./QUICK_START_WINDOWS.md).

---

## Configuration

Key settings in `src/main/resources/application.properties`:

| Property / env var | Purpose |
|---|---|
| `server.port` | API port (default `8080`) |
| `DB_URL` | MySQL JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials |
| `GEMINI_API_KEY` | Required for AI investigate and dashboard summary |
| `GEMINI_API_MODEL` | Gemini model (default `gemini-flash-latest`) |
| `app.cors.allowed-origins` | Frontend origins (default Vite `5173`) |

Local profile override: copy `application-local.properties.example` → `application-local.properties` and run with `--spring.profiles.active=local`.

---

## REST API Reference

Base URL: `http://localhost:8080/api`

### Transactions — `/transactions`

| Method | Path | Description |
|---|---|---|
| `POST` | `/transactions` | Create transaction (full screening pipeline) |
| `GET` | `/transactions/{id}` | Get one transaction |
| `GET` | `/transactions/{id}/rule-results` | All rules with triggered true/false per transaction |
| `GET` | `/transactions` | List with filters: `accountId`, `payeeId`, `status`, `minAmount`, `maxAmount`, `from`, `to` |
| `GET` | `/transactions?page=&size=` | Paged list + `search`, `sortBy` (`TIME_DESC`, `AMOUNT_ASC`, `AMOUNT_DESC`) |

### Alerts — `/alerts`

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts` | List (optional `status`, `severity`) |
| `GET` | `/alerts?page=&size=` | Paged + `search` |
| `GET` | `/alerts/{id}` | Single alert |
| `PATCH` | `/alerts/{id}/status` | Lifecycle transition `{ status, note? }` |
| `GET` | `/alerts/{id}/history` | Reconstructed audit timeline |
| `POST` | `/alerts/{id}/notes` | Add analyst note |
| `POST` | `/alerts/{id}/investigate` | Deterministic investigation summary |
| `POST` | `/alerts/{id}/ai-investigate` | AI investigation (Gemini) |

### Monitoring rules — `/rules`

| Method | Path | Description |
|---|---|---|
| `GET` | `/rules` | List all rules |
| `GET` | `/rules?page=&size=` | Paged + `search` |
| `GET` | `/rules/{id}` | Single rule |
| `POST` | `/rules` | Create rule |
| `PUT` | `/rules/{id}` | Update rule |
| `PATCH` | `/rules/{id}/toggle` | Flip active flag |
| `DELETE` | `/rules/{id}` | Delete rule |

### Dashboard — `/dashboard`

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/stats` | Aggregated KPIs (`from`, `to` optional) |
| `POST` | `/dashboard/ai-summary` | AI narrative briefing |

### SDN screening — `/sdn`

| Method | Path | Description |
|---|---|---|
| `GET` | `/sdn/search?name=&threshold=` | Fuzzy search sanctions list (default threshold 0.80) |
| `GET` | `/sdn/count` | Number of loaded SDN entries |

### Simulator — `/simulator`

| Method | Path | Description |
|---|---|---|
| `GET` | `/simulator/scenarios` | List scenario keys and descriptions |
| `POST` | `/simulator/scenarios/{scenario}` | Run scenario (`clean`, `amount-threshold`, `velocity-burst`, `new-payee`, `daily-limit`, `sdn-match`) |

**Error responses:** JSON with `timestamp`, `status`, `error`, `message` via `GlobalExceptionHandler` (404, 400, 503 for AI failures).

---

## Project Structure

```
.
├── src/main/java/com/fbi/
│   ├── Transaction_Monitoring.java       # Spring Boot entry point
│   ├── config/                           # CORS, seed data
│   ├── controller/                       # 7 REST controllers
│   ├── dto/                              # Request/response records
│   ├── model/                            # JPA entities + enums
│   ├── repository/                       # Spring Data JPA
│   ├── service/                          # Business logic + AI + simulator
│   ├── exception/                        # Global exception handler
│   └── util/StringSimilarityUtil.java    # Jaro-Winkler matcher
├── src/main/resources/
│   ├── application.properties
│   └── sdn_list.txt                      # Sanctions-style list (in-memory)
├── src/test/java/com/fbi/                # Backend unit/integration tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx                       # Live tabbed UI (main product)
│   │   ├── main.tsx                      # Router entry
│   │   ├── api/                          # fetch clients per domain
│   │   ├── components/                   # InvestigationDialog, charts, etc.
│   │   └── pages/                        # AlertDetailsPage (+ unused legacy pages)
│   └── vite.config.ts                    # Dev proxy /api → :8080
├── docs/                                 # Team reference & presenter guides
├── pom.xml
├── SETUP.md
└── README.md
```

---

## Testing

### Backend

```bash
# Windows
.\mvnw.cmd test

# macOS / Linux
./mvnw test
```

Coverage via JaCoCo (see `pom.xml`). Tests use H2 in-memory database.

### Frontend

```bash
cd frontend
npm run test          # single run
npm run test:watch    # watch mode
npm run lint          # ESLint
```

---

## Documentation

| Document | Description |
|---|---|
| [SETUP.md](./SETUP.md) | Detailed local development setup |
| [QUICK_START_WINDOWS.md](./QUICK_START_WINDOWS.md) | Short Windows quick start |
| [docs/FEATURES_AND_CODEBASE_GUIDE.md](./docs/FEATURES_AND_CODEBASE_GUIDE.md) | Feature-by-feature code map for the team |
| [docs/TEAM_REFERENCE_PART1_BACKEND.md](./docs/TEAM_REFERENCE_PART1_BACKEND.md) | Backend deep dive |
| [docs/TEAM_REFERENCE_PART2_FRONTEND.md](./docs/TEAM_REFERENCE_PART2_FRONTEND.md) | Frontend deep dive |
| [docs/TEAM_REFERENCE_PART3_USER_STORIES_DEMO.md](./docs/TEAM_REFERENCE_PART3_USER_STORIES_DEMO.md) | User stories and demo script |
| [docs/CUSTOMER_PRESENTER_BRIEF.md](./docs/CUSTOMER_PRESENTER_BRIEF.md) | Customer-facing presentation guide |
| [transaction_monitoring.md](./transaction_monitoring.md) | Original training project brief |

---

## Known Limitations

This is a **training / demonstration** build. Notable gaps vs a production AML system:

- **No authentication** — single operator assumed; no RBAC or maker-checker
- **Synchronous evaluation** — no Kafka/async processing
- **Static SDN list** — small training dataset, not a live OFAC feed
- **No multi-user assignment** — alerts are not assigned to specific analysts
- **Investigation notes in main UI** — notes in the live Investigation Dialog are client-side only (backend `POST /notes` exists but is not wired from the primary dialog)
- **Dashboard KPI trends** — week-over-week arrows in the UI are placeholders, not real historical analytics
- **No Swagger/OpenAPI** on current `main` (springdoc dependency removed)
- **Legacy unused pages** — `pages/DashboardPage.tsx`, `AlertsPage.tsx`, etc. exist but are not routed; live UI is `App.tsx`

---

## Contributing

1. Create a feature branch from `main`
2. Make changes with tests where appropriate
3. Run `.\mvnw.cmd test` and `cd frontend && npm run test && npm run lint`
4. Open a pull request with a clear description

---

## Troubleshooting

See [SETUP.md — Troubleshooting](./SETUP.md) for common issues (MySQL connection, port conflicts, CORS, missing Gemini key).

**Quick checks:**

| Issue | Fix |
|---|---|
| Backend won't start | Verify MySQL is running and `DB_*` env vars are set |
| Frontend can't reach API | Ensure backend is on `:8080`; Vite proxy is configured in `vite.config.ts` |
| AI buttons fail | Set `GEMINI_API_KEY` and restart backend |
| Empty dashboard | Run a simulator scenario or create a test transaction |

---

**Ready to explore?** Start the backend and frontend, open the **Simulator** tab, run **OFAC SDN Sanctions Match**, then switch to **Alerts** to triage the generated alert.
