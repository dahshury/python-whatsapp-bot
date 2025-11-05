import type React from "react";

export function getGridContainerStyles(
  isFullscreen: boolean,
  fullWidth: boolean
): React.CSSProperties {
  return {
    width: isFullscreen || fullWidth ? "100%" : "fit-content",
    maxWidth: "100%",
    height: "auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    margin: "0 auto",
  };
}

export function getGridContainerClasses(
  fullWidth: boolean,
  isFullscreen: boolean
): string {
  const containerClass = fullWidth
    ? "glide-grid-fullwidth glide-grid-inner-full"
    : "";
  const fullscreenClass = isFullscreen ? "glide-grid-fullscreen-editor" : "";
  return `${containerClass} ${fullscreenClass}`.trim();
}
