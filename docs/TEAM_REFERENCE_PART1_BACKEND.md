# Transaction Monitoring & Alerts Dashboard — Team Reference

## PART 1 of 4: Backend Deep Dive (Spring Boot)

> Generated from a full read-through of every backend source file on `main` (commit `76154f2`) after pulling latest changes on 2026-08-06.
> Companion documents:
> - **Part 2** – Frontend Deep Dive
> - **Part 3** – End-to-end User Stories & Customer Demo Script
> - **Part 4** – `feature/cicd-docker-jenkins` Branch Analysis (Docker/Jenkins)

---

## 1. What This Application Is

A single-operator **AML (Anti-Money-Laundering) / Fraud Transaction Monitoring platform**. It lets a compliance analyst:

1. Record ("post") financial transactions between an `accountId` and a `payeeId`.
2. Automatically screen every transaction against a **sanctions list (OFAC SDN)** and a configurable **rule engine** (amount thresholds, velocity, new payee, daily cumulative limits).
3. See generated **Alerts** when a rule fires, triage them through a lifecycle (`OPEN → ACKNOWLEDGED → INVESTIGATING → CLOSED/DISMISSED`), attach analyst notes, and view audit history.
4. Use an **AI assistant (Google Gemini)** to get a natural-language investigation summary/recommendation for any alert, or a narrative summary of the whole dashboard.
5. Run a **Simulator** that generates realistic transaction sequences to demonstrate every rule type without manual data entry — ideal for demos.
6. View a **Dashboard** with KPIs and charts (transaction volume, alert severity/status/rule-type breakdowns).

Tech stack:
- **Backend**: Java 17, Spring Boot 3.3.2, Spring Data JPA (Hibernate), MySQL 8, Bean Validation, JaCoCo for coverage.
- **Frontend**: React 19 + TypeScript, Vite 8, React Router 7, Recharts, MUI (partial), react-hot-toast, Axios (legacy) + native `fetch` (current).
- **AI**: Google Gemini `generateContent` REST API called directly via Java's `HttpClient` (no SDK).

---

## 2. Backend Package Map

```
src/main/java/com/fbi/
├── Transaction_Monitoring.java     # @SpringBootApplication entry point
├── config/
│   ├── CorsConfig.java             # CORS allow-list for the frontend origin(s)
│   └── SeedDataConfig.java         # CommandLineRunner: seeds 4 default rules on first boot
├── controller/                     # 7 REST controllers (all under /api/**)
├── dto/                            # Request/response records (immutable API contracts)
├── model/                          # JPA entities + enums
├── repository/                     # Spring Data JPA repositories (+ Specification support)
├── service/                        # All business logic
├── exception/                      # Custom exceptions + @RestControllerAdvice
└── util/                           # StringSimilarityUtil (Jaro-Winkler fuzzy matcher)
```

---

## 3. Domain Model (JPA Entities)

### 3.1 `MonitoredTransaction` (table `transactions`)
| Field | Type | Notes |
|---|---|---|
| id | Long (identity) | PK |
| accountId | String(64) | Debtor/sender account |
| payeeId | String(64) | Creditor/recipient identifier |
| payeeName | String(255) | Human-readable payee name — this is what gets screened against SDN |
| amount | BigDecimal(19,2) | Transaction amount |
| currency | String(3) | ISO currency code, upper-cased on save |
| occurredAt | Instant | When the transaction happened (defaults to `now()` via `@PrePersist`) |
| description | String(255) | Free text |
| status | enum `TransactionStatus` | `PENDING → APPROVED / FLAGGED / BLOCKED` |
| country | String(64) | Optional destination country |
| riskScore | Integer (0–100) | Computed by `RiskScoringService` |

