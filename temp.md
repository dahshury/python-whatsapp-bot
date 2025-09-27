## Frontend Architecture Improvement Plan (Next.js App)

### Scope and objectives

- Align the Next.js frontend with proven production-grade patterns (DDD, modular monorepo thinking, dependency inversion, feature-first structure).
- Remove anti-patterns that create instability and maintenance risk (provider soup, window globals, duplicated transport logic, mixed responsibilities).
- Prepare the app for safe, incremental refactors with clear rollback points and end-to-end observability.

### Key findings (design pattern violations and risks)

- Provider soup in `app/layout.tsx` wraps the entire app with many contexts; providers with route-specific scope should be moved closer to their routes to reduce hydration cost and surface area.
- Mixed transport concerns: WebSocket lifecycle duplicated across `hooks/useWebSocketData.ts`, window bootstrap script, and `lib/services/websocket/websocket.service.ts`. Also direct fetch calls coexist with `lib/backend.ts` helpers → fragmentation and inconsistent error handling.
- Global window state (`window.__wsInstance`, `globalThis.__wsConnection`) to coordinate WebSocket access breaks encapsulation and makes behavior environment-dependent (HMR/StrictMode). Replace with a single gateway singleton and React context boundary.
- Large, monolithic components (e.g., `components/dashboard/enhanced-dashboard-view.tsx` ~600+ lines) mixing UI, state, and domain logic → hinders testability and reuse.
- Feature logic scattered across `components/`, `hooks/`, and `lib/` without consistent co-location. Example: calendar operations live in `lib/calendar-event-handlers.ts` while UI is under `components/`.
- Theming has multiple bridges (`ThemeProvider`, `UiThemeBridge`, `SpacemanThemeBridge`) and many theme CSS files; acceptable, but the authoritative theme state should be singular with bridges acting as adapters only.
- Direct DOM/bootstrap scripts injected in `<head>` for WebSocket pre-connection. This is brittle and should be replaced by a proper React-managed initialization with SSR-safe guards.
- Debug logging (`console.log` with emojis) sprinkled across runtime code without levels or environment gating; noisy in production and may leak data.
- Routing/providers not using Next.js route groups to scope data providers only where needed.
- Preconnect link to `http://localhost:8000` in `app/layout.tsx` may be fine for local workflows, but should be dev-gated to avoid CSP/connect-src mismatches and unnecessary DNS/TCP in prod.
- Backend base resolution splits across places; mandate a single client. Maintain the local-hardcoded backend convention and avoid production IPs per project preference [[memory:8680273]].

— UI/components/hooks/registry/styles focused findings —

- UI primitives are large in a few cases (`ui/sidebar.tsx` ~428 lines, `ui/chart.tsx` ~397 lines, `ui/dropdown-menu.tsx` ~249 lines, `ui/scroll-area.tsx` ~252 lines, `ui/date-range-with-presets.tsx` ~211 lines). Action: split into primitives vs. composition; keep primitives stateless and small, move composition into `shared/components`.
- `components/dual-calendar.tsx` (~823 lines), `components/data-table-editor.tsx` (~847 lines), `components/app-sidebar.tsx` (~689 lines), `components/notifications-button.tsx` (~763 lines), and `components/calendar-core.tsx` (~1175 lines) are monoliths. Action: extract hooks (state/effects), services (domain ops), and pure presentational subcomponents; enforce <300 LOC per file target.
- Hooks use direct `fetch` to `/api/*` (`useDocumentScene.ts`, `useDocumentCustomerRow.ts`) bypassing `lib/backend.ts` and planned `services/http`. Action: route through `http-client.ts` endpoint wrappers and unify errors/loading.
- Web/DOM access scattered (`window`, `document`, `visualViewport`) across components and hooks, including portals and global listeners. Action: wrap in isomorphic utilities with SSR guards; centralize viewport sizing and fullscreen helpers in `shared/utils/dom/*`.
- `components/ui/chart.tsx` contains CSS selector overrides including color strokes for Recharts via attribute selectors. Ensure all chart colors use the global theme tokens rather than magic values [[memory:8678269]].
- `styles/` includes many fullcalendar/theme CSS files; ensure tokenization and variables flow from the single theme authority to avoid drift. Where needed, replace raw hex with CSS variables from theme files.
- `registry/` present, but no direct imports into features beyond bridges; ensure registry exposure only for demo or lazy component loading; production components should import from `shared/ui`.
- `ui/phone-combobox.tsx` (~525 lines) and `ui/sidebar.tsx` store extra feature logic; action: move feature logic to `features/documents` and `features/chat` as appropriate, keeping UI generic.

### Target folder structure (feature-first, DDD-inspired)

