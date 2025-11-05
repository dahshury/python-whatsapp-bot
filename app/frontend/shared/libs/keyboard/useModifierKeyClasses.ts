import { useEffect } from "react";

export function useModifierKeyClasses(
  getContainer?: () => HTMLElement | null | undefined
) {
  useEffect(() => {
    const refresh = (e?: KeyboardEvent | MouseEvent) => {
      const hasAlt = !!(
        e &&
        "altKey" in e &&
        (e as KeyboardEvent | MouseEvent).altKey
      );
      const hasShift = !!(
        e &&
        "shiftKey" in e &&
        (e as KeyboardEvent | MouseEvent).shiftKey
      );
      if (hasAlt) {
        document.body.classList.add("alt-pressed");
      } else {
        document.body.classList.remove("alt-pressed");
      }
      if (hasShift) {
        document.body.classList.add("shift-pressed");
      } else {
        document.body.classList.remove("shift-pressed");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => refresh(e);
    const handleKeyUp = (e: KeyboardEvent) => refresh(e);
    const handleBlur = () => {
      document.body.classList.remove("alt-pressed");
      document.body.classList.remove("shift-pressed");
    };
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        handleBlur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.body.classList.remove("alt-pressed");
      document.body.classList.remove("shift-pressed");
    };
  }, []);

  useEffect(() => {
    const container = getContainer?.();
    if (!container) {
      return;
    }
    const updateFromMouse = (e: MouseEvent) => {
      if (e.altKey) {
        document.body.classList.add("alt-pressed");
      } else {
        document.body.classList.remove("alt-pressed");
      }
      if (e.shiftKey) {
        document.body.classList.add("shift-pressed");
      } else {
        document.body.classList.remove("shift-pressed");
      }
    };
    const clear = () => {
      document.body.classList.remove("alt-pressed");
    };
    container.addEventListener("mousemove", updateFromMouse);
    container.addEventListener("mouseenter", updateFromMouse);
    container.addEventListener("mouseleave", () => {
      clear();
      document.body.classList.remove("shift-pressed");
    });
    return () => {
      container.removeEventListener("mousemove", updateFromMouse);
      container.removeEventListener("mouseenter", updateFromMouse);
      container.removeEventListener("mouseleave", clear);
      clear();
    };
  }, [getContainer]);
}