### 3.2 `Alert` (table `alerts`)
Represents one rule/screening trigger tied to one transaction.
| Field | Notes |
|---|---|
| transactionId, accountId | Denormalized for fast querying without a join |
| ruleId, ruleName, ruleType | Snapshot of the rule that fired (rule 0 = synthetic "SDN Sanctions Screening") |
| severity | `LOW / MEDIUM / HIGH / CRITICAL` |
| status | `AlertStatus`: `OPEN → ACKNOWLEDGED → INVESTIGATING → CLOSED` or `→ DISMISSED` at any pre-terminal step |
| message | Human-readable trigger description |
| lifecycleNote | Last note attached during a status transition or AI investigation |
| createdAt / acknowledgedAt / investigatingAt / closedAt / dismissedAt | Full timestamp trail — powers `getAlertHistory()` |

### 3.3 `MonitoringRule` (table `monitoring_rules`)
Configurable detection rule. One row = one rule.
| Field | Used by |
|---|---|
| name (unique), type (`RuleType`), severity, active | All rule types |
| amountThreshold | `AMOUNT_THRESHOLD` |
| velocityCount, velocityWindowMinutes | `VELOCITY` |
| dailyLimit | `DAILY_LIMIT` |
| *(no fields)* | `NEW_PAYEE` needs no parameters; `SDN_MATCH` is not created via this table — sanctions screening is a separate always-on pipeline phase |

### 3.4 `AlertNote` (table `alert_notes`)
Free-text analyst notes attached to an alert (`POST /api/alerts/{id}/notes`), independent of the lifecycle-transition `note` field.

### 3.5 `SdnEntry` — **not a JPA entity**
A `record` parsed in-memory from `src/main/resources/sdn_list.txt` at startup (`id|name|type|country|remarks` pipe-delimited). Contains real historical OFAC Cuba-program entries plus ~20 synthetic "training" entries (fictional names/entities across Russia/Iran/DPRK/unknown, clearly labelled "Training entry" in remarks) used to make demo scenarios interesting without using real-world sanctioned individuals' names for anything except the handful of authentic Cuba-program entries.

### 3.6 Enums
- `RuleType`: `AMOUNT_THRESHOLD, VELOCITY, NEW_PAYEE, DAILY_LIMIT, SDN_MATCH`
- `Severity`: `LOW, MEDIUM, HIGH, CRITICAL`
- `AlertStatus`: `OPEN, ACKNOWLEDGED, INVESTIGATING, CLOSED, DISMISSED`
- `TransactionStatus`: `PENDING, APPROVED, FLAGGED, BLOCKED`

---

## 4. The Transaction Processing Pipeline (the heart of the system)

`TransactionService.createTransaction(TransactionCreateRequest)` implements a **two-phase pipeline**:

**Phase 1 — Pre-save SDN Screening** (`SdnScreeningService.screen(payeeName)`)
- Runs **before** the transaction is even saved with a normal status.
- Uses **Jaro-Winkler fuzzy string similarity** (`StringSimilarityUtil`) against every entry in the in-memory SDN list, default threshold **0.85 (85%)**.
- If any entry scores ≥ threshold → the transaction is saved immediately with `status = BLOCKED` and `riskScore = 100` (`RiskScoringService.MAX_SCORE`), and a synthetic **CRITICAL** alert is created (`ruleId = 0`, `ruleType = SDN_MATCH`, `ruleName = "SDN Sanctions Screening"`). The method **returns immediately** — Phase 2 never runs for a sanctions hit, because a sanctions match is definitionally the maximum-risk event.

