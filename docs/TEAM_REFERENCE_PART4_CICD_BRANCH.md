# Transaction Monitoring & Alerts Dashboard — Team Reference

## PART 4 of 4: `feature/cicd-docker-jenkins` Branch Analysis

---

## 1. Critical Context: This Branch Is Behind `main`, Not Ahead

Before touching this branch, everyone needs to understand its actual ancestry:

```
git merge-base main origin/feature/cicd-docker-jenkins
→ 1b85521  ("Merge pull request #6 from Neueda-Learning/feature/mcp-ai-agent")
```

The branch was forked **right after the Gemini AI-agent feature was merged**, and only has **2 commits on top of that point**:

```
b93bf88  feat: add docker and jenkins ci/cd pipeline config
59dd88b  fix: chmod mvnw in Jenkins pipeline; make docker-compose host ports overridable
```

Meanwhile, **`main` has moved forward substantially** since that fork point with features this branch does **not** have:
- Pagination (`PagedResponse`, `PaginationControls.tsx`, paged/searchable endpoints for transactions/alerts/rules)
- The **Dashboard AI Summary** feature (`DashboardAiSummaryService`, `AiDashboardSummaryResponse`, `/api/dashboard/ai-summary`)
- The API-docs removal (this branch **still has** `OpenApiConfig.java` and springdoc-openapi — main removed both)
- Various filter/sort UX polish, UI bugfixes, and the backend/frontend test-coverage additions

**Practical consequence**: `git diff main origin/feature/cicd-docker-jenkins --stat` shows a lot of noise that looks like "the CI/CD branch removed a ton of code" (e.g. `AlertService.java | 32 -`, `DashboardAiSummaryService.java | 160 --` entirely deleted, `PaginationControls.tsx | 83 -` deleted) — **this is not real deletion of work**, it's simply that those files/features **don't exist yet** on the older commit the CI/CD branch was forked from. The diff direction is misleading; read it as "what would disappear if we merged this branch instead of rebasing it," not "what this branch's authors intentionally removed."

**Recommendation to the team**: before merging `feature/cicd-docker-jenkins`, someone should `git rebase main` (or merge `main` into it) so the Docker/Jenkins additions apply cleanly on top of the current feature set, then re-test. Merging it as-is today would silently regress `main` by ~5,000 lines of newer feature work.

---

## 2. What This Branch Actually *Adds* (the valuable, additive part)

Ignoring the ancestry noise above, the genuinely new files are:

```
.dockerignore                  (root — excludes target/, logs, .git, frontend/, docs/, *.md from backend image context)
.env.example                   (DB_PASSWORD, GEMINI_API_KEY, BACKEND_HOST_PORT, FRONTEND_HOST_PORT placeholders)
Dockerfile                     (backend image — multi-stage Maven build)
Jenkinsfile                    (CI/CD pipeline definition)
docker-compose.yml             (3-service orchestration: mysql, backend, frontend)
frontend/.dockerignore
frontend/Dockerfile            (frontend image — multi-stage Node build → nginx)
frontend/nginx.conf            (reverse proxy config)
```

Plus small in-place tweaks: `.gitignore` additions, `README.md`/`SETUP.md`/`QUICK_START_WINDOWS.md` mentions, `pom.xml` (some dependency/plugin tweak — likely related to the OpenAPI dependency that still exists on this branch), `application.properties` (Docker-friendly env var defaults).

---

## 3. Backend Dockerfile — Line by Line

