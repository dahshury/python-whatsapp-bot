# Refactoring Plan: app/frontend/app/(minimal)/config/page.tsx

## User Objectives

- **Primary Goal**: Restructure the configuration experience to follow Feature-Sliced + DDD boundaries while fixing functional gaps so that configuration changes immediately influence the rest of the app.
- **Specific Requirements**:
  - Reflect updated config values everywhere in the frontend as soon as a save succeeds.
  - Show a proper loading spinner while the config payload is loading.
  - Diagnose why the default phone country selector renders empty and guarantee a valid default selection.
  - Ensure disabled languages (and other toggles) disappear from user-facing settings so the app cannot select unavailable options.
- **Behavioral Changes**: Maintain existing form semantics but intentionally add: (1) optimistic cache refresh + live broadcast so other features reload parameters after saves, (2) spinner-based loading UX, (3) normalization/validation for `default_country_prefix`, and (4) feature consumers (calendar, settings, docs, etc.) filtering options using the persisted config.

## Current State

- File: `app/frontend/app/(minimal)/config/page.tsx`
- Size: 1,426 lines (React component, helper functions, mutable state, and JSX mixed together).
- Issues:
  1. **God component** – all fetch logic, mutation logic, data normalization, and layout live inside one client component, violating the 200-line cap for React files and making reuse impossible.
  1. **Ad-hoc config service** – `useAppConfig` manually caches via module-level state instead of TanStack Query, so there is no cache key to invalidate and no cross-tab syncing.
  1. **Manual deep clones & Partial typing** – cloning arrays/objects by hand (`{ ...config }`) leads to shallow copies and optional fields that can become `undefined`, causing bugs such as missing country codes.
  1. **UI-only spinner** – loading state is a centered string, no shared spinner component, inconsistent with the rest of the design system.
  1. **Country selector bug** – `default_country_prefix` is never validated; backend may return lowercase ISO, calling code (e.g., `"+966"`), or `null`, which the selector can’t resolve so it renders empty.
  1. **Config isn’t wired to features** – `widgets/calendar/CalendarCore.tsx` calls `getBusinessHours(freeRoam)` without passing config, and `useCalendarState`/`calendar-callbacks` never receive config, so working hours, slot durations, and custom ranges never influence the calendar UI.
  1. **Language toggles don’t affect settings** – `GeneralSettings` imports `useAppConfig`, but the cache never invalidates outside the config page, so disabled languages still appear until a full reload.
- Current behavior: The page mounts, calls `useAppConfig` (which fetches `/api/config` once), copies the payload into `formData`, renders three tabs (Calendar, Columns, General) with inline state mutators, and on save issues `fetch('/api/config', { method: 'PUT' })`, clears the module cache, and re-renders.

## Proposed Changes

**Refactoring Approach:**

- **Goal-aligned strategy**: Move configuration logic into a dedicated `entities/app-config` domain + `features/app-config` use case with TanStack Query so we get cache keys, mutations, and invalidation for real-time updates. Break the monolithic UI into reusable sections, add validation/normalization helpers, and propagate config values into calendar/settings/documents widgets.
- **Scope**: Touch the config domain/service hooks, the config page UI, and the downstream consumers (calendar widgets, general settings, docs hooks). Leave unrelated features untouched.
- **Behavioral impact**: Preserve existing editing capabilities but add live cache invalidation, loading spinner, guaranteed default country rendering, and respect for disabled options in consumer UIs.

**Refactoring Constraints:**

- Move business logic into `entities/app-config` (domain/value objects) and `features/app-config` (services/hooks) following `@frontend_structure.mdc`.
- Only adapt logic when architecture requires it; reuse existing helper code (e.g., column editors) where possible.
- Keep API contracts compatible with `app/services/domain/config/config_schemas.py`.
- Use public API barrels (`index.ts`) for all cross-slice imports.

