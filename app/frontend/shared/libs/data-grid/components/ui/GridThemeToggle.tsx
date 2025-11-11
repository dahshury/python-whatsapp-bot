import type { Theme } from "@glideapps/glide-data-grid";
import type React from "react";

type GridThemeToggleProps = {
  currentTheme: Partial<Theme>;
  lightTheme: Partial<Theme>;
  darkTheme: Partial<Theme>;
  iconColor: string;
  filteredRowCount: number;
  onThemeChange: (theme: Partial<Theme>) => void;
};

export const GridThemeToggle: React.FC<GridThemeToggleProps> = ({
  currentTheme,
  lightTheme,
  darkTheme,
  iconColor,
  filteredRowCount,
  onThemeChange,
}) => (
  <div
    className={`grid-theme-toggle ${currentTheme === darkTheme ? "dark" : ""}`}
  >
    <span
      className="grid-theme-toggle-label"
      style={{ "--gdg-theme-toggle-text": iconColor } as React.CSSProperties}
    >
      Theme:
    </span>
    <button
      className={`grid-theme-toggle-button ${currentTheme === lightTheme ? "active" : ""}`}
      onClick={() => onThemeChange(lightTheme)}
      type="button"
    >
      Light
    </button>
    <button
      className={`grid-theme-toggle-button ${currentTheme === darkTheme ? "active" : ""}`}
      onClick={() => onThemeChange(darkTheme)}
      type="button"
    >
      Dark
    </button>
    <span
      className="grid-theme-toggle-info"
      style={{ "--gdg-theme-toggle-text": iconColor } as React.CSSProperties}
    >
      Rows: {filteredRowCount} | Press Ctrl+F to search | Right-click column
      headers for options
    </span>
  </div>
);
