"use client";

import { useEffect } from "react";

export function DvhInit() {
  useEffect(() => {
    const setDvh = () => {
      try {
        const vh = Math.max(
          0,
          Math.floor(
            (window?.visualViewport
              ? window.visualViewport.height
              : window.innerHeight) || 0
          )
        );
        document.documentElement.style.setProperty("--doc-dvh", `${vh}px`);
      } catch {
        // CSS custom property set failed - continue without dynamic viewport height
      }
    };

    setDvh();
    window.addEventListener("resize", setDvh);
    try {
      window.visualViewport?.addEventListener?.("resize", setDvh);
    } catch {
      // Visual viewport listener setup failed - continue without it
    }
    window.addEventListener("orientationchange", setDvh);
    return () => {
      window.removeEventListener("resize", setDvh);
      try {
        window.visualViewport?.removeEventListener?.("resize", setDvh);
      } catch {
        // Visual viewport listener cleanup failed - continue cleanup
      }
      window.removeEventListener("orientationchange", setDvh);
    };
  }, []);

  return null;
}