```text
app/
  (app-shell)/
    layout.tsx              # minimal global shell + AppProviders
    page.tsx                # home
  (dashboard)/
    layout.tsx              # dashboard-scoped providers
    page.tsx
  (documents)/
    layout.tsx              # documents-scoped providers
    page.tsx
  api/                      # Next route handlers (proxies, auth, metrics)

features/
  calendar/
    components/
    hooks/
    services/
    state/
    utils/
  dashboard/
    components/
    hooks/
    services/
    state/
  documents/
    components/
    hooks/
    services/
    state/
  chat/
    components/
    services/

shared/
  ui/                       # design system + primitives (ex-shadcn)
  components/               # cross-feature composites (sidebar, toolbars)
  hooks/
  utils/
  constants/
  providers/                # AppProviders and infra contexts
  theme/
  styles/

services/
  http/
    http-client.ts          # fetch wrapper, interceptors, JSON parsing
    endpoints/              # typed endpoint functions
  realtime/
    realtime.gateway.ts     # single WS lifecycle + send/ack
    message-bus.ts          # typed event emitter
  storage/
    local-storage.ts

types/
  domain/                   # Reservation, Conversation, Vacation, etc.
  dto/                      # request/response payload shapes (zod/ts)

vendor/
  data-grid/                # moved from components/glide_custom_cells/*

tests/
  e2e/ unit/ integration/
```

Mapping from current → target (non-exhaustive):

- `components/glide_custom_cells/*` → `vendor/data-grid/*` (or `features/documents/vendor/*` if documents-only).
- `components/dashboard/*` and `components/dashboard-view.tsx` → `features/dashboard/*`.
- `components/calendar-*.tsx`, `lib/calendar-*.ts` → `features/calendar/*`.
- `components/documents/*`, `lib/documents/*` → `features/documents/*`.
- `hooks/*` → co-locate under `features/*/hooks` or `shared/hooks` if generic.
- `lib/backend.ts`, `lib/api.ts` → `services/http/*` with typed endpoints.
- `lib/websocket-data-provider.tsx`, `hooks/useWebSocketData.ts`, `lib/ws/*` → `services/realtime/*` + `shared/providers/RealtimeProvider`.
- `lib/language-context.tsx`, `lib/settings-context.tsx`, `lib/vacation-context.tsx`, `lib/customer-data-context.tsx` → `shared/providers/*` (and apply route scoping).

### Cross-cutting implementation standards

- Dependency inversion: UI depends on interfaces (ports); concrete HTTP/WS clients live in `services/*` and are injected via providers.
- Single transport: All HTTP via `http-client.ts`; all WS via `realtime.gateway.ts` with typed messages and an ack/nack helper.
- Strict typing: Export TS types and zod schemas for all requests/responses; centralize in `types/` and `services/http/endpoints/*`.
- Error handling: Uniform `ApiError` with user-safe `message` and internal `code`; map to toasts in a single `ToastService`.
- Logging: Replace scattered logs with `logger.{debug,info,warn,error}` gated by `process.env.NEXT_PUBLIC_LOG_LEVEL`.
- Theming: Keep `next-themes` as the state authority; treat `SpacemanThemeBridge`/`UiThemeBridge` as read-only adapters. No theme state elsewhere.
- Routing/provider scope: Only mount providers where needed using `(route-group)/layout.tsx` to reduce hydration and improve isolation.
- Local backend convention: keep `localhost:8000`/`backend:8000` without production IPs [[memory:8680273]]. Guard any preconnects for `dev` only.

### Phased migration plan with rollback points

1. Infrastructure baseline (safe, no behavioral change)
   - Introduce `services/http/http-client.ts` + typed endpoint wrappers.
   - Introduce `services/realtime/realtime.gateway.ts` (wraps current WS) and a thin `RealtimeProvider` under `shared/providers`.
   - Add `shared/utils/logger.ts` and replace noisy logs behind `LOG_LEVEL`.

2. Transport unification and removal of globals
   - Replace direct `fetch` and `/api/*` calls in features with typed endpoints.
   - Migrate send/ack flows (modify reservation, send message) to `realtime.gateway.ts` and delete window globals (`__wsInstance`, `__wsConnection`).
   - Remove `<head>` bootstrap WS script; initiate WS from `RealtimeProvider` after mount.

3. Provider scoping
   - Create `app/(app-shell)/layout.tsx` as the minimal global shell (theme, error boundary, logger, AppProviders wrapper).
   - Move feature data providers into `app/(dashboard)/layout.tsx` and `app/(documents)/layout.tsx`.

4. Feature colocation and component refactors
   - Move calendar, dashboard, documents, chat artifacts under `features/*`.
   - Split monolith components into container + presentational slices (hooks derive state; components render only props).
   - Extract domain services (e.g., reservation modify) from UI files into `features/*/services`.

5. Hardening and cleanup
   - Add zod validation for all inbound/outbound payloads.
   - Replace debug logs; add error boundaries per route.
   - Remove dead code and old paths; update imports; enforce boundaries with ESLint rules.

### Risk controls

- Incremental PRs gated by e2e smoke (calendar CRUD, conversation send, dashboard charts render) and visual snapshot deltas.
- Rollback via feature flags: keep old WS path behind `NEXT_PUBLIC_REALTIME_LEGACY` for 1 release.
- Add runtime health indicator banner when WS or HTTP degrades (already partially implemented via `BackendConnectionOverlay`).

