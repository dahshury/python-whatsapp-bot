# Excalidraw Cell Refactoring Plan

## Executive Summary

**Target File**: `app/frontend/shared/libs/data-grid/components/excalidraw-cell.tsx`

**Current Status**: 989 lines, single monolithic file with multiple concerns mixed together

**File Size Analysis**:

- Total Lines: 989
- Main Component (ExcalidrawCellEditor): ~540 lines
- Helper Functions: ~250 lines
- Constants: ~40 lines
- Renderer: ~78 lines

**Issues Identified**:

1. **Cognitive Complexity**: Massive ExcalidrawCellEditor component with mixed concerns (state management, UI rendering, color logic, SVG export, theme derivation)
2. **Code Duplication**: Repetitive button/toolbar code for stroke width selectors
3. **Mixed Responsibilities**: Color theory functions, SVG manipulation, and UI logic all in one file
4. **Poor Testability**: Large component with complex intermingled logic
5. **Hard to Reuse**: Color utilities and SVG helpers are locked in a component file
6. **Accessibility Violations**: Inline styles and complex event handling mixed with JSX
7. **Performance Concerns**: RAFRef management and SVG generation not isolated

**Expected Outcome**:

- Original file reduced from 989 to ~300 lines (70% reduction)
- 8-10 new focused files following DDD architecture
- Improved testability and reusability
- Separated concerns: utilities, hooks, components, services
- Better accessibility and performance optimization

---

## Proposed Architecture

### New Directory Structure

```
shared/libs/data-grid/
├── components/
│   ├── excalidraw-cell.tsx (refactored main file, ~300 lines)
│   ├── ui/ExcalidrawToolbar.tsx (NEW - toolbar component)
│   └── utils/
│       ├── color-utils.ts (NEW - color conversion functions)
│       └── svg-utils.ts (NEW - SVG manipulation functions)
├── constants/
│   └── excalidraw-constants.ts (NEW - all excalidraw constants)
├── hooks/
│   ├── use-excalidraw-theme.ts (NEW - theme/color derivation)
│   └── use-excalidraw-editor-state.ts (NEW - editor state management)
└── services/
    └── excalidraw-svg-export.ts (NEW - SVG export service)
```

### Design Principles Applied

- **Single Responsibility**: Each file/function has one reason to change
- **Dependency Injection**: Pass dependencies explicitly
- **Reusability**: Color utils can be used elsewhere, not locked in component
- **Accessibility**: Color contrast and accessibility helpers clearly separated
- **Type Safety**: Strong typing for all extracted functions
- **Performance**: SVG export and RAF management isolated

---

## Detailed Refactoring Plan

### Phase 1: Extract Constants

| Step | Description                                                                                                                                             | Source Lines | Target Location                                           | Imports to Update   | Dependencies |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------- | ------------------- | ------------ |
| 1    | Extract all excalidraw constants (SVG tolerance, SVG namespace, color divisors, RGB constants, HSL constants, preview dimensions, stroke widths, regex) | 28-58        | `shared/libs/data-grid/constants/excalidraw-constants.ts` | excalidraw-cell.tsx | None         |

**Details**: Consolidate 30+ scattered constants into a single organized constants file with clear sections for SVG, color, RGB, HSL, preview, and stroke constants.

---

### Phase 2: Extract Color Utilities

| Step | Description                                                                                                                                                              | Source Lines | Target Location                                         | Imports to Update   | Dependencies            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------- | ------------------- | ----------------------- |
| 2    | Extract color conversion functions: `hexToRgb`, `calculateRelativeLuminance`, `calculateContrastRatio`, `getRgbComponentsFromHue`, `hslToHex`, `resolveCssVariableToHex` | 74-218       | `shared/libs/data-grid/components/utils/color-utils.ts` | excalidraw-cell.tsx | excalidraw-constants.ts |
| 3    | Create color utilities types/interfaces (RGB type)                                                                                                                       | N/A (inline) | `shared/libs/data-grid/components/utils/color-utils.ts` | N/A                 | None                    |

**Details**: Extract all color-related functions that handle WCAG contrast ratios, HSL-to-hex conversion, and CSS variable resolution. These are domain utilities that could be reused in other components needing color accessibility.

---

### Phase 3: Extract SVG Utilities

| Step | Description                                                                        | Source Lines | Target Location                                       | Imports to Update   | Dependencies            |
| ---- | ---------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------- | ------------------- | ----------------------- |
| 4    | Extract SVG manipulation functions: `stripSvgBackgroundRects`, `recolorSvgStrokes` | 220-276      | `shared/libs/data-grid/components/utils/svg-utils.ts` | excalidraw-cell.tsx | excalidraw-constants.ts |

