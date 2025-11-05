# Refactoring Plan: DefaultDocumentDrawer.tsx

## Current State

- **File**: `app/frontend/widgets/documents/DefaultDocumentDrawer.tsx`
- **Size**: 305 lines
- **Issues**:
  1. **Duplicated Hook Orchestration**: Manually orchestrates 6+ hooks (useDocumentScene, useCanvasSynchronization, useExternalDocumentUpdates, useSceneInitialization, useViewerApiReady, useFullscreenManagement) that are already composed in `useDocumentsSection`
  2. **Complex State Management**: Manages scene state, viewer scene state, refs, and effects manually with 10+ refs and useState hooks
  3. **Faulty Loading Logic**: Current implementation has reported issues with document loading
  4. **No Separation of Concerns**: Mixes business logic with presentation in a single 305-line component
  5. **Fragile Synchronization**: Manual effect dependencies and scene application logic prone to errors
  6. **Code Duplication**: 80%+ of the hook composition logic duplicates patterns from DocumentsSection
  7. **Violation of DRY**: Does not reuse the proven, working logic from the documents main page

## Architecture Analysis

### Current Pattern (PROBLEMATIC)

```
DefaultDocumentDrawer (305 lines)
├─ Manual state management (scene, viewerScene, refs)
├─ Manual hook composition
│  ├─ useDocumentScene (custom options)
│  ├─ useCanvasSynchronization (manual wiring)
│  ├─ useExternalDocumentUpdates (manual wiring)
│  ├─ useSceneInitialization (manual wiring)
│  ├─ useViewerApiReady (manual wiring)
│  └─ useFullscreenManagement (manual wiring)
├─ Manual drawer open/close state management
├─ Complex effect for drawer open (lines 171-190)
└─ Presentation (Sheet, canvases, overlays)
```

### Canonical Pattern (DocumentsSection - PROVEN WORKING)

```
DocumentsSection.tsx (~40 lines)
└─ useDocumentsSection hook (orchestrates everything)
   └─ Passes all state/handlers to presentation component

DocumentsSectionLayout.tsx (presentation only)
└─ Renders UI with provided props
```

### Target Pattern (SIMPLIFIED)

```
DefaultDocumentDrawer.tsx (~50 lines)
├─ Drawer open/close state
├─ useDefaultDocumentDrawer hook (new)
│  └─ Reuses core document hooks (same as DocumentsSection)
└─ Passes to DefaultDocumentDrawerLayout (new)

DefaultDocumentDrawerLayout.tsx (presentation only)
└─ Renders Sheet with canvases and overlays
```

## Proposed Changes

### Refactoring Constraints

- **Move as-is when possible**: Extract exact code blocks from working DocumentsSection pattern
- **Preserve ALL functionality**: Document loading, saving, canvas sync, fullscreen - everything must work identically
- **Architectural adaptations allowed**:
  - Create new hook structure to match documents page pattern
  - Simplify by removing customer grid/selection logic (not needed for default document)
  - Keep drawer open/close state management in component (UI concern)
- **No logic changes**: All document loading/saving/sync logic preserved exactly from working pattern
- **DRY principle**: Reuse proven hooks from documents page rather than duplicating

### Key Differences from DocumentsSection

1. **No customer grid**: DefaultDocument has no grid, only two canvases
2. **Fixed waId**: Always uses `TEMPLATE_USER_WA_ID`, no selection/switching
3. **Drawer-based loading**: Document loads when drawer opens, not on mount
4. **Always unlocked**: No unlock validation needed (no customer data)
5. **No URL state**: No search params or URL management
6. **No new customer flow**: Template document only

## Detailed Refactoring Steps

### Step 1: Create useDefaultDocumentDrawer Hook

**Source**: Lines 48-192 (DefaultDocumentDrawer.tsx) + pattern from useDocumentsSection
**Target**: `app/frontend/features/documents/hooks/useDefaultDocumentDrawer.ts`
**Dependencies**: Existing document hooks (useDocumentScene, useCanvasSynchronization, etc.)
**Change Type**: Extract and adapt

**Logic**:

