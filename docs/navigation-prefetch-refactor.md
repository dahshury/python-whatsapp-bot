# Refactoring Plan: Navigation Prefetch & Caching

## Current State

- File: `app/frontend/widgets/calendar/home-calendar/HomeCalendar.tsx`
  - Size: 605 lines (exceeds the 500-line hard limit)
  - Issues: Controller logic, data orchestration (TanStack Query, dual calendar state), DOM measurement, and view rendering all live in one client component. This prevents reuse, makes suspense boundaries impossible, and keeps the initial bundle heavy despite dynamic imports.

- File: `app/frontend/features/dashboard/dashboard/enhanced-dashboard-view.tsx`
  - Size: 710 lines (exceeds the 500-line hard limit)
  - Issues: Filters, websocket hydration, tab content, chart rendering, and export logic are all colocated. Every chart loads eagerly, so the dashboard chunk remains large even when only the overview is needed. No pre-navigation cache warming.

- File: `app/frontend/widgets/documents/documents-section/DocumentsSection.tsx`
  - Size: 289 lines (dense controller)
  - Issues: Excalidraw canvas, customer grid, and autosave logic initialise immediately. Without deliberate lazy-loading or cache priming, the first visit pays the full setup cost.

- File: `app/frontend/features/navigation/navigation/navigation-links.tsx`
  - Size: 103 lines
  - Issues: Uses raw `next/link` and inconsistent `prefetch` flags, so heavy destinations (`/documents`, `/dashboard`) load cold data and assets, unlike `NextFaster` which eagerly hydrates route data.

- File: `app/frontend/features/navigation/dock-nav-simple.tsx`
  - Size: 467 lines
  - Issues: Shares the same prefetch gap and is close to the 500-line ceiling, mixing navigation wiring, settings popover, and calendar bridge logic.

- File: `app/frontend/shared/libs/backend.ts`
  - Size: 59 lines
  - Issues: `callPythonBackend` always sets `cache: 'no-store'`, preventing reuse in API routes or server components where memoisation is safe.

- File: `app/frontend/app/api/metrics/route.ts`
  - Size: 84 lines
  - Issues: Always forwards to Prometheus with `no-store`, so identical dashboard requests keep hitting the backend.

- Supporting gaps
  - No route-prefetch aggregator (e.g., `/api/prefetch`) like `NextFaster`’s `/api/prefetch-images` to hydrate React Query caches and preload bundles before navigation.
  - No shared link component orchestrating intersection-based router prefetch + data warming.

## Proposed Changes

**Refactoring Constraints:**

- **Move as-is when possible**: Extract exact code blocks verbatim when they fit architecture structure
- **Architectural adaptations allowed**: When architecture requires structural changes, wrap/adapt code while preserving all business logic
  - Create repository interfaces and implement them with existing logic
  - Wrap functions in adapters to match architectural patterns
  - Change call signatures to match interfaces (but keep implementation identical)
  - Split code across layers as required by `@frontend_structure.mdc`
- **No logic changes**: Preserve all conditionals, calculations, data transformations, error handling, and business rules exactly
- **Update imports**: Change import paths to use public APIs and maintain correct dependency flow

