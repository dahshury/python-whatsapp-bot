### Documents Page Performance Action Plan (Dual-Canvas, Autosave-safe)

| # | Action | Source (where this is driven from) | Implementation details |
|---:|---|---|---|
| 1 | Gate viewer element mirroring to content changes only | Our viewer mirrors elements on every editor change: `app/frontend/app/(core)/documents/page.tsx` 511–529. For content-change detection, we already use scene version in autosave: `app/frontend/widgets/document-canvas/hooks/use-document-scene.ts` 504–513. | In `page.tsx`, compute `contentSig = v{getSceneVersion(elements)}|f{filesCount}` (reuse `getSceneVersionSafe`). Store a `lastViewerContentSigRef`; only call `viewerApi.updateScene({ elements }, false)` when `contentSig` changes. Keep camera updates independent (see items 3 & 8). |
| 2 | Switch viewer file updates to `addFiles()` with per-id delta | Ref uses `addFiles` after `updateScene`: `app/frontend/draw-main/src/views/Page.tsx` 62–70. Our code sends files via `updateScene`: `page.tsx` 519–526. | Track a `lastViewerFileIdsRef: Set<string>`. On editor change, diff file IDs; for new IDs call `viewerApi.addFiles(Object.values(newFiles))`. Remove `files` from viewer `updateScene` payload. |
| 3 | Use `onScrollChange` for viewer camera; restrict viewer `onChange` to zoom-only | Doc exposes `onScrollChange(scrollX, scrollY)` and `onChange` for full updates. Our `DocumentCanvas` doesn’t forward `onScrollChange`: `app/frontend/widgets/document-canvas/DocumentCanvas.tsx` 212–244. Viewer camera tracking is currently done inside `onChange`: `page.tsx` 428–452. | Extend `DocumentCanvas` props with `onScrollChange?: ExcalidrawProps["onScrollChange"]` and forward it to `<Excalidraw>`. In `page.tsx`, attach viewer `onScrollChange` to update `viewerCameraRef` and trigger autosave path (call `originalHandleCanvasChange(...)` with `viewerAppState`). Keep viewer `onChange` only to detect zoom deltas (signature compare). |
| 4 | Preserve autosave cadence and combined-sig logic (3s idle, 15s interval) | Idle/interval controllers already match requirement: `use-document-scene.ts` 229–399 (init), 400–447 (interval), 457–570 (idle schedule with content+camera sig). | No changes to timers or scheduling. Ensure item 3 continues to feed viewer/editor camera into `handleCanvasChange` so camera-only changes persist as before. |
| 5 | Explicitly pass `commitToHistory: false` for viewer `updateScene` | We call `updateScene(...)` without the flag: `page.tsx` 511–529. Doc notes history recording can be controlled; default is false but being explicit is safer. | Where we mirror viewer elements, invoke `viewerApi.updateScene({ elements }, false)` (2nd arg) if supported by the installed Excalidraw; if not, keep current call (default is false). |
| 6 | Forward low-cost props for the viewer to minimize overhead | `DocumentCanvas` doesn’t forward `onScrollChange`, `handleKeyboardGlobally`, etc.: `DocumentCanvas.tsx` 212–244. Doc provides these props for fine-grained control. | In `DocumentCanvas`, forward `onScrollChange`; explicitly set `handleKeyboardGlobally={false}` on both canvases. Consider `detectScroll={false}` on the viewer if the container doesn’t scroll (we already call `api.refresh()` on resize). |
| 7 | Strengthen viewer files change detection (ID-based, not count-based) | Our viewer files signature uses only count: `page.tsx` 519–526. | Maintain a stable `Set` of file IDs to detect additions. Only call `addFiles` for newly seen IDs. Avoid re-sending when counts match but IDs differ or when content changes without ID change. |
| 8 | Skip viewer updates when only non-visual appState changes occur | Our viewer element mirroring triggers for any editor `onChange`: `page.tsx` 511–529. | With item 1 gating, skip viewer `updateScene` when `getSceneVersion` and files ID set are unchanged. Viewer still mirrors via camera path (item 3). |
| 9 | Keep apply-on-API-ready and SSR-safe mounting | We already follow Doc guidance: dynamic import + rAF apply: `DocumentCanvas.tsx` 223–241, 212–244. | No change. Retain `initialData={}` and apply via `api.updateScene(...)` in rAF after mount. |
| 10 | Use restore utilities only on load (avoid in tight loops) | We already restore once on load: `app/frontend/shared/libs/documents/scene-utils.ts` 140–166. | No change. Do not run `restore(...)` inside `onChange` or autosave paths. |

