"use client";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { cn } from "@shared/libs/utils";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";
import { logger } from "@/shared/libs/logger";
import { BaseDocumentCanvas } from "./components/BaseDocumentCanvas";
import { useExcalidrawMountGate } from "./hooks/useExcalidrawMountGate";

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const logDocumentCanvasWarning = (context: string, error: unknown) => {
  logger.warn(`[DocumentCanvas] ${context}`, error);
};

const CAMERA_ZOOM_PRECISION_MULTIPLIER = 1000;

const computeCameraSignature = (
  appState: Record<string, unknown> | undefined | null
): string | null => {
  if (!appState) {
    return null;
  }

  const zoomValueRaw =
    (appState.zoom as { value?: number } | undefined)?.value ??
    (typeof appState.zoom === "number" ? appState.zoom : undefined);
  const scrollXRaw =
    typeof appState.scrollX === "number" ? appState.scrollX : undefined;
  const scrollYRaw =
    typeof appState.scrollY === "number" ? appState.scrollY : undefined;

  if (
    zoomValueRaw === undefined &&
    scrollXRaw === undefined &&
    scrollYRaw === undefined
  ) {
    return null;
  }

  const zoom =
    zoomValueRaw === undefined
      ? undefined
      : Math.round(zoomValueRaw * CAMERA_ZOOM_PRECISION_MULTIPLIER) /
        CAMERA_ZOOM_PRECISION_MULTIPLIER;
  const scrollX = scrollXRaw === undefined ? undefined : Math.round(scrollXRaw);
  const scrollY = scrollYRaw === undefined ? undefined : Math.round(scrollYRaw);

  return JSON.stringify({ zoom, scrollX, scrollY });
};

const noopOnChangeHandler: NonNullable<ExcalidrawProps["onChange"]> = (
  _elements,
  _appState,
  _files
) => {
  // Intentionally noop to keep a stable default onChange reference
};

// Note: We rely on Excalidraw's internal resize/scroll handling and a single
// ResizeObserver in useExcalidrawResize. No extra verification or refresh bursts.