### Acceptance criteria

- No window globals for WS; single gateway with typed messages.
- Providers are route-scoped; initial HTML reduces unnecessary client contexts.
- All HTTP calls flow through `http-client.ts` with uniform error handling.
- Feature files are co-located; import paths from a feature never reach another feature’s internals (only `shared/*` or service interfaces).
- Large components reduced to <300 LOC; complex logic in hooks/services.

### Implementation checklist (trackable)

|     | Change                                                                                   | Area          | Impact                        | Notes                                                          |
| --- | ---------------------------------------------------------------------------------------- | ------------- | ----------------------------- | -------------------------------------------------------------- |
| [ ] | Create `services/http/http-client.ts` and `endpoints/*`                                  | Transport     | Consistency, retries, logging | Replace `lib/api.ts`, unify `callPythonBackend`                |
| [ ] | Create `services/realtime/realtime.gateway.ts`                                           | Transport     | Single WS lifecycle, ack/nack | Replace `useWebSocketData` connection logic and window globals |
| [ ] | Add `shared/providers/RealtimeProvider.tsx`                                              | Providers     | Controlled WS init            | Mounted only where needed                                      |
| [ ] | Gate debug logs via `shared/utils/logger.ts`                                             | Observability | Clean prod logs               | LOG_LEVEL env gating                                           |
| [ ] | Dev-gate `<link rel="preconnect" href="http://localhost:8000">`                          | Perf          | Avoid prod mismatch           | Keep local workflow intact [[memory:8680273]]                  |
| [ ] | Remove `<head>` WS bootstrap script                                                      | Stability     | SSR-safe init                 | Use provider effect with guards                                |
| [ ] | Replace direct `fetch('/api/...')` in `chat.service.ts`                                  | Transport     | Uniform errors                | Use http endpoints                                             |
| [ ] | Consolidate reservation modify flows                                                     | Calendar      | Less duplication              | Use gateway send+confirm                                       |
| [ ] | Move `lib/calendar-event-handlers.ts` under `features/calendar/services`                 | Calendar      | Encapsulation                 | Export pure helpers and side-effectful actions separately      |
| [ ] | Split `enhanced-dashboard-view.tsx`                                                      | Dashboard     | Testability                   | Container hook + presentational components                     |
| [ ] | Co-locate `hooks/useDocumentScene.ts` under `features/documents/hooks`                   | Documents     | Clarity                       | Remove `/hooks` root                                           |
| [ ] | Move `components/glide_custom_cells/*` to `vendor/data-grid/*`                           | Vendor        | Ownership clarity             | Update aliases in `next.config.mjs`                            |
| [ ] | Move `language-`, `settings-`, `vacation-`, `customer-` contexts to `shared/providers/*` | Providers     | Scope + reuse                 | Route-group mounting                                           |
| [ ] | Introduce zod DTOs for API payloads                                                      | Types         | Runtime safety                | Validate at edges                                              |
| [ ] | Add route-group layouts `(dashboard)` and `(documents)`                                  | Routing       | Provider scoping              | Reduce global provider soup                                    |
| [ ] | ESLint import-boundary rules                                                             | Quality       | Prevent cross-feature imports | e.g., `eslint-plugin-boundaries`                               |
| [ ] | Add thin `ToastService`                                                                  | UX            | Uniform messages              | Map ApiError codes to i18n                                     |
| [ ] | Harden CSP `connect-src`                                                                 | Security      | Principle of least privilege  | Restrict to self + ws(s) localhost dev                         |
| [ ] | Add e2e smoke for calendar, chat, dashboard                                              | QA            | Safe refactor                 | Playwright/Cypress                                             |
| [ ] | Refactor large UI primitives into small primitives + composed components                 | UI            | Maintainability               | Move composition to `shared/components`                        |
| [ ] | Extract DOM helpers (viewport, fullscreen) into `shared/utils/dom/*`                     | Stability     | SSR-safe                      | Replace scattered window/document usage                        |
| [ ] | Route all hooks’ `fetch` calls via `services/http`                                       | Transport     | Consistency                   | Replace direct `/api/*` usage in hooks                         |
| [ ] | Ensure chart color sources use global theme tokens                                       | Theming       | Consistency                   | Replace hex or hardcoded strokes [[memory:8678269]]            |
| [ ] | Limit `registry/*` to demos/docs, keep production imports from `shared/ui`               | Architecture  | Clarity                       | Avoid accidental dependency on registry                        |

### Notes on backend connectivity

- Server-side (route handlers): try `http://backend:8000` then `http://localhost:8000`.
- Client-side: use Next API proxy (`/api/*`) or same-origin when feasible; when direct, prefer host-derived URL with port 8000 and never embed production IPs [[memory:8680273]].

### Next steps

1. Land the baseline `services/http` and `services/realtime` scaffolding.
2. Migrate chat send + reservation modify to the new services.
3. Introduce `(dashboard)` route group and scope providers there.
4. Move documents and calendar into `features/*` with co-located hooks/services.
5. Remove legacy globals/duplicates and enable import-boundary lint rules.