---

#### Quoted references (by item)

1) Gate viewer element mirroring to content changes only

```511:529:app/frontend/app/(core)/documents/page.tsx
if (api?.updateScene) {
  isEditorMirroringRef.current = true;
  // Only include files when they actually change (reduce data churn)
  let nextFilesSig = "";
  try {
    nextFilesSig = `f${Object.keys(files || {}).length}`;
  } catch {}
  if (nextFilesSig && nextFilesSig !== lastViewerFilesSigRef.current) {
    api.updateScene({ elements, files } as Record<string, unknown>);
    lastViewerFilesSigRef.current = nextFilesSig;
  } else {
    api.updateScene({ elements } as Record<string, unknown>);
  }
}
```

```504:513:app/frontend/widgets/document-canvas/hooks/use-document-scene.ts
// Use official scene version for change detection
let sceneVersion = getSceneVersionSafe(
  elements as unknown as ReadonlyArray<unknown>,
);
const filesCount = files
  ? Object.keys(files as Record<string, unknown>).length
  : 0;
const s = sig || `v${sceneVersion}|f${filesCount}`;
```

2) Switch viewer file updates to `addFiles()` with per-id delta

```62:70:app/frontend/draw-main/src/views/Page.tsx
excalidrawAPI.updateScene({
  elements: elements,
  appState: { theme: theme },
});
// Update files if they exist
if (Object.keys(files).length > 0) {
  excalidrawAPI.addFiles(Object.values(files));
}
```

```519:526:app/frontend/app/(core)/documents/page.tsx
let nextFilesSig = "";
try {
  nextFilesSig = `f${Object.keys(files || {}).length}`;
} catch {}
if (nextFilesSig && nextFilesSig !== lastViewerFilesSigRef.current) {
  api.updateScene({ elements, files } as Record<string, unknown>);
  lastViewerFilesSigRef.current = nextFilesSig;
}
```

3) Use `onScrollChange` for viewer camera; restrict viewer `onChange` to zoom-only

```212:244:app/frontend/widgets/document-canvas/DocumentCanvas.tsx
{mountReady && (
  <Excalidraw
    theme={theme}
    langCode={langCode as unknown as string}
    onChange={deferredOnChange}
    {...(uiOptions ? { UIOptions: uiOptions } : {})}
    initialData={initialData}
    excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      if (!didNotifyApiRef.current) {
        didNotifyApiRef.current = true;
        // Apply initial theme/view/zen state via updateScene to avoid mount-time setState
        requestAnimationFrame(() => {
          try {
            (
              api as unknown as {
                updateScene?: (s: Record<string, unknown>) => void;
              }
            ).updateScene?.({
              appState: {
                viewModeEnabled: Boolean(viewModeEnabled),
                zenModeEnabled: Boolean(zenModeEnabled),
                theme,
              },
            });
          } catch {}
          try {
            onApiReady(api);
          } catch {}
        });
      }
    }}
  />
)}
```

```428:452:app/frontend/app/(core)/documents/page.tsx
const handleViewerCanvasChange = useCallback(
  (
    _elements: unknown[],
    appState: Record<string, unknown>,
    _files: Record<string, unknown>,
  ) => {
    // Ignore viewer onChange caused by editor-driven mirroring
    if (isEditorMirroringRef.current) {
      return;
    }
    // Compute stable signature for viewer camera (only zoom/scroll values)
    // Round to avoid floating-point precision issues
    const zoomValue = (appState.zoom as { value?: number })?.value ?? 1;
    const scrollX = (appState.scrollX as number) ?? 0;
    const scrollY = (appState.scrollY as number) ?? 0;
    const camera = { zoom: Math.round(zoomValue * 1000) / 1000, scrollX: Math.round(scrollX), scrollY: Math.round(scrollY) };
    const newSig = JSON.stringify(camera);
    if (newSig === lastViewerCameraSigRef.current) return;
```