**Phase 2 — Post-save Rule Evaluation** (`RuleEvaluationService.evaluateAndCreateAlerts`)
- Only reached if no SDN match.
- Transaction is saved first (so it has an ID — needed for velocity/new-payee/daily-limit queries that must exclude the row itself).
- Iterates every **active** `MonitoringRule` (`monitoringRuleService.getActiveRules()`) and evaluates:
  - **AMOUNT_THRESHOLD**: `transaction.amount > rule.amountThreshold`
  - **VELOCITY**: count of transactions for the same `accountId` in the last `velocityWindowMinutes` > `velocityCount`
  - **NEW_PAYEE**: no *prior* transaction exists for this `accountId + payeeId` pair (excludes the transaction's own just-inserted row via `AndIdNot` to avoid self-matching due to timestamp rounding)
  - **DAILY_LIMIT**: sum of all transaction amounts for the account within the UTC calendar day > `rule.dailyLimit`
  - **SDN_MATCH**: always `false` here — handled exclusively in Phase 1.
- Every triggered rule creates one `Alert` (status `OPEN`), all persisted in one batch (`alertRepository.saveAll`).
- Transaction status becomes `FLAGGED` if ≥1 alert fired, else `APPROVED`.
- `riskScore` = `RiskScoringService.calculateScore(alerts)`: sums per-severity weights (`LOW=15, MEDIUM=35, HIGH=60, CRITICAL=100`) and caps at 100.

This pipeline is exercised by **6 canned Simulator scenarios** — see §7.

---

## 5. REST API Reference (every endpoint, every parameter)

Base URL: `http://localhost:8080` (dev). All endpoints are under `/api/**` and allow CORS from `http://localhost:5173` / `http://127.0.0.1:5173` by default (`app.cors.allowed-origins`).

### 5.1 Transactions — `TransactionController` (`/api/transactions`)
| Method | Path | Params | Description |
|---|---|---|---|
| POST | `/api/transactions` | Body: `TransactionCreateRequest` | Creates + screens + evaluates a transaction (the full pipeline above). Returns `TransactionResponse`. |
| GET | `/api/transactions/{id}` | — | Fetch one transaction. 404 via `NotFoundException` if missing. |
| GET | `/api/transactions/{id}/rule-results` | — | Returns **every** monitoring rule with `triggered: true/false` and a message — lets the UI show a full rule-evaluation breakdown for a transaction, not just the rules that fired. |
| GET | `/api/transactions` | `accountId, payeeId, status, minAmount, maxAmount, from, to` (all optional) | **Unpaged** list, filtered via JPA `Specification`. Used when no `page`/`size` supplied. |
| GET | `/api/transactions?page=&size=` | Same filters **plus** `search` (free-text across id/accountId/payeeId/payeeName/currency/description/status), `sortBy` (`TIME_DESC` default, `AMOUNT_ASC`, `AMOUNT_DESC`), `page` (0-based), `size` | **Paged** variant — Spring resolves overload by presence of `page`+`size` query params (`@GetMapping(params = {"page","size"})`). Returns `PagedResponse<TransactionResponse>`. |

`TransactionCreateRequest` body:
```json
{
  "accountId": "ACC-001",        // required
  "payeeId": "PAYEE-008",        // required
  "payeeName": "Acme Corp",      // optional, defaults to payeeId if blank
  "amount": 5000.00,             // required, > 0.01
  "currency": "USD",             // required
  "country": "US",               // optional
  "occurredAt": "2026-08-06T10:00:00Z", // optional, defaults to now
  "description": "Invoice payment"       // optional
}
```

### 5.2 Alerts — `AlertController` (`/api/alerts`)
| Method | Path | Params | Description |
|---|---|---|---|
| GET | `/api/alerts` | `status, severity` optional | Unpaged list. |
| GET | `/api/alerts?page=&size=` | `status, severity, search, page, size` | Paged, sorted `createdAt DESC, id DESC`. `search` matches ruleName/ruleType/severity/status/accountId/transactionId/id. |
| GET | `/api/alerts/{id}` | — | Single alert, 404 if missing. |
| PATCH | `/api/alerts/{id}/status` | Body: `{status, note}` | Advances the lifecycle. **Validated state machine** (see below). Sets the matching timestamp field. |
| GET | `/api/alerts/{id}/history` | — | Chronological list of `{status, timestamp, note}` built from the 5 timestamp fields on the entity — a derived audit trail, not a separate audit table. |
| POST | `/api/alerts/{id}/notes` | Body: `{note}` (≤1000 chars, non-blank) | Adds a free-text analyst note (separate from lifecycle notes). Returns `201 Created`. |
| POST | `/api/alerts/{id}/investigate` | Body (optional): `{persistToLifecycleNote}` | **Deterministic** (non-AI) investigation: builds a risk-level + findings summary from the alert/transaction/notes. If `persistToLifecycleNote=true`, writes the summary into `alert.lifecycleNote`. |
| POST | `/api/alerts/{id}/ai-investigate` | — (`AiController`, same base path) | **AI-powered** investigation via Gemini — see §6. |

**Alert status state machine** (`AlertService.validateTransition`):
```
OPEN          → ACKNOWLEDGED | DISMISSED
ACKNOWLEDGED  → INVESTIGATING | DISMISSED
INVESTIGATING → CLOSED | DISMISSED
CLOSED        → (terminal, no transitions allowed)
DISMISSED     → (terminal, no transitions allowed)
Any → OPEN is always rejected (BadRequestException)
```
Invalid transitions return HTTP 400 with a descriptive message via `GlobalExceptionHandler`.

### 5.3 Monitoring Rules — `MonitoringRuleController` (`/api/rules`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/rules` | Unpaged list. |
| GET | `/api/rules?page=&size=` | Paged, `search` (matches name/type/severity/id, plus the literal words "active"/"inactive" toggle a boolean filter), sorted `name ASC, id ASC`. |
| GET | `/api/rules/{id}` | Single rule. |
| POST | `/api/rules` | Create. Body validated: `AMOUNT_THRESHOLD` requires `amountThreshold`; `VELOCITY` requires `velocityCount` + `velocityWindowMinutes`; `DAILY_LIMIT` requires `dailyLimit`. Returns `201`. |
| PUT | `/api/rules/{id}` | Full update (same validation). |
| PATCH | `/api/rules/{id}/toggle` | Flips `active` boolean — used by the UI's ON/OFF switch, no body needed. |
| DELETE | `/api/rules/{id}` | Returns `204`. 404 if rule doesn't exist. |

### 5.4 Dashboard — `DashboardController` (`/api/dashboard`)
| Method | Path | Params | Description |
|---|---|---|---|
| GET | `/api/dashboard/stats` | `from, to` (Instant, optional — default window = last 24h) | Aggregated KPIs: total/window transaction counts & volume, flagged-or-blocked rate, alert counts by status/severity/ruleType, average alert resolution time in hours, rule counts. |
| POST | `/api/dashboard/ai-summary` | — | Generates an AI narrative + insights + prioritized action steps from current stats and open alerts. |

### 5.5 SDN Screening — `SdnController` (`/api/sdn`)
| Method | Path | Params | Description |
|---|---|---|---|
| GET | `/api/sdn/search` | `name` (required), `threshold` (default `0.80`) | Fuzzy-searches the whole SDN list, returns **all** matches ≥ threshold sorted by score descending — useful as a standalone compliance lookup tool, independent of transaction creation. |
| GET | `/api/sdn/count` | — | Number of SDN entries loaded (51 lines in `sdn_list.txt`, minus comments/header = ~44 entries). |

### 5.6 Simulator — `SimulatorController` (`/api/simulator`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/simulator/scenarios` | Lists the 6 scenario keys + human descriptions. |
| POST | `/api/simulator/scenarios/{scenario}` | Runs one scenario end-to-end through the real `TransactionService` (not mocked) and returns every transaction + alert it produced. 400 if the scenario key is unknown. |

### 5.7 AI Investigation — `AiController` (`/api/alerts/{id}/ai-investigate`)
Separate controller class but same `/api/alerts` base path as `AlertController` — Spring merges the mappings. See §6 for the full AI flow.

### 5.8 Error Response Shape
All exceptions funnel through `GlobalExceptionHandler` into a consistent JSON body:
```json
{
  "timestamp": "2026-08-06T10:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Alert not found: 999"
}
```
Mapped exceptions: `NotFoundException→404`, `BadRequestException→400`, `AiServiceException→503`, `MethodArgumentNotValidException→400` (field-level messages joined), `ConstraintViolationException→400`.

---

## 6. AI Features (Google Gemini Integration)

### 6.1 `GeminiClient` — thin HTTP wrapper
- Talks directly to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}` using Java's built-in `java.net.http.HttpClient` — **no Google SDK dependency**.
- `apiKey` comes **only** from the `GEMINI_API_KEY` environment variable (never hardcoded, never logged) — configured via `@Value("${gemini.api.key:}")` which itself reads `${GEMINI_API_KEY:}`.
- Model defaults to `gemini-flash-latest` (overridable via `GEMINI_API_MODEL`).
- `isConfigured()` lets calling services fail fast with a clear `AiServiceException` (→ HTTP 503) instead of a confusing network error when the key is absent — this is exactly what happens if you run the app without ever setting the env var.

### 6.2 `AlertToolService` — read-only "tools" for the AI agent
Mirrors what a human analyst would manually check before deciding on an alert:
- `getRecentTransactionHistory(accountId)` → last 10 transactions, most recent first.
- `checkSdnStatus(payeeName)` → re-runs SDN screening for context.

### 6.3 `InvestigationAgentService` — single-shot AI investigation (`POST /api/alerts/{id}/ai-investigate`)
1. Loads the alert + linked transaction + the **deterministic** baseline investigation (`AlertService.investigateAlert`, not persisted).
2. Pulls the account's recent transaction history and a fresh SDN check via `AlertToolService`.
3. Builds one large text prompt instructing Gemini to respond with **strict JSON**: `{"summary": string, "recommendation": string}`.
4. Sends it in **one single-shot LLM call** (explicitly *not* a multi-turn tool-calling loop — chosen for demo reliability/determinism per the code comments).
5. Parses the JSON response (stripping markdown code fences if present); falls back to treating the raw text as the summary if JSON parsing fails, with recommendation `"Review manually."`.
6. Returns `AiInvestigationResponse{alertId, riskLevel, summary, recommendation, keyFindings, model, generatedAt}` — `riskLevel` and `keyFindings` come from the deterministic baseline, `summary`/`recommendation` come from the LLM.

### 6.4 `DashboardAiSummaryService` — dashboard narrative (`POST /api/dashboard/ai-summary`)
1. Gathers current `DashboardStatsResponse` + all non-closed/dismissed alerts, split into CRITICAL/HIGH/MEDIUM groups (top 5 of each included in the prompt for brevity).
2. One-shot prompt asks Gemini for `{"narrative": string, "insights": string[], "actionSteps": [{"priority","title","details"}]}`.
3. Same JSON-parse-with-fallback pattern as above; on total failure returns the raw text as the narrative with empty insights/steps.
4. **Frontend fallback**: if this endpoint fails entirely (e.g., no API key configured), `App.tsx`'s `generateDashboardSummary()` catches the error and computes a **local heuristic summary** client-side (`buildLocalDashboardSummary`) so the feature never looks completely broken in a demo — it's clearly labeled `model: 'local-heuristic'`.

---

## 7. Simulator Scenarios (for demos)

`SimulatorService` — every scenario uses a fresh randomly-generated `SIM-ACC-XXXXXXXX` / `SIM-PAYEE-XXXXXXXX` id pair so re-runs never collide with each other or manual data.

| Key | What it does | Rule(s) exercised |
|---|---|---|
| `clean` | Seeds a "prior history" coffee-shop transaction 1 day ago, then a small $4.50 transaction to the same payee. | None (demonstrates a clean pass — deliberately pre-seeds history so `NEW_PAYEE` doesn't fire, since a brand-new account's first-ever transaction would otherwise always look "new" by definition) |
| `amount-threshold` | One transaction at **1.5×** the highest active `AMOUNT_THRESHOLD` rule's limit. | `AMOUNT_THRESHOLD` |
| `velocity-burst` | `maxVelocityCount + 1` transactions of $500 each, fired back-to-back. | `VELOCITY` |
| `new-payee` | A single $1,250 transaction to a payee never seen before. | `NEW_PAYEE` |
| `daily-limit` | 6 transactions, each ≈ 1/5 of the highest active `DAILY_LIMIT`, spread 2 hours apart across one UTC day (deliberately spaced so the 10-minute velocity window never spans more than one transaction, keeping this a clean single-rule demo). | `DAILY_LIMIT` |
| `sdn-match` | One transaction to payee name **"Viktor Petrov"** — matches a training SDN entry. | `SDN_MATCH` (blocks immediately) |

All scenario amounts are computed dynamically **relative to whatever the currently active rules are configured to** (via `monitoringRuleService.getActiveRules()`), so if an analyst changes a rule's threshold in the Rules tab, the simulator scenarios stay correctly calibrated.

---

## 8. Configuration Reference (`application.properties`)

```properties
spring.application.name=transaction-monitoring
server.port=8080

