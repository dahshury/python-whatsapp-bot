"use client";

import { useEffect, useState } from "react";

// Hook to get theme colors for charts
export function useThemeColors() {
  const [colors, setColors] = useState({
    primary: "hsl(var(--chart-1))",
    secondary: "hsl(var(--chart-2))",
    tertiary: "hsl(var(--chart-3))",
    quaternary: "hsl(var(--chart-4))",
    quinary: "hsl(var(--chart-5))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    muted: "hsl(var(--muted))",
    border: "hsl(var(--border))",
    card: "hsl(var(--card))",
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      setColors({
        primary: `hsl(${computedStyle.getPropertyValue("--chart-1")})`,
        secondary: `hsl(${computedStyle.getPropertyValue("--chart-2")})`,
        tertiary: `hsl(${computedStyle.getPropertyValue("--chart-3")})`,
        quaternary: `hsl(${computedStyle.getPropertyValue("--chart-4")})`,
        quinary: `hsl(${computedStyle.getPropertyValue("--chart-5")})`,
        background: `hsl(${computedStyle.getPropertyValue("--background")})`,
        foreground: `hsl(${computedStyle.getPropertyValue("--foreground")})`,
        muted: `hsl(${computedStyle.getPropertyValue("--muted")})`,
        border: `hsl(${computedStyle.getPropertyValue("--border")})`,
        card: `hsl(${computedStyle.getPropertyValue("--card")})`,
      });
    };

    updateColors();

    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
