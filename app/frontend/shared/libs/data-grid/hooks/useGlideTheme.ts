import { useEffect, useState } from "react";
import { createGlideTheme } from "@/shared/libs/data-grid/components/utils/streamlitGlideTheme";

const THEME_SETTLE_DELAY_MS = 50;

export function useGlideTheme(isDarkMode: boolean) {
  const [gridTheme, setGridTheme] = useState(() =>
    createGlideTheme(isDarkMode ? "dark" : "light")
  );

  // Respond to isDarkMode prop changes
  useEffect(() => {
    try {
      setGridTheme(createGlideTheme(isDarkMode ? "dark" : "light"));
      setTimeout(() => {
        try {
          setGridTheme(createGlideTheme(isDarkMode ? "dark" : "light"));
        } catch (_err) {
          /* ignore theme recompute errors */
        }
      }, THEME_SETTLE_DELAY_MS);
    } catch (_err) {
      /* ignore theme recompute errors */
    }
  }, [isDarkMode]);

  // Observe documentElement class changes to keep theme in sync with CSS flips
  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {
        /* noop on server */
      };
    }
    const el = document.documentElement;
    let prev = el.className;

    const schedule = () => {
      try {
        setTimeout(() => {
          const dark = el.classList.contains("dark");
          setGridTheme(createGlideTheme(dark ? "dark" : "light"));
        }, THEME_SETTLE_DELAY_MS);
      } catch (_err) {
        /* ignore scheduling errors */
      }
    };

    const mo = new MutationObserver(() => {
      if (el.className !== prev) {
        prev = el.className;
        schedule();
      }
    });
    try {
      mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    } catch (_err) {
      /* ignore observer errors */
    }
    return () => {
      try {
        mo.disconnect();
      } catch (_err) {
        /* ignore disconnect errors */
      }
    };
  }, []);

  return gridTheme;
}