4) Preserve autosave cadence and combined-sig logic (3s idle, 15s interval)

```331:389:app/frontend/widgets/document-canvas/hooks/use-document-scene.ts
intervalControllerRef.current = createIntervalAutosaveController({
  waId,
  intervalMs: 15000,
  onSaving: () => { /* ... */ },
  onSaved: () => { /* ... */ },
  onError: ({ message }) => { /* ... */ },
});
```

```544:561:app/frontend/widgets/document-canvas/hooks/use-document-scene.ts
if (shouldSchedule) {
  lastScheduledSigRef.current = s;
  idleControllerRef.current?.schedule({
    elements,
    appState,
    files,
    viewerAppState: viewerAppStateRef.current,
    editorAppState: editorAppStateRef.current,
    sig: s,
  });
}
```

5) Explicitly pass `commitToHistory: false` for viewer `updateScene`

```511:518:app/frontend/app/(core)/documents/page.tsx
if (api?.updateScene) {
  isEditorMirroringRef.current = true;
  // ...
  api.updateScene({ elements } as Record<string, unknown>);
}
```

6) Forward low-cost props for the viewer to minimize overhead

```212:218:app/frontend/widgets/document-canvas/DocumentCanvas.tsx
<Excalidraw
  theme={theme}
  langCode={langCode as unknown as string}
  onChange={deferredOnChange}
  {...(uiOptions ? { UIOptions: uiOptions } : {})}
```

7) Strengthen viewer files change detection (ID-based, not count-based)

```519:526:app/frontend/app/(core)/documents/page.tsx
let nextFilesSig = "";
try {
  nextFilesSig = `f${Object.keys(files || {}).length}`;
} catch {}
if (nextFilesSig && nextFilesSig !== lastViewerFilesSigRef.current) {
  api.updateScene({ elements, files } as Record<string, unknown>);
  lastViewerFilesSigRef.current = nextFilesSig;
}
```

8) Skip viewer updates when only non-visual appState changes occur

```511:529:app/frontend/app/(core)/documents/page.tsx
if (api?.updateScene) {
  isEditorMirroringRef.current = true;
  // ... always sends elements currently
  api.updateScene({ elements } as Record<string, unknown>);
}
```

9) Keep apply-on-API-ready and SSR-safe mounting

```223:241:app/frontend/widgets/document-canvas/DocumentCanvas.tsx
requestAnimationFrame(() => {
  try {
    (
      api as unknown as {
        updateScene?: (s: Record<string, unknown>) => void;
      }
    ).updateScene?.({ appState: { viewModeEnabled: Boolean(viewModeEnabled), zenModeEnabled: Boolean(zenModeEnabled), theme } });
  } catch {}
  try { onApiReady(api); } catch {}
});
```

10) Use restore utilities only on load (avoid in tight loops)

```140:166:app/frontend/shared/libs/documents/scene-utils.ts
// Best-effort normalization on client: use restore() to ensure shapes/text are normalized
try {
  if (typeof window !== "undefined") {
    const excali = require("@excalidraw/excalidraw");
    if (excali?.restore) {
      const restored = excali.restore({ elements: result.elements as unknown[], appState: result.appState as Record<string, unknown>, files: result.files as Record<string, unknown> }, null, null);
      result = { elements: (restored?.elements || []) as unknown[], appState: (restored?.appState || {}) as Record<string, unknown>, files: (restored?.files || {}) as Record<string, unknown>, viewerAppState: result.viewerAppState, editorAppState: result.editorAppState };
    }
  }
} catch {}
```

Notes
- Doc props used: `onScrollChange`, `getSceneVersion`, `updateScene`, `addFiles`, `handleKeyboardGlobally`, `detectScroll`. These are standard Excalidraw APIs and align with the official guidance to minimize unnecessary updates while keeping rendering smooth.
- These changes do not throttle FPS, and they preserve both autosave triggers (3s inactivity, 15s interval) and dual-canvas behaviors (top viewer live preview, bottom editor).