**Details**: SVG DOM manipulation utilities separated for clarity and potential future reuse. These are lower-level utilities that work with SVG elements directly.

---

### Phase 4: Extract SVG Export Service

| Step | Description                                                     | Source Lines | Target Location                                           | Imports to Update   | Dependencies                                                  |
| ---- | --------------------------------------------------------------- | ------------ | --------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| 5    | Extract async SVG export function: `exportElementsToSvgDataUrl` | 279-325      | `shared/libs/data-grid/services/excalidraw-svg-export.ts` | excalidraw-cell.tsx | svg-utils.ts, excalidraw-constants.ts, @excalidraw/excalidraw |

**Details**: Async service that orchestrates SVG export, cleanup, and recoloring. Isolated in a service file following clean architecture principles. This could be unit tested independently.

---

### Phase 5: Extract Custom Hook - useExcalidrawTheme

| Step | Description                                                           | Source Lines | Target Location                                       | Imports to Update   | Dependencies          |
| ---- | --------------------------------------------------------------------- | ------------ | ----------------------------------------------------- | ------------------- | --------------------- |
| 6    | Extract theme derivation logic into custom hook: `useExcalidrawTheme` | 394-418      | `shared/libs/data-grid/hooks/use-excalidraw-theme.ts` | excalidraw-cell.tsx | color-utils.ts, React |

**Details**: Extract the useMemo hook that derives theme colors (bgCell, stroke) from document classes and CSS variables. Makes theme logic reusable and testable. Returns `{ bgCell: string; stroke: string }`.

---

### Phase 6: Extract Editor State Hook

| Step | Description                                                 | Source Lines     | Target Location                                              | Imports to Update   | Dependencies |
| ---- | ----------------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------------- | ------------ |
| 7    | Extract editor state management: `useExcalidrawEditorState` | 379-392, 420-456 | `shared/libs/data-grid/hooks/use-excalidraw-editor-state.ts` | excalidraw-cell.tsx | React        |

**Details**: Custom hook managing containerRef, mounted state, resizeObserver setup, and initialization. Reduces component complexity by isolating lifecycle and state setup. Returns `{ containerRef, mounted, initialData }`.

---

### Phase 7: Extract UI Constants (Hidden UI Options)

| Step | Description                     | Source Lines | Target Location                                                                       | Imports to Update   | Dependencies                 |
| ---- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------- | ------------------- | ---------------------------- |
| 8    | Move `hiddenUiOptions` constant | 328-337      | `shared/libs/data-grid/constants/excalidraw-constants.ts` (or separate ui-options.ts) | excalidraw-cell.tsx | @excalidraw/excalidraw types |

**Details**: Move Excalidraw UIOptions configuration to constants for centralized management and easy tweaking.

---

### Phase 8: Extract Toolbar Component

| Step | Description                                                               | Source Lines | Target Location                                             | Imports to Update   | Dependencies |
| ---- | ------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- | ------------------- | ------------ |
| 9    | Extract toolbar and stroke selector UI (buttons, event handlers, styling) | 560-905      | `shared/libs/data-grid/components/ui/ExcalidrawToolbar.tsx` | excalidraw-cell.tsx | React        |

**Details**: Extract all the mini toolbar UI including pen, eraser, and stroke width selector buttons. Create a reusable toolbar component that takes `{ apiRef, activeTool, currentStrokeWidth, stroke, onToolChange, onStrokeChange }` as props. Reduce inline event handlers and styling.

**Sub-components**:

- `<StrokeWidthSelector />` for the width selection UI
- `<ToolButton />` for individual tool buttons

---

### Phase 9: Refactor ExcalidrawCellEditor Component

| Step | Description                                                         | Source Lines | Target Location                                                     | Imports to Update | Dependencies                                                                                                                      |
| ---- | ------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 10   | Refactor ExcalidrawCellEditor to use extracted hooks and components | 370-908      | `shared/libs/data-grid/components/excalidraw-cell.tsx` (refactored) | N/A (main file)   | use-excalidraw-theme.ts, use-excalidraw-editor-state.ts, ExcalidrawToolbar.tsx, excalidraw-svg-export.ts, excalidraw-constants.ts |

**Details**: After all extractions, the ExcalidrawCellEditor component becomes lean (~150-200 lines):

