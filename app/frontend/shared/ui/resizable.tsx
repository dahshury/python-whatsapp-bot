"use client";

import { GripVertical } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof PanelGroup>) => (
  <PanelGroup className={cn("flex h-full w-full", className)} {...props} />
);
ResizablePanelGroup.displayName = "ResizablePanelGroup";

const ResizablePanel = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Panel>) => (
  <Panel className={cn("flex flex-col", className)} {...props} />
);
ResizablePanel.displayName = "ResizablePanel";

type ResizableHandleProps = ComponentPropsWithoutRef<
  typeof PanelResizeHandle
> & {
  withHandle?: boolean;
};

const ResizableHandle = ({
  className,
  withHandle = false,
  ...props
}: ResizableHandleProps) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLElement | null>(null);
  const activeResizePointersRef = useRef<
    Map<number, { pointerType: string; hasReacquiredCapture: boolean }>
  >(new Map());

  useEffect(() => {
    if (withHandle && handleRef.current) {
      handleRef.current.className = `${handleRef.current.className}`;
    }
  }, [withHandle]);

  useEffect(() => {
    if (!withHandle) {
      return;
    }

    // Get the actual PanelResizeHandle element (parent of the grip)
    const grip = handleRef.current;
    if (!grip) {
      return;
    }

    const handle = grip.parentElement;
    if (!handle) {
      return;
    }

    resizeHandleRef.current = handle as HTMLElement;

    // Intercept pointerdown events in the capture phase BEFORE react-resizable-panels
    // can capture them. This allows us to check if the event started on the grip.
    const handlePointerDownCapture = (event: PointerEvent) => {
      // Only handle primary mouse button
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isOnGrip = target?.closest("[data-resize-handle-grip]");
      const isTouchLike = event.pointerType === "touch";

      // If the event started on the grip, allow it to proceed normally
      // so react-resizable-panels can handle the resize
      if (isOnGrip) {
        if (isTouchLike && event.cancelable) {
          event.preventDefault();
        }

        if (
          isTouchLike &&
          handle instanceof HTMLElement &&
          "setPointerCapture" in handle &&
          !handle.hasPointerCapture?.(event.pointerId)
        ) {
          try {
            handle.setPointerCapture(event.pointerId);
          } catch {
            // Ignore pointer capture failures
          }
        }

        return;
      }

      // If the event didn't start on the grip, prevent react-resizable-panels
      // from capturing it by stopping immediate propagation
      event.stopImmediatePropagation();

      // Release pointer capture from the handle if it has it
      // This prevents react-resizable-panels from interfering with the drag
      if (handle.hasPointerCapture?.(event.pointerId)) {
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore errors if release fails
        }
      }

      // Find the element below the handle and forward the event to it
      const previousPointerEvents = handle.style.pointerEvents;
      handle.style.pointerEvents = "none";
      const elementBelow = document.elementFromPoint(
        event.clientX,
        event.clientY
      ) as HTMLElement | null;
      handle.style.pointerEvents = previousPointerEvents;

      if (elementBelow && elementBelow !== handle) {
        // Create a new pointer event and dispatch it to the element below
        // This allows the canvas to receive the drag event properly
        const forwardedEvent = new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          button: event.button,
          buttons: event.buttons,
          pressure: event.pressure,
          tangentialPressure: event.tangentialPressure,
          width: event.width,
          height: event.height,
          tiltX: event.tiltX,
          tiltY: event.tiltY,
          twist: event.twist,
          isPrimary: event.isPrimary,
        });

        // Dispatch the event to the element below so it can handle the drag
        elementBelow.dispatchEvent(forwardedEvent);

        // Ensure the element below captures the pointer so it receives
        // all subsequent pointermove and pointerup events
        if (
          elementBelow instanceof Element &&
          "setPointerCapture" in elementBelow
        ) {
          try {
            elementBelow.setPointerCapture(event.pointerId);
          } catch {
            // Ignore errors if pointer capture fails
            // (e.g., element doesn't support it or pointerId is invalid)
          }
        }
      }

      // Prevent default to stop any other handlers
      event.preventDefault();
    };

    // Use capture phase to intercept BEFORE react-resizable-panels
    handle.addEventListener("pointerdown", handlePointerDownCapture, {
      capture: true,
      passive: false,
    });

    return () => {
      handle.removeEventListener("pointerdown", handlePointerDownCapture, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [withHandle]);

  useEffect(() => {
    if (!withHandle) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    const grip = handleRef.current;
    if (!grip) {
      return;
    }

    const handle = grip.parentElement;
    if (!handle) {
      return;
    }

    const root = document.documentElement;

    const shouldApplyGlobalResizeState = (pointerType: string) =>
      pointerType !== "touch";

    const setRootResizingState = () => {
      root.setAttribute("data-panel-resizing", "true");
    };

    const clearRootResizingStateIfIdle = () => {
      // Ensure the ref is always a Map (defensive check for edge cases)
      if (!(activeResizePointersRef.current instanceof Map)) {
        activeResizePointersRef.current = new Map();
      }
      if (activeResizePointersRef.current.size === 0) {
        root.removeAttribute("data-panel-resizing");
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      // Only track events that start on the grip to avoid conflicts
      const target = event.target as HTMLElement | null;
      const isOnGrip = target?.closest("[data-resize-handle-grip]");

      if (!(isOnGrip && event.isPrimary)) {
        return;
      }

      // Ensure the ref is always a Map (defensive check for edge cases)
      if (!(activeResizePointersRef.current instanceof Map)) {
        activeResizePointersRef.current = new Map();
      }

      const pointerType = event.pointerType;
      const isTouchLike = pointerType === "touch";

      activeResizePointersRef.current.set(event.pointerId, {
        pointerType,
        hasReacquiredCapture: false,
      });

      if (shouldApplyGlobalResizeState(pointerType)) {
        setRootResizingState();
      }

      if (
        isTouchLike &&
        resizeHandleRef.current &&
        "setPointerCapture" in resizeHandleRef.current
      ) {
        try {
          resizeHandleRef.current.setPointerCapture(event.pointerId);
        } catch {
          // Ignore pointer capture failures
        }
      }

      if (isTouchLike && event.cancelable) {
        event.preventDefault();
      }
    };

    const handlePointerEnd = (event: PointerEvent) => {
      // Ensure the ref is always a Map (defensive check for edge cases)
      if (!(activeResizePointersRef.current instanceof Map)) {
        activeResizePointersRef.current = new Map();
      }

      const pointerMeta = activeResizePointersRef.current.get(event.pointerId);
      if (!pointerMeta) {
        return;
      }

      // IMPORTANT: Only reacquire pointer capture for touch input
      if (
        event.type === "lostpointercapture" &&
        pointerMeta.pointerType === "touch" &&
        !pointerMeta.hasReacquiredCapture &&
        resizeHandleRef.current &&
        "setPointerCapture" in resizeHandleRef.current &&
        !resizeHandleRef.current.hasPointerCapture?.(event.pointerId)
      ) {
        try {
          resizeHandleRef.current.setPointerCapture(event.pointerId);
          activeResizePointersRef.current.set(event.pointerId, {
            pointerType: pointerMeta.pointerType,
            hasReacquiredCapture: true,
          });
          return;
        } catch {
          // Ignore pointer capture failures and proceed with cleanup
        }
      }

      activeResizePointersRef.current.delete(event.pointerId);
      clearRootResizingStateIfIdle();
    };

    // Use capture phase to track resize state, but only for grip-initiated drags
    handle.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: false,
    });
    handle.addEventListener("lostpointercapture", handlePointerEnd);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      handle.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      } as EventListenerOptions);
      handle.removeEventListener("lostpointercapture", handlePointerEnd);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      // Ensure the ref is a Map before clearing (defensive check)
      if (activeResizePointersRef.current instanceof Map) {
        activeResizePointersRef.current.clear();
      } else {
        activeResizePointersRef.current = new Map();
      }
      root.removeAttribute("data-panel-resizing");
    };
  }, [withHandle]);

  return (
    <PanelResizeHandle
      className={cn(
        // biome-ignore lint: Custom grouping of Tailwind classes for the resize handle
        "flex relative items-center justify-center bg-transparent touch-none select-none overflow-visible focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring",
        // biome-ignore lint: Custom grouping of Tailwind classes for the resize handle
        "data-[panel-group-direction=horizontal]:h-full data-[panel-group-direction=horizontal]:w-px data-[panel-group-direction=horizontal]:mx-1",
        // biome-ignore lint: Custom grouping of Tailwind classes for the resize handle
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:my-1",
        // Remove the before pseudo-element line - only show the grip handle
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-auto absolute top-1/2 left-1/2 z-50 flex h-5 w-4 items-center justify-center rounded-sm border border-input bg-background shadow-sm"
          data-resize-handle-grip
          ref={handleRef}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      ) : null}
    </PanelResizeHandle>
  );
};
ResizableHandle.displayName = "ResizableHandle";

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
