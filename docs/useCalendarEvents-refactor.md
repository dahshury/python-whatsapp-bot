# Refactoring Plan: useCalendarEvents

## User Objectives

- **Primary Goal**: Reduce single-hook complexity (SoC/modularity/DRY) for `useCalendarEvents`
- **Specific Requirements**: Follow FSD + DDD + Clean Architecture rules in `.cursor/rules/frontend_structure.mdc`, keep public APIs stable, and keep existing calendar behavior and caching semantics intact
- **Behavioral Changes**: Preserve all existing behavior

## Current State

- File: `app/frontend/features/calendar/hooks/useCalendarEvents.ts`
- Size: ~819 lines (limit for hooks is 150)
- Issues:
  - Monolithic hook mixes data fetching, cache orchestration, derived customer naming, event processing, and local state mutations
  - Pure business logic (normalizers, cache merge routines, processing options, stringification) is embedded inside React effects, making it hard to reuse or unit-test
  - Cache update patterns (prefetch window maintenance, deduping reservations, merging conversations) are repeated and interwoven with hook lifecycle code, creating DRY violations and tight coupling to React Query
  - Hook-specific state (events/actions) lives next to service-level responsibilities (document status, conversation inclusion), obscuring responsibilities and making it difficult to evolve the feature or share logic elsewhere (e.g., data table editor)
- Current behavior:
  - Computes current period range, prefetches surrounding periods, and manages TanStack Query cache invalidation
  - Merges reservations + conversations from cached periods, derives sanitized customer names and document status metadata, and feeds them into `getReservationEventProcessor`
  - Maintains `CalendarEventsState` plus action helpers (`refreshData`, `invalidateCache`, CRUD helpers) for downstream components/widgets

## Proposed Changes

**Refactoring Approach:**

- **Goal-aligned strategy**: Split responsibilities into focused services/hooks so that React-specific logic stays inside a thin `useCalendarEvents` adapter while cache coordination, normalization, and processing live in pure modules that can be reused by other calendar consumers
- **Scope**: Only reorganize the calendar-events data flow (helpers, services, hooks, tests); no backend/API/schema changes and no adjustments to unrelated calendar handlers/widgets
- **Behavioral impact**: All existing state transitions, cache invalidation, and event generation stay the same—only the file layout and dependency boundaries change

**Refactoring Constraints:**

- **Move as-is when possible**: Lift helper functions (`normalizeReservationSlotTime`, `buildReservationKey`, `stableStringify`, processing payload types) verbatim into dedicated lib/service files to avoid regressions
- **Architectural adaptations allowed**: Introduce feature-level services (e.g., `calendar-event-cache.service.ts`, `calendar-event-processing.service.ts`) and supporting hooks (e.g., `useCalendarEventsData`) that encapsulate current logic while honoring Feature-Sliced dependency rules
- **Logic preservation**: Keep reservation merging, customer-name derivation, document status extraction, and event-processor invocation identical; only wrap them in reusable functions
- **Update imports**: Route new modules through the `features/calendar` public API where necessary, ensuring no deep cross-feature imports and keeping dependency flow within the `features` layer