```dockerfile
# ---- Build stage ----
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline   # cache deps in their own layer
COPY src src
RUN ./mvnw -B clean package -DskipTests                # tests run separately in CI, not during image build

# ---- Runtime stage ----
FROM eclipse-temurin:17-jre AS runtime                 # smaller JRE-only image for runtime
WORKDIR /app
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring                                     # non-root container — good security practice
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```
**Good practices demonstrated**: multi-stage build (keeps the final image JRE-only, no Maven/JDK bloat), dependency-layer caching (`dependency:go-offline` before copying `src`, so source changes don't invalidate the dependency-download layer), non-root user.

**Gap to flag**: no `HEALTHCHECK` instruction in either Dockerfile — `docker-compose.yml` only has a healthcheck for the `mysql` service, and the `backend` service's `depends_on: mysql: condition: service_healthy` means it waits for MySQL to be ready, but nothing waits for the **backend** itself to be ready before the frontend/nginx starts routing to it (frontend's `depends_on: - backend` is just "container started", not "app actually listening").

---

## 4. Frontend Dockerfile & nginx Reverse Proxy

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`nginx.conf` reverse-proxies same-origin API calls to the backend container:
```nginx
location /api/       { proxy_pass http://backend:8080/api/; ... X-Forwarded-* headers ... }
location /api-docs   { proxy_pass http://backend:8080/api-docs; }
location /swagger-ui { proxy_pass http://backend:8080/swagger-ui; }
location /           { try_files $uri $uri/ /index.html; }   # React Router client-side fallback
```

**Important interaction with the frontend's `client.ts`** (Part 2 §4): since `VITE_API_BASE_URL` is empty by default, `apiRequest()` builds **relative** URLs (`/api/...`) — which is exactly what this nginx proxy expects. This means the Dockerized deployment works **without any CORS configuration at all** in production, because the browser only ever talks to `nginx` on the same origin, and nginx internally forwards to the `backend` container — a deliberate and correct architectural choice noted directly in the nginx.conf comment.

**Stale-proxy gap**: `/api-docs` and `/swagger-ui` are proxied here, but as noted in Part 1 §8, **main has removed the OpenAPI/Swagger dependency entirely**. If this branch is rebased onto current `main`, these two `location` blocks become dead config (harmless, but should be cleaned up in the same rebase pass).

---

## 5. `docker-compose.yml` — Full Service Topology

```yaml
services:
  mysql:            # image: mysql:8.0, persisted volume mysql_data, healthcheck via mysqladmin ping
  backend:          # built from root Dockerfile, waits for mysql healthy, env: DB_URL/DB_USERNAME/DB_PASSWORD/GEMINI_API_KEY/APP_CORS_ALLOWED_ORIGINS
  frontend:         # built from frontend/Dockerfile, depends_on backend, port ${FRONTEND_HOST_PORT:-80}
volumes:
  mysql_data:       # named volume for MySQL persistence across container restarts
```