# MySQL — all overridable via env vars, sensible local defaults baked in
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/transaction_management?...}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:n3u3da!}

spring.jpa.hibernate.ddl-auto=update      # auto-migrates schema — fine for a training/demo app, NOT for real prod
spring.jpa.show-sql=false
spring.jpa.open-in-view=false             # avoids lazy-loading-in-view anti-pattern

spring.jackson.time-zone=UTC              # all Instants serialize as UTC ISO-8601

springdoc.api-docs.path=/api-docs         # NOTE: springdoc dependency was removed from pom.xml on main
                                           # (see feature/remove-api-docs) — this property is now inert
                                           # on main; Swagger UI is NOT available on main branch.

app.cors.allowed-origins=http://localhost:5173,http://127.0.0.1:5173

gemini.api.key=${GEMINI_API_KEY:}         # MUST be set via env var for AI features to work
gemini.api.model=${GEMINI_API_MODEL:gemini-flash-latest}
gemini.api.url=${GEMINI_API_URL:https://generativelanguage.googleapis.com/v1beta/models}
```

⚠️ **Important gotcha for the team**: `README.md`/`SETUP.md` still advertise `/swagger-ui.html` and `/api-docs`, but the `feature/remove-api-docs` merge into main **deleted the springdoc-openapi dependency and `OpenApiConfig`**. On current `main`, hitting `/swagger-ui.html` will 404. This is stale documentation that should be corrected — flag it in the team meeting.

Local override: copy `application-local.properties.example` → `application-local.properties` and run with `-Dspring-boot.run.profiles=local`.

### 8.1 Default Seed Data (`SeedDataConfig`)
On first boot (only if the `monitoring_rules` table is empty), 4 rules are auto-created and activated:
1. **High Amount > 10000** — `AMOUNT_THRESHOLD`, HIGH, threshold `10000.00`
2. **Velocity > 5 in 10 min** — `VELOCITY`, MEDIUM, count `5` / window `10` min
3. **New Payee** — `NEW_PAYEE`, MEDIUM
4. **Daily Limit > 50000** — `DAILY_LIMIT`, HIGH, limit `50000.00`

---

## 9. Build & Dependencies (`pom.xml`)

- Parent: `spring-boot-starter-parent:3.3.2`, Java 17.
- Dependencies: `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-web`, `mysql-connector-j` (runtime), `h2` (test scope — used by tests instead of a real MySQL instance), `spring-boot-starter-test`.
- **JaCoCo 0.8.12** plugin wired to `prepare-agent` + `report` goals during `test` phase → code coverage reports generated automatically on every `mvnw test`.
- No Lombok — every entity/DTO uses hand-written getters/setters or Java `record`s.

---

## 10. Backend Test Suite

`src/test/java/com/fbi/`:
- `TransactionMonitoringTests.java` — Spring context load smoke test.
- `SimulatorControllerTest.java` — integration test for the simulator endpoints.
- `service/` — unit tests for `SdnScreeningServiceTest` (visible in `target/surefire-reports`), plus (per commit history) `AlertServiceTest`, `MonitoringRuleServiceTest`, `DashboardServiceTest`, `DashboardAiSummaryServiceTest` were added in `test/backend-coverage`.
- `util/StringSimilarityUtilTest.java` — verifies Jaro-Winkler scoring behavior.

Run: `mvnw.cmd test` (Windows) / `./mvnw test`. Coverage report lands in `target/site/jacoco/index.html`.

---

*Continue to **Part 2 (Frontend Deep Dive)** for the React/TypeScript application, component tree, and the important note about two parallel UIs currently in the codebase.*