| Step | Description                                                                                                                                                                                                          | Source Lines                                       | Target Location                                                                                  | Dependencies                                 | Change Type      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---------------- |
| 1    | Decompose `HomeCalendar` into a controller hook (`useHomeCalendarController`), slim view components, and dedicated `lib` utilities so the widget stays within limits and exposes composable pieces for lazy loading. | 1-605                                              | `widgets/calendar/home-calendar/{controller,ui,lib}/`                                            | Existing calendar hooks, `CalendarContainer` | Refactor & move  |
| 2    | Split `EnhancedDashboardView` into a service/controller layer plus `ui/` components per tab, and wrap chart-heavy pieces with `next/dynamic` to defer large bundles.                                                 | 1-710                                              | `features/dashboard/services/`, `features/dashboard/ui/`                                         | Tabs, chart components, `useDashboardData`   | Refactor & split |
| 3    | Wrap `DocumentsSection` and the new dashboard entry point in `next/dynamic` from the compositions, exposing `.preload()` so navigation prefetch can warm their chunks.                                               | 1-289 (`DocumentsSection`), 1-20 (`DashboardPage`) | `compositions/{documents,dashboard}/`, `widgets/documents/`                                      | Steps 1-2                                    | Update existing  |
| 4    | Introduce cached fetch helper mirroring `NextFaster`’s `unstable_cache` for reusable memoised server reads.                                                                                                          | N/A (new)                                          | `shared/libs/cache/unstable-cache.ts`                                                            | `next/cache`, `react`                        | Add file         |
| 5    | Build `/api/prefetch/[...path]` with per-route resolvers that hydrate React Query keys for `/`, `/documents`, `/dashboard`, etc., using the caching helper and new controllers.                                      | N/A (new)                                          | `app/api/prefetch/[...path]/route.ts`, `app/api/prefetch/resolvers/*.ts`                         | Steps 1-4, feature services                  | Add files        |
| 6    | Extend `callPythonBackend` to accept caching options and export `callPythonBackendCached` for API routes & resolvers.                                                                                                | 19-58                                              | `shared/libs/backend.ts`                                                                         | Step 4                                       | Update existing  |
| 7    | Implement `PrefetchLink` that coordinates router prefetch, `/api/prefetch` calls, React Query hydration, and dynamic import preloads (with a registry).                                                              | N/A (new)                                          | `shared/ui/prefetch-link/`                                                                       | Steps 3 & 5                                  | Add files        |
| 8    | Replace navigation links with `PrefetchLink`, keeping styling intact while enabling hover-based prefetch.                                                                                                            | 25-87                                              | `features/navigation/navigation/navigation-links.tsx`                                            | Step 7                                       | Update existing  |
| 9    | Swap links in `dock-nav-simple.tsx` for the new component and extract the settings popover into its own module to keep the file under 400 lines.                                                                     | 300-467                                            | `features/navigation/dock-nav-simple.tsx`, `features/navigation/navigation/settings-trigger.tsx` | Step 7                                       | Update & extract |
| 10   | Optimise metrics route with the caching helper (`revalidate = 60`, shared cached client) so dashboard prefetches hit warm data.                                                                                      | 48-84                                              | `app/api/metrics/route.ts`                                                                       | Steps 4 & 6                                  | Update existing  |
| 11   | Add a dynamic-import preload registry consumed by both the prefetch API and `PrefetchLink` to warm Excalidraw, dual-cal bundles, and dashboard charts.                                                               | N/A (new)                                          | `shared/libs/prefetch/registry.ts`                                                               | Steps 3, 5, 7                                | Add file         |
| 12   | Cover the new controllers/prefetchers with vitest suites (API resolver contract, dashboard controller shaping).                                                                                                      | N/A (new)                                          | `app/api/prefetch/__tests__/route.test.ts`, `features/dashboard/__tests__/controller.test.ts`    | Steps 2 & 5                                  | Add files        |

## Expected Outcomes

- Calendar and dashboard code comply with file size limits, exposing controller/view boundaries that are easier to test and suspend.
- Navigation uses a shared prefetch pipeline that warms React Query caches, dynamic chunks, and backend metrics before route transitions.
- Documents and dashboard routes load with hydrated data (document snapshot, customer metadata, dashboard stats/metrics) instead of waterfalls.
- Heavy bundles (Excalidraw, dual calendar, charting libs) remain lazily loaded but become instantly available after hover prefetch.
- Backend endpoints benefit from cached reads, matching the warm-cache behaviour demonstrated in the `NextFaster` reference app.
- Navigation surface components stay within recommended file sizes and delegate behaviour to reusable utilities.

## Verification Steps

- [ ] `pnpm tsc --noEmit`
- [ ] `pnpm lint`
- [ ] `pnpm vitest` (or targeted suites for prefetch resolver & dashboard controller)
- [ ] Manual QA: hover `Documents`, `Dashboard`, confirm a single `/api/prefetch/...` call and warm React Query cache before navigation.
- [ ] Manual QA: confirm dashboard metrics endpoint responds with cached data after first hit (inspect response headers).
- [ ] Optional Lighthouse/Web Vitals run comparing navigation TTFB before/after changes.
