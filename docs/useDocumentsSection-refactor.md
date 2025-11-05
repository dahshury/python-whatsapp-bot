# Refactoring Plan: useDocumentsSection.ts

## Current State

- File: `app/frontend/features/documents/hooks/useDocumentsSection.ts`
- Size: 741 lines
- Issues:
  - Monolithic hook mixes customer sourcing, Excalidraw orchestration, persistence guards, and UI wiring, violating single-responsibility and FSD layering guidance.
  - Document loading resets canvases repeatedly (`setScene`, `setViewerScene`, direct `api.updateScene`) which causes double renders and flicker during waId switches.
  - No promise-based scene handshake; data fetching and canvas hydration happen in separate effect chains, unlike the official Excalidraw example that resolves a single `initialData` promise.
  - Persistence suppression timers and global flags are scattered, hard to reason about, and risk leaking across customer transitions.
  - Viewer synchronization directly mutates imperative API refs in several places, increasing GPU work and diverging from the official example’s single `updateScene` path.

## Proposed Changes

**Refactoring Constraints:**

- **Move as-is when possible**: Extract existing logic verbatim into lower-level modules whenever it already matches the required responsibility boundary.
- **Architectural adaptations allowed**: Introduce adapters/services/hooks to align with Feature-Sliced layers (lib/model) while leaving business logic untouched; apply official example patterns (promise-based loader, `updateScene`) inside these wrappers.
- **No logic changes**: All customer selection, document initialization, and autosave rules must remain identical; only the hosting structures change.
- **Update imports**: Route consumers through feature public APIs and shared libs, eliminating deep imports and keeping dependency flow inward.

| Step | Description                                                                                                                                                     | Source Lines                   | Target Location                                          | Dependencies                                   | Change Type                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| 1    | Extract a promise-driven scene loader that mirrors the official example’s `initialStatePromiseRef`, wrapping our TanStack fetch to resolve once per waId.       | 203-269, 344-377               | `features/documents/lib/scene-loader.ts`                 | `entities/document`, `@/shared/libs/documents` | Create module (new)                       |
| 2    | Add shared React batching utilities (`withBatchedUpdates`, `withBatchedUpdatesThrottled`) to reuse official example throttling for high-frequency events.       | 149-170, 223-270 (usage sites) | `shared/libs/react/batched.ts`                           | React, step 1                                  | Create module (new)                       |
| 3    | Move persistence suppression timers and ignore flags into a dedicated guard service to centralize state and reuse throttle helpers.                             | 149-170, 223-270, 332-377      | `features/documents/model/persistence-guards.ts`         | Step 2                                         | Move as-is/adapt to service               |
| 4    | Extract viewer API update logic (blank resets, camera initialization) into a `viewerSyncAdapter` that only calls `updateScene` when the scene promise resolves. | 229-258, 670-688               | `features/documents/lib/viewer-sync.ts`                  | Steps 1-2                                      | Create adapter (new)                      |
| 5    | Encapsulate waId sourcing (URL, session storage, default template) into `useWaidSource` hook to isolate side-effects and reuse in drawer/page.                  | 271-399                        | `features/documents/model/useWaidSource.ts`              | Steps 1-3                                      | Move/adapt                                |
| 6    | Create `useDocumentTransitionState` hook to manage `isSceneTransitioning` via the promise loader callbacks instead of scattered `setState` calls.               | 137-268                        | `features/documents/model/useDocumentTransitionState.ts` | Steps 1-4                                      | Create hook (new)                         |
| 7    | Refactor `useDocumentsSection.ts` to orchestrate via new modules, reduce direct imperative API usage, and integrate batching utilities for event handlers.      | 1-741                          | `features/documents/hooks/useDocumentsSection.ts`        | Steps 1-6                                      | Structural refactor (behaviour preserved) |

## Expected Outcomes

- Files created: 5 new modules (`scene-loader`, `viewer-sync`, `persistence-guards`, `useWaidSource`, `useDocumentTransitionState`) plus shared batching utility.
- Original file size: 741 lines → ~320 lines after delegating responsibilities.
- Improved maintainability: Clear separation between scene loading, viewer synchronization, waId management, and persistence guards; easier to adopt official Excalidraw patterns across drawer and documents page while preventing double renders.

## Verification Steps

- [ ] TypeScript compiles (`pnpm tsc --noEmit`)
- [ ] All tests pass (`pnpm test` or feature-specific suites)
- [ ] Import boundaries respected (see `@frontend_structure.mdc`)
- [ ] No circular dependencies
