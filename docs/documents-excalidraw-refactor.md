# Refactoring Plan: Documents Excalidraw Integration

## Current State

- File: `app/frontend/widgets/documents/documents-section/DocumentsSection.tsx`
  - Size: ~322 lines.
  - Issues: Monolithic component mixing state orchestration, grid wiring, viewer/editor markup, inline CSS, and fullscreen controls; duplicates viewer stack found in `DefaultDocumentDrawer`; rerenders the entire section whenever large scene payloads change.
- File: `app/frontend/widgets/document-canvas/DocumentCanvas.tsx`
  - Size: ~410 lines.
  - Issues: Single file responsible for Excalidraw mounting, throttling, scene application, and both viewer/editor configuration; recomputes scene signatures on every update; embeds viewer-specific styling; difficult to reason about failure paths.
- File: `app/frontend/widgets/documents/DefaultDocumentDrawer.tsx`
  - Size: ~379 lines.
  - Issues: Duplicates viewer/editor stack markup, fullscreen controls, and overlay logic from `DocumentsSection`; maintains a custom locale hook and inline styles that should be shared.
- Supporting hooks/services:
  - `features/documents/hooks/useCanvasSynchronization.ts` (~192 lines) uses manual rAF scheduling without leveraging shared throttled batching utilities or signature guards, causing redundant viewer refreshes under heavy scenes.
  - `features/documents/lib/scene-loader.ts` provides per-waId resolvable promises but returns raw scene objects without cached signatures or reusable `initialData`, forcing downstream recomputation.
- Viewer-specific style rules are inlined across multiple components instead of centralized, inflating component complexity and reallocations.

## Proposed Changes

**Refactoring Constraints:**

- Move code verbatim when it already fits the new architectural slot.
- Wrap or adapt structure only when required by layer boundaries; preserve all existing autosave, synchronization, and UX behaviour.
- Keep dependency flow inward and rely on public APIs for cross-layer usage.
- Maintain identical Excalidraw interactions (loading, throttling, saving semantics) after refactor.

| Step | Description | Source Lines | Target Location | Dependencies | Change Type |
| ---- | ------------ | ------------ | ---------------- | ------------ | ----------- |
| 1 | Extend scene loader to attach precomputed signatures and expose an `initialData` promise patterned after the official example | `features/documents/lib/scene-loader.ts` (1-120), `shared/libs/documents/scene-utils.ts` (1-180) | Same files + `features/documents/hooks/useDocumentScene.ts`, `features/documents/hooks/useDocumentsSection.ts` | `useExternalDocumentUpdates`, existing scene snapshot consumers | Adapt structure (logic preserved) |
| 2 | Split `DocumentCanvas` into a base Excalidraw wrapper plus mount-gate hook that consumes the new initial-data promise and signature-aware updates | `widgets/document-canvas/DocumentCanvas.tsx` (1-410) | `widgets/document-canvas/components/BaseDocumentCanvas.tsx`, `widgets/document-canvas/hooks/useExcalidrawMountGate.ts`, updated `DocumentCanvas.tsx` | Step 1 | Restructure (move & adapt) |
| 3 | Create reusable viewer/editor wrappers and centralized CSS derived from the official example to remove duplication and inline styles | `DocumentsSection.tsx` viewer/editor blocks (193-311), `DefaultDocumentDrawer.tsx` viewer/editor blocks (262-372) | `widgets/documents/document-viewer/DocumentViewerCanvas.tsx`, `widgets/documents/document-editor/DocumentEditorCanvas.tsx`, `app/frontend/styles/excalidraw-viewer.css` | Step 2 | Extract (move as-is where possible) |
| 4 | Refactor `DocumentsSection` into a thin container plus presentational layout component that leverages the new wrappers and reduces prop churn | `DocumentsSection.tsx` (1-322) | `DocumentsSection.tsx` (container), new `DocumentsSectionLayout.tsx`, optional `CustomerGridPanel.tsx` in same folder | Steps 2-3 | Restructure |
| 5 | Update `DefaultDocumentDrawer` to share the new viewer/editor wrappers and remove duplicated state wiring while retaining behaviour | `DefaultDocumentDrawer.tsx` (1-379) | Same file + helpers under `widgets/documents` as needed | Steps 2-3 | Restructure |
| 6 | Optimize synchronization hooks to leverage throttled batched updates and signature guards, preventing redundant viewer refreshes and autosave scheduling | `features/documents/hooks/useCanvasSynchronization.ts` (1-192), `features/documents/hooks/useSceneChangeHandler.ts` (1-195) | Same files + auxiliary utilities under `shared/libs/documents` if required | Steps 1-2 | Adapt structure (logic preserved) |

## Expected Outcomes

- Files created: `widgets/document-canvas/components/BaseDocumentCanvas.tsx`, `widgets/document-canvas/hooks/useExcalidrawMountGate.ts`, `widgets/documents/document-viewer/DocumentViewerCanvas.tsx`, `widgets/documents/document-editor/DocumentEditorCanvas.tsx`, `widgets/documents/documents-section/DocumentsSectionLayout.tsx`, optional `CustomerGridPanel.tsx`, and `app/frontend/styles/excalidraw-viewer.css`.
- Original monolithic files shrink substantially: `DocumentCanvas.tsx` ~410 → <200 lines, `DocumentsSection.tsx` ~322 → <120 lines, `DefaultDocumentDrawer.tsx` ~379 → <180 lines.
- Centralized wrappers ensure consistent behaviour between the documents page and default drawer, while signature-aware updates reduce CPU load for large scenes.
- Throttled viewer mirroring and cached signatures minimize unnecessary reflows, improving responsiveness as scenes grow.

## Verification Steps

- [ ] `pnpm --filter app/frontend typecheck`
- [ ] `pnpm --filter app/frontend lint`
- [ ] `pnpm --filter app/frontend lint:biome`
- [ ] `pnpm --filter app/frontend test`
- [ ] Manual QA: load `/documents`, open the default document drawer, verify viewer/editor sync, autosave indicators, fullscreen toggles, and grid interactions with large scenes.


