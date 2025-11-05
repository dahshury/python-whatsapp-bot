import { useSettings } from "@shared/libs/state/settings-context";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createGlideTheme } from "@/shared/libs/data-grid/components/utils/streamlitGlideTheme";

const THEME_UPDATE_DELAY_MS = 50;

export function useGridTheme(): {
  gridTheme: ReturnType<typeof createGlideTheme>;
} {
  const { theme: appTheme } = useTheme();
  const { theme: _styleTheme } = useSettings();
  const isDarkMode = appTheme === "dark";
  const [gridTheme, setGridTheme] = useState(() =>
    createGlideTheme(isDarkMode ? "dark" : "light")
  );

  useEffect(() => {
    try {
      setGridTheme(createGlideTheme(isDarkMode ? "dark" : "light"));
      setTimeout(() => {
        try {
          setGridTheme(createGlideTheme(isDarkMode ? "dark" : "light"));
        } catch {
          // Ignore errors in secondary theme update
        }
      }, THEME_UPDATE_DELAY_MS);
    } catch {
      // Ignore errors in initial theme update
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const el = document.documentElement;
    let prev = el.className;
    const schedule = () => {
      try {
        setTimeout(() => {
          const dark = el.classList.contains("dark");
          setGridTheme(createGlideTheme(dark ? "dark" : "light"));
        }, THEME_UPDATE_DELAY_MS);
      } catch {
        // Ignore errors scheduling theme update
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
    } catch {
      // Ignore errors observing DOM mutations
    }
    return () => {
      try {
        mo.disconnect();
      } catch {
        // Ignore errors disconnecting mutation observer
      }
    };
  }, []);

  return { gridTheme };
}