```typescript
export type UseDefaultDocumentDrawerParams = {
  resolvedTheme: string | undefined;
  isOpen: boolean; // Drawer open state controls document loading
};

export type UseDefaultDocumentDrawerResult = {
  // State
  scene: SceneState | null;
  viewerScene: SceneState | null;
  isFullscreen: boolean;
  isSceneTransitioning: boolean;
  loading: boolean;
  saveStatus: SaveStatus;
  // Refs
  fsContainerRef: React.RefObject<HTMLDivElement>;
  // Handlers
  handleViewerCanvasChange: CanvasChangeHandler;
  handleCanvasChange: CanvasChangeHandler;
  onApiReadyWithApply: ApiReadyHandler;
  onViewerApiReady: ApiReadyHandler;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
};
```

**Implementation**: Reuse the EXACT hook composition from useDocumentsSection but:

- Remove: customer grid hooks, waId selection, URL management, customer flow
- Keep: All scene management, canvas sync, external updates, fullscreen
- Adapt: Use fixed TEMPLATE_USER_WA_ID, gate loading by `isOpen` param
- Preserve: All document loading/saving logic verbatim from working pattern

### Step 2: Create DefaultDocumentDrawerLayout Component

**Source**: Lines 199-303 (DefaultDocumentDrawer.tsx)
**Target**: `app/frontend/widgets/documents/default-document-drawer/DefaultDocumentDrawerLayout.tsx`
**Dependencies**: UI components (Sheet, canvases, overlays)
**Change Type**: Extract presentation

**Props**: Accept all state and handlers from hook (same pattern as DocumentsSectionLayout)

**Logic**: Pure presentation - renders Sheet with:

- SheetHeader with title and saving indicator
- Top viewer canvas (150px, read-only mirror)
- Bottom editor canvas (flex-1, editable)
- Lock overlays on both canvases during loading
- Fullscreen toggle button
- All styling and layout

### Step 3: Refactor DefaultDocumentDrawer Component

**Source**: Current 305-line component
**Target**: Same file, reduced to ~50 lines
**Dependencies**: useDefaultDocumentDrawer hook, DefaultDocumentDrawerLayout component
**Change Type**: Simplify to composition

**Logic**:

- Manage drawer open/close state (useState)
- Get theme/locale from contexts
- Call useDefaultDocumentDrawer with theme + isOpen
- Compute themeMode
- Pass everything to DefaultDocumentDrawerLayout
- Handle mounting state for hydration

### Step 4: Update Public API Exports

**Source**: N/A
**Target**: `app/frontend/features/documents/hooks/index.ts`
**Dependencies**: New useDefaultDocumentDrawer hook
**Change Type**: Export only

**Logic**: Add export for `useDefaultDocumentDrawer`

### Step 5: Create barrel export for default-document-drawer widget

**Source**: N/A
**Target**: `app/frontend/widgets/documents/default-document-drawer/index.ts`
**Dependencies**: DefaultDocumentDrawer, DefaultDocumentDrawerLayout
**Change Type**: Export only

**Logic**: Export both components from new directory structure

## File Structure Changes

### Before

```
app/frontend/widgets/documents/
├── DefaultDocumentDrawer.tsx (305 lines - everything)
├── documents-section/
│   ├── DocumentsSection.tsx
│   └── DocumentsSectionLayout.tsx
└── ...
```

### After

```
app/frontend/widgets/documents/
├── default-document-drawer/
│   ├── DefaultDocumentDrawer.tsx (~50 lines - composition only)
│   ├── DefaultDocumentDrawerLayout.tsx (presentation only)
│   └── index.ts (exports)
├── documents-section/
│   ├── DocumentsSection.tsx
│   └── DocumentsSectionLayout.tsx
└── ...

app/frontend/features/documents/hooks/
├── useDefaultDocumentDrawer.ts (new hook)
├── useDocumentsSection.ts (existing)
└── index.ts (updated exports)
```

## Expected Outcomes

### Metrics

- **Original file**: 305 lines
- **Refactored structure**:
  - DefaultDocumentDrawer.tsx: ~50 lines (84% reduction)
  - DefaultDocumentDrawerLayout.tsx: ~150 lines (presentation)
  - useDefaultDocumentDrawer.ts: ~200 lines (business logic)
  - Total: ~400 lines (31% increase for better separation)

