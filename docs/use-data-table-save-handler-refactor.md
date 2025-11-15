# Refactoring Plan: use-data-table-save-handler.ts

## User Objectives

- **Primary Goal**: Reduce technical debt by splitting the monolithic save handler hook into architecture-aligned slices (per `docs/file-analysis.md`, rank #1 file) while keeping behavior intact.
- **Specific Requirements**:
  - Extract the customer phone/WA ID modification workflow into a dedicated unit without changing its effects on caches, calendar, or chat sidebar state.
  - Separate save orchestration (validation, batching, sequencing) from mutation execution so responsibilities align with FSD + Clean Architecture, improving testability and comprehension.
- **Behavioral Changes**: Preserve all existing behavior—API shape (`{ isSaving, handleSaveChanges }`), toast messaging, timing, cache invalidations, and side-effects must remain identical.

## Current State

- File: `app/frontend/features/data-table/hooks/use-data-table-save-handler.ts`
- Size: ~1,070 LOC (far above the 150-line hook limit)
- Issues:
  - The hook mixes UI state, validation, mutation orchestration, WA ID/customer mutation code, cache management, and calendar synchronization, creating a “god hook”.
  - WA ID modification logic (lines 90-414) performs network calls, cache rekeying, calendar API updates, and chat-store changes inline, making it impossible to reuse or test.
  - `handleSaveChanges` (lines 678-1038) interleaves validation, JSON serialization, cancellation/modification/addition loops, WA ID chaining, and mutation execution, so the save flow is brittle and difficult to reason about.
  - Helper builders (`extractModificationData`, `extractCreationData`, `extractCancellationDataForGrid`) live inside the hook, so the file owns both orchestration and low-level data shaping responsibilities.
- Current behavior: The hook returns `isSaving` and `handleSaveChanges`. Calling `handleSaveChanges` validates the grid, serializes editing state, processes cancellations, modifications (including WA ID changes + calendar updates), additions, refreshes optional customer data, clears editing buffers, and resolves to `true/false` while surfacing localized toasts on error.

## Proposed Changes

**Refactoring Approach:**

- Introduce a dedicated service/use-case layer under `features/data-table/services` to encapsulate save orchestration behind explicit dependency contracts, letting the hook focus on UI concerns.
- Move the WA ID/customer phone mutation workflow into its own service so cache rekeying, calendar sync, and sidebar updates remain intact but live outside the hook.
- Extract the data-table change builders into pure helper modules that the new services can consume without redefining them inside React scope.
- Keep the hook’s public API stable by delegating all heavy logic to the new services through factories created inside the feature boundary.

**Scope**: All edits stay within `features/data-table` (plus docs). No business logic adjustments—pure structural refactor.

**Behavioral impact**: None. Every branch, toast message, cache update, and timing (including `CALENDAR_UPDATE_DELAY_MS`) must be preserved exactly.

**Refactoring Constraints:**

- Move logic verbatim where possible; only wrap it when enforcing architectural boundaries (e.g., service factory, dependency DTOs).
- Remain within the `features/data-table` slice to avoid cross-feature imports (features must not depend on other features per FSD rules).
- Keep TanStack mutation instances and refs injected from the hook; services must not instantiate new mutations.
- Preserve the return type and promise resolution semantics of `handleSaveChanges`.
- Maintain existing error handling/toast messaging and the `reservationDebugLog` calls to avoid changing diagnostics.

| Step | Description                                                                                                                                                                                                             | Source Lines | Target Location                                                                          | Dependencies                                              | Change Type                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| 1    | Define explicit contracts (`DataTableSaveDependencies`, `EditingChangesPayload`, mutation ports) so services receive everything they need without capturing React scope                                                 | 53-88        | `features/data-table/services/data-table-save.types.ts` (exported via services index)    | React, TanStack types, existing props                     | New interface/type module              |
| 2    | Extract the WA ID/customer phone mutation workflow into `createCustomerWaIdModifier`, keeping query-client rekeying, calendar sync, and sidebar updates intact                                                          | 90-414       | `features/data-table/services/customer-waid-modifier.service.ts`                         | QueryClient, calendar refs, sidebar store                 | Move as-is (wrap in service)           |
| 3    | Move `extractModificationData`, `extractCreationData`, and `extractCancellationDataForGrid` into `data-table-change.extractors.ts` so they become pure helpers shared by the service                                    | 423-676      | `features/data-table/services/data-table-change.extractors.ts`                           | FormattingService, shared utils                           | Move as-is                             |
| 4    | Implement `DataTableSaveService` (plus optional factory) that orchestrates validation, editing-state serialization, cancellations, modifications (with WA ID chaining), additions, refreshes, and editing-state cleanup | 678-1038     | `features/data-table/services/data-table-save.service.ts` (and `.factory.ts` if helpful) | Extracted types, mutations, change helpers, WA ID service | Structural extraction/adaptation       |
| 5    | Refactor `useDataTableSaveHandler` to wire TanStack mutations, refs, query client, and callbacks into the new service via `useMemo`/factory, keeping `isSaving` state plus the existing `handleSaveChanges` signature   | Entire hook  | Same file (`hooks/use-data-table-save-handler.ts`)                                       | New services + hooks                                      | Structural rewrite, behavior preserved |
| 6    | Update `features/data-table/services/index.ts` to expose the new services/types and (optionally) add focused unit tests for the WA ID modifier and save service to guard behavior                                       | N/A          | `features/data-table/services/index.ts`, `features/data-table/services/__tests__/`       | Vitest/Jest setup if available                            | New exports/tests                      |

## Expected Outcomes

- `use-data-table-save-handler.ts` shrinks from ~1,070 LOC to well under the 150-line hook guideline, eliminating the god-hook smell.
- WA ID/customer mutation logic becomes a reusable, testable service with explicit dependencies, reducing coupling between chat/sidebar/calendar concerns and the hook.
- Save orchestration is centralized in a service that can be unit tested and reasoned about independently of React, improving maintainability.
- Architectural compliance: hooks (interface adapters) now delegate to services (application layer) while keeping dependencies flow inward per FSD.
- Behavior remains identical—QA can rely on the same toasts, mutation ordering, and calendar side-effects.

## Verification Steps

- [ ] `pnpm tsc --noEmit`
- [ ] `npx biome check app/frontend/features/data-table`
- [ ] (Optional) Run/author service-level unit tests covering WA ID chaining and mutation sequencing
- [ ] Manual end-to-end check: trigger data-table save with deletions, edits (including phone changes), and additions to confirm parity
- [ ] Confirm `useDataTableSaveHandler` export signature/API unchanged and no cross-feature imports were introduced
- [ ] Validate file sizes: hook \<150 LOC, each service/helper under its respective limits, no circular dependencies
