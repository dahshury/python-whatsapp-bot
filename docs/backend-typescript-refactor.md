# Refactoring Plan: Backend TypeScript Migration

## User Objectives

- **Primary Goal**: Rewrite the FastAPI backend in TypeScript while adhering to the FSD + DDD + Clean Architecture conventions defined in `@frontend_structure.mdc`.
- **Specific Requirements**:
  - Build a TypeScript backend workspace (Node 20 + pnpm) that mirrors the `shared → entities → features → widgets/pages/app` layering, exposing only public APIs per slice.
  - Prefer mature, external libraries over bespoke code (e.g., `uWebSockets.js` for real-time transport, `nestjs-prisma`/`drizzle-orm` for data access, `bullmq` for job orchestration, `passport-jwt` for auth).
  - Fill current gaps (incomplete authentication, ad-hoc realtime, duplicated business logic) while preserving existing business capabilities (reservations, WhatsApp bot, analytics, scheduler, metrics).
  - Provide clean integration points for the existing Next.js frontend (reuse DTOs, GraphQL/tRPC endpoints, or REST routes) without breaking contracts.
- **Behavioral Changes**: Maintain all observable behavior (WhatsApp workflows, reservation flows, metrics, scheduler) while intentionally hardening auth (refresh tokens, role-based scopes) and replacing ad-hoc realtime with a formal WebSocket transport.

## Current State

- **File**: `app/views.py`

  - **Size**: ~863 lines
  - **Issues**: Single router mixes webhook handling, reservations, customers, conversations, vacations; no modular routers; business logic embedded in endpoints.
  - **Current behavior**: Exposes REST endpoints plus WhatsApp webhook used by the frontend and messaging layer.

- **File**: `app/utils/service_utils.py`

  - **Size**: ~1,170 lines
  - **Issues**: God-module blending reservation queries, customer helpers, date parsing, phone validation, and domain coordination; difficult to test; tight DB coupling.
  - **Current behavior**: Shared helper invoked throughout services and views for reservations, customers, vacation logic, and formatting.

- **File**: `app/utils/realtime.py`

  - **Size**: ~702 lines
  - **Issues**: Home-grown WebSocket manager, manual connection registry, mixed broadcasting, notification persistence, and message routing.
  - **Current behavior**: Provides websocket endpoint used by frontend dashboards for live reservation/conversation updates.

- **Files**: `app/services/domain/*` (e.g., `reservation/reservation_service.py`, `customer/phone_search_service.py`)

  - **Size**: 400–650 lines each
  - **Issues**: Solid DDD intent but large methods, mixed undo logic, manual SQL.
  - **Current behavior**: Houses main business rules for reservations, customers, conversations, notifications.

- **File**: `app/utils/whatsapp_utils.py`

  - **Size**: ~516 lines
  - **Issues**: Mixes WhatsApp Cloud API client calls with LLM orchestration, duplicate detection, and media helpers; in-memory dedupe.
  - **Current behavior**: Sends WhatsApp messages, templates, attachments, and orchestrates responses from OpenAI/Anthropic/Gemini services.

- **Files**: `app/auth/*`

  - **Size**: 50–200 lines each
  - **Issues**: JWT auth implemented in Python only; no alignment with frontend FSD contracts; limited RBAC/refresh flows.
  - **Current behavior**: Guards FastAPI routes via dependency injection.

- **Supporting modules**: `app/config.py`, `app/db.py`, `app/scheduler.py`, `app/metrics.py`, `tests/*.py`

  - **Issues**: Python-specific configuration, database handling, and job scheduling need TS equivalents; testing tied to pytest.

## Proposed Changes

**Refactoring Approach:**

