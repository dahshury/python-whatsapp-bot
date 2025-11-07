import { useTheme } from "next-themes";
import React from "react";
import { createPortal } from "react-dom";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";
import { useFullscreen } from "../contexts/FullscreenContext";

type FullscreenWrapperProps = {
  theme: Record<string, unknown>;
  darkTheme: Record<string, unknown>;
  children: React.ReactNode;
};

export const FullscreenWrapper: React.FC<FullscreenWrapperProps> = ({
  theme,
  darkTheme,
  children,
}) => {
  const { isFullscreen } = useFullscreen();
  const [mounted, setMounted] = React.useState(false);
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null);
  const { theme: appTheme } = useTheme();
  const { isLocalized } = useLanguage();

  // Handle SSR - wait for client mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if we're in dark mode - prioritize next-themes over internal theme
  const isDark = mounted ? appTheme === "dark" : theme === darkTheme;

  React.useEffect(() => {
    if (isFullscreen && mounted) {
      // Create a dedicated portal container for fullscreen content
      const container = document.createElement("div");
      container.id = "grid-fullscreen-portal";
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.right = "0";
      container.style.bottom = "0";
      container.style.width = "100vw";
      container.style.height = "100vh";
      container.style.zIndex =
        "var(--z-grid-fullscreen-backdrop, var(--z-fullscreen-backdrop))";
      container.style.pointerEvents = "auto";

      // Provide a separate portal above fullscreen content for overlays like the toolbar
      const overlayPortal = document.createElement("div");
      overlayPortal.id = "grid-fullscreen-overlay-portal";
      overlayPortal.style.position = "fixed";
      overlayPortal.style.top = "0";
      overlayPortal.style.left = "0";
      overlayPortal.style.width = "0";
      overlayPortal.style.height = "0";
      overlayPortal.style.overflow = "visible";
      overlayPortal.style.zIndex =
        "var(--z-grid-fullscreen-overlay, var(--z-enhanced-overlay, var(--z-fullscreen-content)))";
      overlayPortal.style.pointerEvents = "auto";

      // Copy theme classes
      if (document.documentElement.classList.contains("dark")) {
        container.classList.add("dark");
        overlayPortal.classList.add("dark");
      }

      document.body.appendChild(container);
      document.body.appendChild(overlayPortal);
      setPortalContainer(container);

      // Add a class to body to hide scrollbars
      document.body.classList.add("grid-fullscreen-active");

      return () => {
        try {
          container.remove();
        } catch {
          document.body.removeChild(container);
        }
        if (overlayPortal.parentNode) {
          try {
            overlayPortal.remove();
          } catch {
            overlayPortal.parentNode.removeChild(overlayPortal);
          }
        }
        document.body.classList.remove("grid-fullscreen-active");
        setPortalContainer(null);
      };
    }
    return;
  }, [isFullscreen, mounted]);

  if (!isFullscreen) {
    return <>{children}</>;
  }

  const wrapperStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: isDark ? "rgb(0 0 0 / 0.95)" : "rgb(255 255 255 / 0.95)",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column",
    zIndex: "var(--z-grid-fullscreen-backdrop, var(--z-fullscreen-backdrop))",
  };

  const contentStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "auto", // Allow scrolling when content is larger than viewport
    flex: 1,
  };

  const gridContainerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "60px", // Space for toolbar
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingBottom: "40px", // Space for ESC message
    boxSizing: "border-box",
    overflow: "auto", // Allow scrolling if content is larger
  };

  const fullscreenContent = (
    <div
      className={`grid-fullscreen-wrapper ${isDark ? "dark" : ""}`}
      style={wrapperStyle}
    >
      <div
        style={{
          ...contentStyle,
          position: "relative",
          zIndex:
            "var(--z-grid-fullscreen-content, var(--z-fullscreen-content))",
        }}
      >
        <div
          className="glide-grid-fullscreen-container"
          style={gridContainerStyle}
        >
          {children}
        </div>
        <div
          className="rounded-md bg-background/80 px-3 py-1 text-muted-foreground backdrop-blur-sm"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            fontSize: "12px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            zIndex:
              "var(--z-grid-fullscreen-content, var(--z-fullscreen-content))",
          }}
        >
          {i18n.getMessage("press_esc_to_exit_fullscreen", isLocalized)}
        </div>
      </div>
    </div>
  );

  // Always use portal for fullscreen to ensure it renders at body level
  if (mounted && portalContainer) {
    return createPortal(fullscreenContent, portalContainer);
  }

  // Fallback: render children normally if portal is not ready
  return <>{children}</>;
};