### Benefits

1. **DRY Compliance**: Reuses proven document hooks pattern from DocumentsSection
2. **Separation of Concerns**: Business logic (hook) separate from presentation (layout)
3. **Testability**: Hook and layout can be tested independently
4. **Maintainability**: Changes to document logic happen in one place (hooks)
5. **Reliability**: Uses working pattern from documents page, eliminating loading bugs
6. **Consistency**: Same architecture pattern as main documents page
7. **Type Safety**: Explicit types for hook params and results
8. **Reduced Complexity**: Each file has single responsibility

### Functionality Preserved

✅ Document loading when drawer opens
✅ Autosave and save status indicators
✅ Two-canvas setup (viewer + editor) with synchronized state
✅ Lock overlays during loading
✅ Fullscreen toggle
✅ Theme support
✅ Locale support
✅ Hydration safety

### Architecture Improvements

✅ Follows Feature-Sliced Design (widgets/features separation)
✅ Follows Clean Architecture (use cases in features, presentation in widgets)
✅ Follows Domain-Driven Design (document domain encapsulation)
✅ Respects dependency rules (features ← widgets, no circular deps)
✅ Uses public API exports (no deep imports)
✅ Single Responsibility Principle (each file does one thing)
✅ Open/Closed Principle (hook can be extended without modifying)

## Verification Steps

### Type Checking

```bash
cd app/frontend
pnpm tsc --noEmit
```

### Linting

```bash
cd app/frontend
npx biome check . --write
```

### Manual Testing

1. Open default document drawer
2. Verify blank canvas loads initially
3. Verify template document loads from TEMPLATE_USER_WA_ID
4. Make changes in editor canvas
5. Verify changes sync to viewer canvas
6. Verify autosave triggers and save indicator updates
7. Close drawer and reopen
8. Verify changes persisted
9. Test fullscreen toggle
10. Test theme switching (light/dark)
11. Verify no console errors
12. Verify smooth loading transitions (no flicker)

### Integration Testing

- Verify drawer trigger button works
- Verify drawer can be opened from multiple places
- Verify theme context integration
- Verify locale context integration
- Verify no memory leaks on mount/unmount

## Risk Mitigation

### High Risk Areas

1. **Document loading timing**: Drawer open must properly trigger load
   - **Mitigation**: Copy exact loading pattern from useDocumentsSection
2. **Scene synchronization**: Viewer must mirror editor
   - **Mitigation**: Reuse useCanvasSynchronization verbatim
3. **Autosave timing**: Must not conflict with drawer close
   - **Mitigation**: Reuse useDocumentScene with same guards
4. **Camera state**: Must initialize correctly on drawer open
   - **Mitigation**: Copy camera initialization from useDocumentsSection

### Testing Strategy

1. Extract hook first, test in isolation
2. Extract layout, test with mock props
3. Integrate in drawer component
4. Test full flow in dev environment
5. Verify all edge cases (rapid open/close, autosave during close, etc.)

## Dependencies

This refactoring depends on existing, proven code:

- ✅ useDocumentScene (lines 206-209 in useDocumentsSection)
- ✅ useCanvasSynchronization (lines 218-228 in useDocumentsSection)
- ✅ useExternalDocumentUpdates (lines 350-362 in useDocumentsSection)
- ✅ useSceneInitialization (lines 380-385 in useDocumentsSection)
- ✅ useViewerApiReady (lines 388-392 in useDocumentsSection)
- ✅ useFullscreenManagement (lines 476-479 in useDocumentsSection)

All dependencies are stable and well-tested. No changes to dependencies required.

## Summary

This refactoring transforms a 305-line monolithic component with duplicated logic and loading issues into a clean, maintainable architecture that:

1. **Reuses proven working code** from DocumentsSection (DRY principle)
2. **Separates business logic from presentation** (Clean Architecture)
3. **Follows established patterns** in the codebase (consistency)
4. **Preserves all functionality** (safe refactoring)
5. **Fixes loading issues** by using working document load pattern
6. **Improves testability** through separation of concerns

The refactoring is **low risk** because it primarily extracts and reuses existing, working code rather than rewriting logic.