- **Goal-aligned strategy**: Stand up a TypeScript backend that mirrors the existing FSD + DDD layering: `shared/` (pure utilities, config, adapters), `entities/` (domain models, factories, repositories), `features/` (application services, hooks/use-cases), `widgets/pages/app` (transport adapters: REST, WebSocket, schedulers). Extract Python logic verbatim into TS equivalents wherever possible, wrapping with framework glue (NestJS modules or Fastify plugins). Replace bespoke infrastructure with proven libraries (`uWebSockets.js`, `Prisma`, `BullMQ`, `winston`).
- **Scope**: Entire backend (`app/` Python tree) migrates to a new `server/` TypeScript workspace. Frontend code stays untouched but will consume the new backend endpoints. Data schema, env vars, and message contracts remain compatible.
- **Behavioral impact**: Preserve existing workflows (reservation lifecycle, conversation search, WhatsApp messaging, scheduler, metrics). Intentional improvements: stronger authentication (refresh tokens + RBAC), resilient realtime transport, externalized deduplication, structured logging.

**Refactoring Constraints:**

- **Move as-is when possible**: Port Python domain/service logic verbatim into TS domain entities and services before considering optimizations.
- **Architectural adaptations allowed**: Wrap domain logic behind repository interfaces, adapters, and service factories per `@frontend_structure.mdc`. HTTP/WebSocket layers may change signatures to satisfy NestJS/Fastify conventions, but inner business logic stays identical.
- **Logic preservation or intentional changes**: All calculations, validation, and branching from Python must match TS equivalents unless explicitly enhanced (auth hardening, websocket infra). Add test coverage to guarantee parity.
- **Update imports**: Enforce public API barrels per slice. No deep imports; `server/features/reservation` re-export hooks/services; transport layer imports from published indexes only.

| Step | Description                                                                                                                                                                                                        | Source Lines                                                                                                                                               | Target Location                                                                         | Dependencies   | Change Type       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------- | ----------------- |
| 1    | Create `server/` workspace (pnpm package, tsconfig, ultracite, biome) and align linting/testing (Vitest) with repo tooling                                                                                         | `app/` root, `pyproject.toml` (global)                                                                                                                     | `server/` (root), `server/package.json`, `server/tsconfig.json`                         | Node toolchain | New               |
| 2    | Port configuration, env validation, logging, metrics scaffolding using `dotenv`, `zod`, `pino`, `prom-client`                                                                                                      | `app/config.py`, `app/metrics.py` (~200 LOC)                                                                                                               | `server/shared/{config,libs}/`                                                          | Step 1         | Move & adapt      |
| 3    | Recreate database layer via Prisma/Drizzle (schema, repositories, migrations) replacing `app/db.py` and SQL embedded in services                                                                                   | `app/db.py`, `app/services/domain/*`, `app/utils/service_utils.py` (query sections)                                                                        | `server/shared/api` + `server/entities/*/infrastructure`                                | Step 2         | Adapt (ORM)       |
| 4    | Translate reservation domain (entities, factories, services, undo logic) to TS modules per FSD (`entities/reservation`, `features/reservation`)                                                                    | `app/services/domain/reservation/reservation_service.py` (~645 LOC), `app/utils/service_utils.py` (reservation helpers)                                    | `server/entities/reservation/*`, `server/features/reservation/services`                 | Step 3         | Move as-is/adapt  |
| 5    | Translate customer & conversation domains (phone search, conversation history, notifications) with repository/query builders leveraging ORM full-text features (`pg_trgm` analog via Postgres + Prisma extensions) | `app/services/domain/customer/phone_search_service.py` (~454 LOC), `app/services/domain/conversation/*`, `app/utils/service_utils.py` sections             | `server/entities/{customer,conversation}/**`, `server/features/{customer,conversation}` | Step 3         | Move as-is/adapt  |
| 6    | Rebuild WhatsApp + LLM integrations using official/maintained SDKs (`whatsapp-cloud-api`, `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`) and move deduplication to Redis-backed service                   | `app/utils/whatsapp_utils.py`, `app/services/{llm_service,anthropic_service,gemini_service,openai_service}.py`, `app/utils/service_utils.py` (LLM helpers) | `server/features/whatsapp/**`, `server/entities/message/**`                             | Steps 2–5      | Move & enhance    |
| 7    | Implement real-time layer with `uWebSockets.js` (or `@fastify/uws` adapter) plus Redis pub/sub bridging, mapping existing websocket message types to dedicated handlers                                            | `app/utils/realtime.py` (~702 LOC)                                                                                                                         | `server/app/realtime/**`, `server/features/*/hooks`                                     | Steps 2,4,5    | Adapt (new infra) |
| 8    | Design HTTP interface using NestJS (controllers per feature) or Fastify route modules referencing `features/*` services and enforcing DI/scope boundaries; mirror Python endpoints and webhook flows               | `app/views.py`, `app/auth/router.py`, `app/auth/deps.py`                                                                                                   | `server/app/http/{auth,webhook,reservations,...}`                                       | Steps 2–5      | Move as-is/adapt  |
| 9    | Implement authentication & authorization in TS using `passport-jwt` (or NestJS AuthModule) with refresh tokens, role scopes, and integration with frontend tokens                                                  | `app/auth/*`, `app/views.py` guards                                                                                                                        | `server/features/auth/**`, `server/app/http/auth`                                       | Step 8         | Enhance           |
| 10   | Recreate scheduler/worker stack (BullMQ + Redis, or Temporal) for reminders, backups, and LLM batching; port `scheduler.py`, `scripts/run_database_backup.py` logic                                                | `app/scheduler.py`, `app/scripts/*`, `scripts/run_database_backup.py`                                                                                      | `server/app/jobs/**`                                                                    | Steps 2–6      | Adapt             |
| 11   | Port metrics, tracing, and testing: expose Prometheus endpoints, add Vitest suites mirroring pytest coverage, integrate supertest for HTTP and ws for realtime                                                     | `app/metrics.py`, `tests/*.py`, `prometheus/*.yml`                                                                                                         | `server/tests/**`, `server/app/observability`                                           | Steps 1–10     | New               |
| 12   | Replace deployment artifacts (Dockerfile.backend, docker-compose services) with Node-based images, ensuring backward compatibility for ops scripts                                                                 | `Dockerfile.backend`, `docker-compose*.yml`, `run.py`                                                                                                      | `Dockerfile.backend.ts`, `docker-compose*.yml` updates                                  | Steps 1–11     | Adapt             |