| Step | Description                                                                                                                                                                                       | Source Lines                                                                                                                                                                                                          | Target Location                                                | Dependencies                           | Change Type             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- | ----------------------- |
| 1    | Introduce `AppConfig` domain (entity, value objects for working hours, slot durations, columns, language list, country code normalization) plus repository interface & DTO mapper.                | `page.tsx` helpers 40-360, `@shared/services/config-service` types                                                                                                                                                    | `entities/app-config/{core,types,mapper,value-objects}`        | Shared domain base (`@/shared/domain`) | Adapt to pattern        |
| 2    | Build `entities/app-config/infrastructure` (API adapter, query keys, repository implementation) wrapping `/api/config`.                                                                           | Existing `fetch('/api/config')` usage                                                                                                                                                                                 | `entities/app-config/infrastructure/{api,repository}`          | Step 1                                 | Create interface & impl |
| 3    | Create `features/app-config` use case + service factory with TanStack Query hooks (`useAppConfigQuery`, `useUpdateAppConfig`, `useConfigLiveSync`).                                               | `useAppConfig` hook + `handleSave` logic                                                                                                                                                                              | `features/app-config/{services,hooks}`                         | Steps 1-2, shared query client         | Adapt + new             |
| 4    | Define `AppConfigFormModel` (zod schema or typed mapper) + normalizers (e.g., `deriveCountryCode`, column defaults) and migrate current deep-clone logic into `features/app-config/model`.        | `useEffect` initialization + clone blocks (`initialData`, `savedData`)                                                                                                                                                | `features/app-config/model`                                    | Steps 1-3                              | Adapt logic             |
| 5    | Extract Working Days & Working Hours UI into `features/app-config/ui/working-hours` (with subcomponents for toggles, slot duration overrides, custom ranges) using `react-hook-form` controllers. | `page.tsx` Calendar tab sections (lines ~455-930)                                                                                                                                                                     | `features/app-config/ui/working-hours/*`                       | Step 4                                 | Move & adapt            |
| 6    | Extract Calendar/Documents column editors into `features/app-config/ui/columns` (list component + row editor + metadata editor).                                                                  | `page.tsx` columns tab (~930-1320)                                                                                                                                                                                    | `features/app-config/ui/columns/*`                             | Step 4                                 | Move & adapt            |
| 7    | Extract General tab (default country + languages) into `features/app-config/ui/general`. Add sanitizer for country codes and connect language toggles to shared config store.                     | `page.tsx` lines ~1322-1420                                                                                                                                                                                           | `features/app-config/ui/general/*`                             | Steps 3-4                              | Move & adapt            |
| 8    | Replace manual `isLoading` div with shared `<Spinner>` and wrap each section with skeleton/fallback states.                                                                                       | `page.tsx` lines 404-409                                                                                                                                                                                              | `features/app-config/ui/layout/ConfigPageShell.tsx`            | Step 3                                 | Adapt UI                |
| 9    | Slim `app/(minimal)/config/page.tsx` to a shell that imports `pages/config/ConfigPage` (server component) and renders the new feature composition.                                                | Entire file                                                                                                                                                                                                           | `pages/config/ConfigPage.tsx`, `app/(minimal)/config/page.tsx` | Steps 3-8                              | Move & replace          |
| 10   | Update consumers to honor config (pass `appConfig` into `getBusinessHours` / `getSlotTimes`, filter languages in `GeneralSettings`, share query invalidation).                                    | `widgets/calendar/CalendarCore.tsx`, `features/calendar/hooks/useCalendarState.ts`, `features/settings/settings/general-settings.tsx`, `features/documents/hooks/useDocumentCustomerRow.ts`, `shared/libs/calendar/*` | Same files (feature/shared layers)                             | Steps 1-3                              | Adapt behavior          |

## Expected Outcomes

- **Goal metrics**: Config page file reduced from 1,426 lines to \<150; new modular files (\<200 lines each). Single TanStack Query key (`['app-config']`) powering both fetch & mutate flows with automatic invalidation and optional BroadcastChannel so all tabs stay in sync.
- **Code organization**: Clear `entities/app-config` + `features/app-config` slices with public APIs; config page becomes a composition of feature widgets; shared spinner usage ensures consistent UX.
- **Architectural compliance**: Features import entities via barrels; pages become thin; shared libs remain framework-agnostic; dependency flow respects `shared → entities → features → pages/app`.
- **Behavioral validation**: Saving config triggers `invalidateQueries(['app-config'])` and a `config:updated` broadcast, so calendar & settings recompute immediately; spinner displays while loading; default country always resolves to a valid ISO code; disabled languages/options disappear from UI selectors.

## Verification Steps

- [ ] TypeScript compiles (`pnpm tsc --noEmit`).
- [ ] Biome/lint passes (`pnpm biome check .`).
- [ ] `pnpm test` (or targeted tests for new value objects/hooks) succeeds.
- [ ] `app/(minimal)/config/page.tsx` shrinks below the 200-line React component threshold.
- [ ] Saving config invalidates the `['app-config']` query and downstream consumers observe new values without a reload.
- [ ] Calendar widgets reflect working days/slot durations from config; language dropdown hides disabled locales.
- [ ] Default phone country renders a flag even when backend sends lowercase ISO or calling codes (verified with mocked payloads).