| Step | Description                                                                                                                                                                                                   | Source Lines   | Target Location                                                                | Dependencies     | Change Type                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ | ---------------- | --------------------------- |
| 1    | Extract reservation normalizers (`normalizeReservationSlotTime`, `buildReservationKey`, `stableStringify`)                                                                                                    | 44-137         | `features/calendar/lib/reservation-normalizers.ts`                             | shared libs only | Move as-is                  |
| 2    | Relocate processed payload/types (`ProcessedReservation`, `ProcessedConversation`, payload aliases) into `features/calendar/types/calendar-events.types.ts`                                                   | 65-116         | `features/calendar/types/calendar-events.types.ts`                             | Step 1           | Move as-is                  |
| 3    | Create `calendar-event-cache.service.ts` encapsulating cached period refs, merge logic, and dedupe bookkeeping                                                                                                | 253-375        | `features/calendar/services/calendar-event-cache.service.ts`                   | Steps 1-2        | Move & adapt to service API |
| 4    | Create `calendar-customer-name.service.ts` for sanitized + derived customer names, exposing pure helpers used by multiple contexts                                                                            | 389-468        | `features/calendar/services/calendar-customer-name.service.ts`                 | Steps 1-2        | Move & adapt                |
| 5    | Create `calendar-event-processing.service.ts` handling document status extraction, processing option memoization, payload creation, fingerprinting, and `eventProcessor.generateCalendarEvents` orchestration | 471-665        | `features/calendar/services/calendar-event-processing.service.ts`              | Steps 1-4        | Move & adapt                |
| 6    | Introduce `useCalendarEventsData.ts` hook that composes TanStack queries, sliding window, new cache service, and processing service to return `{events, metadata}` without UI state                           | 198-665        | `features/calendar/hooks/useCalendarEventsData.ts`                             | Steps 1-5        | New hook                    |
| 7    | Add a small `useCalendarEventStateMachine.ts` (or local helper) that centralizes `CalendarEventsState` + action reducers (`add/update/remove`, `refreshData`, `invalidateCache`)                              | 188-817        | `features/calendar/hooks/useCalendarEventStateMachine.ts`                      | Step 6           | New hook/helper             |
| 8    | Rewrite `useCalendarEvents.ts` to become a thin orchestrator: consume `useCalendarEventsData`, wire state-machine helpers, and forward same public API while staying \<150 lines                              | Entire file    | `features/calendar/hooks/useCalendarEvents.ts`                                 | Steps 1-7        | Structural rewrite          |
| 9    | Update hook tests (`hooks/__tests__/useCalendarEvents.test.ts`) and add focused service tests (`services/__tests__/calendar-event-processing.service.test.ts`, etc.) to cover new modules                     | Existing tests | `features/calendar/hooks/__tests__/` & `features/calendar/services/__tests__/` | Steps 3-8        | Test updates                |
| 10   | Refresh public APIs (`features/calendar/hooks/index.ts`, docs) so downstream imports remain stable and document the new structure in `docs/file-analysis.md` or feature README                                | N/A            | Hooks index + docs                                                             | Steps 1-9        | Minor updates               |

## Expected Outcomes

- **Goal metrics**: Reduce `useCalendarEvents.ts` from 819 lines to \<150 lines; add 3 focused services + 1 helper hook with unit tests to increase coverage of cache/processing logic
- **Code organization**: Helpers live under `features/calendar/lib` / `types`, cache + processing logic under `features/calendar/services`, and React-specific orchestration limited to hooks
- **Architectural compliance**: Feature layer depends only on entities/shared using public APIs, and new services/hooks respect FSD inward dependency flow
- **Behavioral validation**: Existing hook tests plus new service tests ensure identical event output, cache behavior, and action side effects

## Verification Steps

- [x] TypeScript compiles (`pnpm tsc --noEmit`) ✅
- [x] Ultracite/biome passes (`npx ultracite check`) ✅
- [x] Updated and new unit tests pass (`pnpm test useCalendarEvents` or relevant suite) ✅
- [ ] Manual QA: Calendar view still renders events, actions (`refreshData`, CRUD helpers) behave as before
  - See `docs/useCalendarEvents-qa-checklist.md` for detailed verification steps
- [x] Confirm imports respect `@/features/calendar` public API and no circular deps were introduced ✅

## Refactoring Completion Summary

**Status**: ✅ **COMPLETED**

All 10 steps have been successfully executed:

1. ✅ Extracted reservation normalizers to `lib/reservation-normalizers.ts`
1. ✅ Extracted processed payload types to `types/calendar-events.types.ts`
1. ✅ Created `calendar-event-cache.service.ts` with cache merge logic
1. ✅ Created `calendar-customer-name.service.ts` for customer name processing
1. ✅ Created `calendar-event-processing.service.ts` for event processing
1. ✅ Created `useCalendarEventsData.ts` hook for data layer
1. ✅ Created `useCalendarEventStateMachine.ts` hook for state management
1. ✅ Refactored `useCalendarEvents.ts` to 97 lines (orchestrator)
1. ✅ Updated tests to work with new structure
1. ✅ Updated public APIs and documentation

**Results**:

- Original file: 819 lines → Refactored to 97 lines (88% reduction)
- New modules created: 8 files (3 services, 2 libs, 1 types, 2 hooks)
- Public API: Maintained backward compatibility
- Architecture: FSD-compliant with proper separation of concerns