function DocumentCanvasComponent({
  theme,
  langCode,
  onChange,
  onApiReady,
  viewModeEnabled,
  zenModeEnabled,
  uiOptions,
  scene,
  scrollable,
  forceLTR,
  hideToolbar,
  hideHelpIcon,
  initialData: initialDataProp,
}: {
  theme: "light" | "dark";
  langCode: string;
  onChange?: ExcalidrawProps["onChange"];
  onApiReady: (api: ExcalidrawAPI) => void;
  viewModeEnabled?: boolean;
  zenModeEnabled?: boolean;
  uiOptions?: ExcalidrawProps["UIOptions"];
  scene?: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
  scrollable?: boolean;
  forceLTR?: boolean;
  hideToolbar?: boolean;
  hideHelpIcon?: boolean;
  initialData?: ExcalidrawProps["initialData"];
}) {
  const { containerRef, mountReady } = useExcalidrawMountGate();
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const lastAppliedSceneSigRef = useRef<string | null>(null);
  const lastAppliedCameraSigRef = useRef<string | null>(null);
  const didNotifyApiRef = useRef<boolean>(false);

  // Stable props to avoid unnecessary Excalidraw re-renders
  const mergedOnChange = (onChange || noopOnChangeHandler) as NonNullable<
    ExcalidrawProps["onChange"]
  >;

  // Defer and coalesce onChange to the next animation frame to avoid scheduling
  // state updates during Excalidraw's own render/update cycle
  type OnChange = NonNullable<ExcalidrawProps["onChange"]>;
  type OnChangeArgs = Parameters<OnChange>;
  const userOnChangeRef = useRef<OnChange>(mergedOnChange);
  useEffect(() => {
    userOnChangeRef.current = mergedOnChange;
  }, [mergedOnChange]);
  const lastElementsRef = useRef<OnChangeArgs[0] | null>(null);
  const lastAppStateRef = useRef<OnChangeArgs[1] | null>(null);
  const lastFilesRef = useRef<OnChangeArgs[2] | null>(null);
  const rafOnChangeRef = useRef<number | null>(null);
  const deferredOnChange = useCallback<OnChange>(
    (elements, appState, files) => {
      lastElementsRef.current = elements;
      lastAppStateRef.current = appState;
      lastFilesRef.current = files;
      if (rafOnChangeRef.current != null) {
        return;
      }
      // Coalesce to a single rAF; do light work inside startTransition
      rafOnChangeRef.current = requestAnimationFrame(() => {
        rafOnChangeRef.current = null;
        startTransition(() => {
          try {
            const els = (lastElementsRef.current ||
              elements) as OnChangeArgs[0];
            const app = (lastAppStateRef.current ||
              appState) as OnChangeArgs[1];
            const bin = (lastFilesRef.current || files) as OnChangeArgs[2];
            userOnChangeRef.current?.(els, app, bin);
          } catch (error) {
            logDocumentCanvasWarning(
              "Deferred onChange handler execution failed",
              error
            );
          }
        });
      });
    },
    []
  );
  useEffect(
    () => () => {
      if (rafOnChangeRef.current != null) {
        try {
          cancelAnimationFrame(rafOnChangeRef.current);
        } catch (error) {
          logDocumentCanvasWarning(
            "Failed to cancel pending animation frame during cleanup",
            error
          );
        }
        rafOnChangeRef.current = null;
      }
    },
    []
  );

  const initialData = useMemo<ExcalidrawProps["initialData"]>(
    () => initialDataProp ?? ({} as ExcalidrawProps["initialData"]),
    [initialDataProp]
  );

  // Excalidraw handles resize/scroll internally; no manual refresh needed

  // Removed global pointer/touch listeners to avoid wide event overhead (Finding #2)

  // Removed manual DOM verification and refresh bursts. Rely on ResizeObserver.

  // Removed extra stabilization refreshes and global listeners.

  // Theme changes are applied via updateScene in a separate effect

  // Apply external scene updates when provided, avoiding redundant updates
  useEffect(() => {
    if (!(apiRef.current && scene)) {
      return;
    }
    const nextSig = computeSceneSignature(
      (scene.elements as unknown[]) || [],
      (scene.appState as Record<string, unknown>) || {},
      (scene.files as Record<string, unknown>) || {}
    );
    const nextCameraSig = computeCameraSignature(scene.appState);
    if (
      nextSig &&
      nextSig === (lastAppliedSceneSigRef.current || null) &&
      nextCameraSig === (lastAppliedCameraSigRef.current || null)
    ) {
      return;
    }
    const sceneToApply = {
      ...scene,
      appState: {
        ...(scene.appState || {}),
        viewModeEnabled: Boolean(viewModeEnabled),
        zenModeEnabled: Boolean(zenModeEnabled),
      },
    };
    const applySceneUpdate = () => {
      try {
        const api = apiRef.current as unknown as {
          updateScene: (s: Record<string, unknown>) => void;
          addFiles?: (f: unknown[]) => void;
        };
        api.updateScene(sceneToApply as Record<string, unknown>);
        const files = (scene.files || {}) as Record<string, unknown>;
        const values = Object.values(files);
        if (values.length > 0) {
          try {
            api.addFiles?.(values as unknown[]);
          } catch (error) {
            logDocumentCanvasWarning(
              "Applying binary files to Excalidraw scene failed",
              error
            );
          }
        }
      } catch (error) {
        logDocumentCanvasWarning(
          "Applying Excalidraw scene update failed",
          error
        );
      }
    };
    const scheduleSceneApplication = () =>
      Promise.resolve()
        .then(() => {
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => {
              try {
                applySceneUpdate();
              } catch (error) {
                logDocumentCanvasWarning(
                  "Applying Excalidraw scene inside animation frame failed",
                  error
                );
              }
            });
          } else {
            applySceneUpdate();
          }
        })
        .catch((error) => {
          logDocumentCanvasWarning(
            "Deferred Excalidraw scene update promise rejected",
            error
          );
          applySceneUpdate();
        });
    const invokeUpdate = () => {
      try {
        scheduleSceneApplication();
        lastAppliedSceneSigRef.current = nextSig;
        lastAppliedCameraSigRef.current = nextCameraSig;
      } catch (error) {
        logDocumentCanvasWarning(
          "Scheduling Excalidraw scene application failed",
          error
        );
      }
    };
    const scheduleUpdateInvocation = () => {
      const enqueue = () => setTimeout(invokeUpdate, 0);
      if (typeof requestAnimationFrame === "function") {
        try {
          requestAnimationFrame(() => {
            try {
              requestAnimationFrame(enqueue);
            } catch (error) {
              logDocumentCanvasWarning(
                "Scheduling nested animation frame for Excalidraw scene update failed",
                error
              );
              enqueue();
            }
          });
        } catch (error) {
          logDocumentCanvasWarning(
            "Scheduling animation frame for Excalidraw scene update failed",
            error
          );
          enqueue();
        }
      } else {
        enqueue();
      }
    };
    scheduleUpdateInvocation();
  }, [scene, viewModeEnabled, zenModeEnabled]);

  // Removed imperative forcing of theme/view/zen; controlled via component props

  // Removed global LTR enforcement; rely on container-level dir only

  const handleApiReady = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      if (!didNotifyApiRef.current) {
        didNotifyApiRef.current = true;
        try {
          onApiReady(api);
        } catch (error) {
          logDocumentCanvasWarning(
            "Notifying parent of Excalidraw API readiness failed",
            error
          );
        }
      }
    },
    [onApiReady]
  );

  return (
    <div
      className={cn(
        "excali-theme-scope",
        "h-full",
        "w-full",
        hideToolbar && "excal-preview-hide-ui",
        hideHelpIcon && "excal-hide-help"
      )}
      dir={forceLTR ? "ltr" : undefined}
      ref={containerRef}
      style={{
        // Prevent scroll chaining into the canvas on touch devices so
        // the page can scroll back when keyboard toggles
        overflow: scrollable ? "auto" : "hidden",
        overscrollBehavior: "contain",
        touchAction: "manipulation",
        // NOTE: contain and willChange removed because they create a new containing block
        // that breaks position:fixed elements (like the eraser cursor shadow)
      }}
    >
      {hideToolbar ? (
        <style>
          {
            ".excal-preview-hide-ui .App-toolbar{display:none!important;}\n.excal-preview-hide-ui .App-toolbar-content{display:none!important;}\n.excal-preview-hide-ui .main-menu-trigger{display:none!important;}"
          }
        </style>
      ) : null}
      {hideHelpIcon ? (
        <style>{".excal-hide-help .help-icon{display:none!important;}"}</style>
      ) : (
        <style>{""}</style>
      )}
      <BaseDocumentCanvas
        langCode={langCode as unknown as string}
        mountReady={mountReady}
        onChange={deferredOnChange}
        theme={theme}
        {...(uiOptions ? { UIOptions: uiOptions } : {})}
        {...(initialData ? { initialData } : {})}
        onApiReady={handleApiReady}
        viewModeEnabled={Boolean(viewModeEnabled)}
        zenModeEnabled={Boolean(zenModeEnabled)}
      />
    </div>
  );
}

export const DocumentCanvas = memo(DocumentCanvasComponent);

// Keep Excalidraw sized on container/viewport changes
// Removed useExcalidrawResize hook and .refresh usage; rely on Excalidraw's internals
