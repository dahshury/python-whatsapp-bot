import { useTheme } from "next-themes";
import React from "react";
import { createPortal } from "react-dom";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { i18n } from "@/shared/libs/i18n";
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
  const { isLocalized } = useLanguageStore();

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
      container.className = "grid-fullscreen-portal";

      // Provide a separate portal above fullscreen content for overlays like the toolbar
      const overlayPortal = document.createElement("div");
      overlayPortal.id = "grid-fullscreen-overlay-portal";
      overlayPortal.className = "grid-fullscreen-overlay-portal";

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

  const fullscreenContent = (
    <div className={`grid-fullscreen-wrapper ${isDark ? "dark" : "light"}`}>
      <div className="grid-fullscreen-content">
        <div className="glide-grid-fullscreen-container">{children}</div>
        <div className="grid-fullscreen-esc-message rounded-md bg-background/80 px-3 py-1 text-muted-foreground backdrop-blur-sm">
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