- Uses `useExcalidrawTheme()` hook
- Uses `useExcalidrawEditorState()` hook
- Renders `<ExcalidrawToolbar />` component
- Calls `exportElementsToSvgDataUrl()` from service
- Focuses on JSX structure and coordination

---

### Phase 10: Update ExcalidrawCellRenderer

| Step | Description                                              | Source Lines | Target Location                                                     | Imports to Update | Dependencies                            |
| ---- | -------------------------------------------------------- | ------------ | ------------------------------------------------------------------- | ----------------- | --------------------------------------- |
| 11   | Verify ExcalidrawCellRenderer exports and update imports | 910-986      | `shared/libs/data-grid/components/excalidraw-cell.tsx` (refactored) | None              | ExcalidrawCellEditor (now slimmed down) |

**Details**: The renderer should work as-is after refactoring, but verify exports are correct. No changes needed to logic, just ensure it still imports and exports the refactored types.

---

### Phase 11: Update Dependent Files

| Step | Description                                                                                 | Source Lines | Target Location    | Imports to Update | Dependencies                           |
| ---- | ------------------------------------------------------------------------------------------- | ------------ | ------------------ | ----------------- | -------------------------------------- |
| 12   | Update import statements in `shared/libs/data-grid/components/renderers/customRenderers.ts` | N/A          | customRenderers.ts | Line 3            | excalidraw-cell.tsx (unchanged export) |

**Details**: The export from excalidraw-cell.tsx remains the same (ExcalidrawCellRenderer), so existing imports don't need to change. Only internal imports within excalidraw-cell.tsx change.

---

## Refactoring Summary Table

### Files to Create (8-10 new files)

| New File                                | Type      | LOC Est. | Purpose                                  |
| --------------------------------------- | --------- | -------- | ---------------------------------------- |
| `constants/excalidraw-constants.ts`     | Constants | 50       | Centralized excalidraw configuration     |
| `components/utils/color-utils.ts`       | Utilities | 80       | WCAG color conversion and contrast       |
| `components/utils/svg-utils.ts`         | Utilities | 40       | SVG DOM manipulation                     |
| `services/excalidraw-svg-export.ts`     | Service   | 50       | Async SVG export orchestration           |
| `hooks/use-excalidraw-theme.ts`         | Hook      | 30       | Theme derivation logic                   |
| `hooks/use-excalidraw-editor-state.ts`  | Hook      | 40       | Editor lifecycle and state setup         |
| `components/ui/ExcalidrawToolbar.tsx`   | Component | 150      | Toolbar UI and tool controls             |
| `components/ui/StrokeWidthSelector.tsx` | Component | 80       | Stroke width selection UI (if separated) |
| `components/ui/ToolButton.tsx`          | Component | 50       | Individual tool button (if separated)    |

### Files to Modify

| File                           | Changes                                     | Import Updates                            |
| ------------------------------ | ------------------------------------------- | ----------------------------------------- |
| `excalidraw-cell.tsx`          | Refactor to 300 LOC, remove extracted logic | Import 6-8 new utilities/hooks/components |
| `renderers/customRenderers.ts` | None (same export)                          | None                                      |

---

## Key Metrics

### Before Refactoring

- **Total Lines**: 989
- **ExcalidrawCellEditor Component**: ~540 lines
- **Helper Functions**: ~250 lines
- **Constants/Config**: ~70 lines
- **Testable Units**: 1 (whole file)
- **Reusable Utilities**: 0 (locked in component)
- **Cyclomatic Complexity**: High (large component with nested state)

### After Refactoring

- **Total Lines in excalidraw-cell.tsx**: ~300 (70% reduction)
- **Total New Code**: ~550 lines across 8-10 focused files
- **ExcalidrawCellEditor Component**: ~150-200 lines (focused on rendering/coordination)
- **Testable Units**: 10+ (each utility, hook, service testable in isolation)
- **Reusable Utilities**: 5-6 (color-utils, svg-utils, hooks can be imported elsewhere)
- **Cyclomatic Complexity**: Low (each piece has clear responsibility)

---

## Dependency Graph

```
excalidraw-cell.tsx (refactored)
  ├── use-excalidraw-theme.ts
  │   └── color-utils.ts
  │       └── excalidraw-constants.ts
  ├── use-excalidraw-editor-state.ts
  ├── excalidraw-svg-export.ts
  │   ├── svg-utils.ts
  │   └── excalidraw-constants.ts
  ├── ExcalidrawToolbar.tsx
  │   └── excalidraw-constants.ts
  └── excalidraw-constants.ts
```

