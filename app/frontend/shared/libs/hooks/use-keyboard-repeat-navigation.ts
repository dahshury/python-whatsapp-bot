"use client";

import { useCallback, useEffect, useRef } from "react";

type UseKeyboardRepeatNavigationOptions = {
  onLeft: () => void;
  onRight: () => void;
  onCtrlUp?: () => void;
  onCtrlDown?: () => void;
  disabledLeft?: boolean;
  disabledRight?: boolean;
  startDelayMs?: number; // delay before repeat starts
  intervalMs?: number; // repeat interval
  isSidebarOpen?: boolean; // block left/right when sidebar is open
};

function isEditableElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  const contentEditable = (element as HTMLElement).isContentEditable;
  if (contentEditable) {
    return true;
  }
  const role = (element as HTMLElement).getAttribute("role");
  return role === "textbox" || role === "combobox";
}

export function useKeyboardRepeatNavigation({
  onLeft,
  onRight,
  onCtrlUp,
  onCtrlDown,
  disabledLeft = false,
  disabledRight = false,
  startDelayMs = 2000,
  intervalMs = 333,
  isSidebarOpen = false,
}: UseKeyboardRepeatNavigationOptions) {
  const leftActionRef = useRef(onLeft);
  const rightActionRef = useRef(onRight);
  const ctrlUpActionRef = useRef(onCtrlUp);
  const ctrlDownActionRef = useRef(onCtrlDown);
  const disabledLeftRef = useRef(disabledLeft);
  const disabledRightRef = useRef(disabledRight);
  const isSidebarOpenRef = useRef<boolean>(false);

  const leftHoldTimeoutRef = useRef<number | null>(null);
  const leftIntervalRef = useRef<number | null>(null);
  const rightHoldTimeoutRef = useRef<number | null>(null);
  const rightIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    leftActionRef.current = onLeft;
  }, [onLeft]);
  useEffect(() => {
    rightActionRef.current = onRight;
  }, [onRight]);
  useEffect(() => {
    ctrlUpActionRef.current = onCtrlUp;
  }, [onCtrlUp]);
  useEffect(() => {
    ctrlDownActionRef.current = onCtrlDown;
  }, [onCtrlDown]);
  useEffect(() => {
    disabledLeftRef.current = disabledLeft;
  }, [disabledLeft]);
  useEffect(() => {
    disabledRightRef.current = disabledRight;
  }, [disabledRight]);
  useEffect(() => {
    isSidebarOpenRef.current = Boolean(isSidebarOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen]);

  const clearLeft = useCallback(() => {
    if (leftHoldTimeoutRef.current !== null) {
      window.clearTimeout(leftHoldTimeoutRef.current);
      leftHoldTimeoutRef.current = null;
    }
    if (leftIntervalRef.current !== null) {
      window.clearInterval(leftIntervalRef.current);
      leftIntervalRef.current = null;
    }
  }, []);

  const clearRight = useCallback(() => {
    if (rightHoldTimeoutRef.current !== null) {
      window.clearTimeout(rightHoldTimeoutRef.current);
      rightHoldTimeoutRef.current = null;
    }
    if (rightIntervalRef.current !== null) {
      window.clearInterval(rightIntervalRef.current);
      rightIntervalRef.current = null;
    }
  }, []);

  const isInSidebar = useCallback((element: Element | null): boolean => {
    try {
      return !!(
        element && (element as HTMLElement).closest('[data-sidebar="sidebar"]')
      );
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore in editable contexts or when focus inside sidebar
      if (isEditableElement(document.activeElement)) {
        return;
      }
      if (isInSidebar(document.activeElement)) {
        return;
      }

      // Handle Ctrl/Cmd + ArrowUp/ArrowDown for view changes
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "ArrowUp" || e.key === "ArrowDown")
      ) {
        if (e.repeat) {
          return;
        }
        e.preventDefault();
        if (e.key === "ArrowUp") {
          ctrlUpActionRef.current?.();
        } else if (e.key === "ArrowDown") {
          ctrlDownActionRef.current?.();
        }
        return;
      }

      // Ignore other modifier combinations for left/right repeat handling
      if (e.altKey || e.metaKey || e.ctrlKey) {
        return;
      }
      // Block when sidebar is open
      if (isSidebarOpenRef.current) {
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return;
      }

      // Prevent default page scrolling
      e.preventDefault();

      if (e.key === "ArrowLeft") {
        if (e.repeat) {
          return; // ignore auto-repeat from OS
        }
        if (disabledLeftRef.current) {
          return;
        }
        leftActionRef.current(); // initial tick
        if (
          leftHoldTimeoutRef.current !== null ||
          leftIntervalRef.current !== null
        ) {
          return;
        }
        leftHoldTimeoutRef.current = window.setTimeout(() => {
          if (disabledLeftRef.current) {
            return;
          }
          leftActionRef.current();
          leftIntervalRef.current = window.setInterval(() => {
            if (disabledLeftRef.current) {
              clearLeft();
              return;
            }
            leftActionRef.current();
          }, intervalMs);
        }, startDelayMs);
      } else if (e.key === "ArrowRight") {
        if (e.repeat) {
          return;
        }
        if (disabledRightRef.current) {
          return;
        }
        rightActionRef.current();
        if (
          rightHoldTimeoutRef.current !== null ||
          rightIntervalRef.current !== null
        ) {
          return;
        }
        rightHoldTimeoutRef.current = window.setTimeout(() => {
          if (disabledRightRef.current) {
            return;
          }
          rightActionRef.current();
          rightIntervalRef.current = window.setInterval(() => {
            if (disabledRightRef.current) {
              clearRight();
              return;
            }
            rightActionRef.current();
          }, intervalMs);
        }, startDelayMs);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        clearLeft();
      } else if (e.key === "ArrowRight") {
        clearRight();
      }
    };

    const onBlur = () => {
      clearLeft();
      clearRight();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        clearLeft();
        clearRight();
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("keydown", onKeyDown as EventListener);
      window.removeEventListener("keyup", onKeyUp as EventListener);
      window.removeEventListener("blur", onBlur as EventListener);
      document.removeEventListener(
        "visibilitychange",
        onVisibility as EventListener
      );
      clearLeft();
      clearRight();
    };
  }, [clearLeft, clearRight, intervalMs, startDelayMs, isInSidebar]);
}