## Expected Outcomes

- **Goal metrics**:
  - Python backend replaced with a TypeScript workspace following FSD layering (≥ 1 shared module, ≥ 4 entities, ≥ 5 features, dedicated transport layer).
  - 100% coverage of existing REST/Webhook/WebSocket endpoints with TS controllers plus parity tests.
  - External infra adoption: `uWebSockets.js`, Prisma/Drizzle, Redis (BullMQ + pub/sub), Passport JWT, official WhatsApp + LLM SDKs.
  - Authentication upgraded to include refresh tokens + RBAC; realtime throughput improves via uWS benchmark.
- **Code organization**: Python files become reference-only; new TS files reside under `server/{shared,entities,features,widgets?,pages?,app}` with public `index.ts` barrels. Each domain/service split under 300 LOC as mandated by `@frontend_structure.mdc`.
- **Architectural compliance**: Strict inward dependency flow enforced via path aliases + eslint rules; only public APIs imported across layers; repositories implement interfaces; services consume repositories via DI factories.
- **Behavioral validation**: Snapshot + contract tests ensure WhatsApp flows, reservation CRUD, phone search, scheduler jobs, and metrics behave identically; intentional auth enhancements validated separately.

## Verification Steps

- [ ] `pnpm install && pnpm exec prisma migrate deploy` (or chosen ORM) succeeds.
- [ ] `pnpm run lint` (Ultracite/Biome) passes for `server/**`.
- [ ] `pnpm run test` executes Vitest suites covering domain, services, transports, and realtime handlers.
- [ ] `pnpm run test:e2e` (supertest + ws) validates HTTP/WebSocket parity with Python endpoints.
- [ ] WhatsApp webhook smoke test against Meta sandbox succeeds (signature verification + message flow).
- [ ] Authentication flow verified end-to-end (login, refresh, role-guarded routes) with existing Next.js frontend.
- [ ] Realtime broadcasts validated using `uWebSockets.js` multi-client simulation.
- [ ] Prometheus endpoint scrapes metrics identical to prior implementation.