Port mapping is **host-overridable** (the second, "fix" commit's whole purpose): `BACKEND_HOST_PORT` (default `8081` — deliberately *not* `8080`, to avoid clashing with Jenkins itself if Jenkins runs on the same host on port 8080) and `FRONTEND_HOST_PORT` (default `80`).

`.env.example` documents exactly these variables:
```
DB_PASSWORD=changeme
GEMINI_API_KEY=changeme
BACKEND_HOST_PORT=8081
FRONTEND_HOST_PORT=80
```
Real `.env` is gitignored — never commit actual secrets.

**Note for local Windows dev**: `docker-compose` here is unrelated to the `mvnw.cmd`/`npm run dev` local dev flow documented in `SETUP.md` — this compose stack is meant for a **production-like, one-command deployment** (`docker compose up -d`), not for day-to-day local development (no hot-reload, full rebuild needed per change).

---

## 6. `Jenkinsfile` — CI/CD Pipeline Breakdown

```groovy
pipeline {
  agent any
  triggers { pollSCM('') }   // relies on webhook or SCM polling to trigger on push/merge to main

  environment {
    DB_PASSWORD    = credentials('transaction-monitoring-db-password')   // Jenkins credential IDs
    GEMINI_API_KEY = credentials('transaction-monitoring-gemini-api-key')
  }

  stages {
    Checkout            → checkout scm; chmod +x mvnw
    Backend: Test       → ./mvnw -B clean test              # runs full JUnit suite incl. JaCoCo instrumentation
    Backend: Build      → ./mvnw -B package -DskipTests     # tests already ran above, don't re-run
    Frontend: Install & Test →
        npm ci
        npx tsc -b --noEmit    # type-check without emitting — fails the build on TS errors
        npm run test           # Vitest run
    Frontend: Build     → npm run build
    Docker: Build Images → docker compose build
    Deploy (branch=='main' only) → docker compose up -d
  }

  post {
    always  { junit testResults: 'target/surefire-reports/*.xml', allowEmptyResults: true }
    failure { echo 'Pipeline failed - check console output for details.' }
  }
}
```

**Design points worth explaining to the team**:
- **Two required Jenkins credential IDs** must exist on the Jenkins server before this pipeline can run: `transaction-monitoring-db-password` and `transaction-monitoring-gemini-api-key` (Secret Text credentials). Without these configured in Jenkins → **Manage Jenkins → Credentials**, the pipeline fails immediately at the `environment{}` block.
- **`Deploy` stage is gated to `branch 'main'`** — feature-branch builds run tests + build images (validating buildability) but never actually run `docker compose up -d` against the shared/demo environment; only merges to `main` deploy.
- **JUnit report publishing** (`post { always { junit ... } }`) surfaces backend test pass/fail counts directly in the Jenkins UI/trend graphs, sourced from Surefire's XML output (the same files already visible locally in `target/surefire-reports/`).
- **No frontend coverage gate and no JaCoCo coverage threshold enforcement** — coverage tooling exists (JaCoCo + `@vitest/coverage-v8`) but nothing in this pipeline currently *fails the build* if coverage drops; it's purely descriptive today. Worth a future improvement if the team wants coverage gates.
- **`pollSCM('')`** with an empty cron expression is unusual — it means "the trigger exists but has no schedule," which typically only makes sense if a **webhook** (e.g., GitHub push webhook hitting Jenkins) is separately configured to notify Jenkins of new commits; the empty `pollSCM` is likely a placeholder to satisfy pipeline syntax while relying on the webhook as the real trigger mechanism. Confirm this is actually wired up on the Jenkins server, not just declared in code.

---

## 7. Recommended Next Steps for the Team

1. **Rebase `feature/cicd-docker-jenkins` onto current `main`** before merging, to avoid regressing the pagination, AI-dashboard-summary, and test-coverage work that's landed on `main` since this branch forked. Re-run the full pipeline afterward.
2. **Remove or update the now-stale OpenAPI/Swagger references** (`OpenApiConfig.java`, the `pom.xml` springdoc dependency, and the two swagger `location` blocks in `frontend/nginx.conf`) to match main's decision to drop Swagger — unless the team wants to *restore* Swagger instead, in which case do that consciously rather than by accident during rebase conflict resolution.
3. **Add a backend `HEALTHCHECK`** (e.g., hit `/api/dashboard/stats` or a dedicated Spring Actuator `/actuator/health` endpoint — note Actuator isn't currently a dependency) and make the frontend/nginx container's `depends_on` condition-aware, so the proxy doesn't briefly serve 502s while the backend JVM is still starting.
4. **Confirm the two required Jenkins credential IDs exist** on whatever Jenkins server will run this pipeline, and confirm the GitHub webhook (or equivalent) that's expected to satisfy the `pollSCM('')` trigger is actually configured.
5. **Decide the fate of the parallel unused frontend pages** (Part 2 §1) before or alongside this merge — shipping unused MUI + Axios + mock-data code paths into a production Docker image is unnecessary bundle weight once the CI/CD pipeline starts actually deploying real builds.
6. Consider adding a coverage threshold check to the Jenkins pipeline (JaCoCo `check` goal / a Vitest coverage minimum) now that both tools are already wired in, so coverage regressions actually block the pipeline rather than just being visible after the fact.

---

*This completes the 4-part deep dive. Recap: Part 1 = Backend, Part 2 = Frontend, Part 3 = User Stories & Demo Script, Part 4 = CI/CD Branch Analysis (this document).*