**No Circular Dependencies**: Graph is acyclic, all dependencies flow downward.

---

## Implementation Notes

### 1. Color Utilities Design

```typescript
// color-utils.ts exports:
- hexToRgb(hex: string): RGB | null
- calculateRelativeLuminance(hex: string): number
- calculateContrastRatio(color1: string, color2: string): number
- getRgbComponentsFromHue(h: number, c: number, x: number): [number, number, number]
- hslToHex(hslValue: string): string | null
- resolveCssVariableToHex(varName: string, fallback: string): string
- type RGB = { r: number; g: number; b: number }
```

### 2. SVG Utilities Design

```typescript
// svg-utils.ts exports:
- stripSvgBackgroundRects(svg: SVGSVGElement): void
- recolorSvgStrokes(svg: SVGSVGElement, strokeColor: string): void
```

### 3. SVG Export Service Design

```typescript
// excalidraw-svg-export.ts exports:
export async function exportElementsToSvgDataUrl(args: {
  elements: readonly unknown[];
  appState: Partial<AppState>;
  files: Record<string, unknown>;
  width: number;
  height: number;
  strokeColor?: string;
}): Promise<string | null>;
```

### 4. useExcalidrawTheme Hook

```typescript
// Returns: { bgCell: string; stroke: string }
// Usage: const { bgCell, stroke } = useExcalidrawTheme()
```

### 5. useExcalidrawEditorState Hook

```typescript
// Returns: { containerRef, mounted, initialData }
// Handles ResizeObserver setup, mount detection, initial data building
```

### 6. Toolbar Component Props

```typescript
interface ExcalidrawToolbarProps {
  apiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>;
  activeTool: "freedraw" | "eraser";
  currentStrokeWidth: number;
  stroke: string;
  onToolChange: (tool: "freedraw" | "eraser") => void;
  onStrokeWidthChange: (width: number) => void;
}
```

---

## Quality Checks

### TypeScript Validation

After each refactoring step:

```bash
cd app/frontend
pnpm tsc --noEmit
```

### Code Quality

```bash
npx ultracite check app/frontend/shared/libs/data-grid/
```

### Import Validation

- No circular imports
- All exports properly typed
- No unused imports after refactoring

---

## Testing Strategy

After refactoring, create unit tests for:

1. **Color Utilities**: Test hex-to-rgb, contrast ratio calculations, HSL conversion
2. **SVG Utilities**: Mock SVG elements, test strip/recolor operations
3. **Hooks**: Test theme derivation, editor state management
4. **Toolbar Component**: Test button clicks, tool switching, stroke width changes

---

## Risks & Mitigation

| Risk                    | Likelihood | Impact | Mitigation                                |
| ----------------------- | ---------- | ------ | ----------------------------------------- |
| Circular imports        | Low        | High   | Review dependency graph before extraction |
| Type mismatches         | Medium     | Medium | Run tsc --noEmit after each step          |
| Performance regression  | Low        | Medium | Benchmark RAF and SVG export before/after |
| Breaking existing usage | Low        | High   | Verify customRenderers.ts still works     |

---

## Success Criteria

✅ All 989 lines split across focused, logical files\
✅ ExcalidrawCellEditor reduced to <300 lines\
✅ Zero TypeScript errors: `pnpm tsc --noEmit` passes\
✅ Zero Ultracite violations: `npx ultracite check` passes\
✅ No circular dependencies in import graph\
✅ All new utilities properly exported and typed\
✅ Toolbar component renders and responds to events\
✅ SVG export still functional with refactored service\
✅ Accessibility standards maintained (WCAG contrast still calculated)\
✅ customRenderers.ts import still works unchanged

---

## Timeline Estimate

- Phase 1 (Constants): 10 minutes
- Phase 2 (Color Utilities): 15 minutes
- Phase 3 (SVG Utilities): 10 minutes
- Phase 4 (SVG Export Service): 15 minutes
- Phase 5 (Hooks): 20 minutes
- Phase 6 (Toolbar Component): 25 minutes
- Phase 7 (Main Component Refactor): 20 minutes
- Phase 8 (Testing & Validation): 15 minutes

**Total Estimated Time**: ~130 minutes (2.5 hours)

---

## Next Steps

1. ✅ Plan is now complete and ready for review
2. ⏳ Wait for user to review and approve
3. ⏳ Upon approval, user says "execute the plan"
4. ⏳ Then begin Phase 3: Iterative Refactoring Execution
