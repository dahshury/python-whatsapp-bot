"use client";

import {
  X as Close,
  Trash2 as Delete,
  Download,
  Eye,
  Maximize,
  Plus,
  Redo,
  Search,
  Undo,
} from "lucide-react";
import React from "react";
import { MenuBar } from "@/shared/ui/bottom-menu";
import type { GridToolbarHiddenAction } from "../../core/types/grid";

type GridToolbarProps = {
  isFocused: boolean;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasHiddenColumns: boolean;
  onClearSelection: () => void;
  onDeleteRows: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddRow: () => void;
  onToggleColumnVisibility: () => void;
  onDownloadCsv: () => void;
  onToggleSearch: () => void;
  onToggleFullscreen: () => void;
  onClose?: () => void;
  overlay?: boolean;
  overlayPosition?: { top: number; left: number } | null;
  toolbarAnchor?: "overlay" | "inline";
  alwaysVisible?: boolean;
  hiddenActions?: GridToolbarHiddenAction[];
};

// Legacy toolbar button removed after MenuBar integration

// Use rem-based sizing; increase by ~30% relative to previous size
const ICON_SIZE = 16; // was 12px; ~33% increase
const TOOLBAR_HIDE_DELAY_MS = 250;
const OVERLAY_TOOLBAR_BUFFER_Y = 36;
const INLINE_TOOLBAR_BUFFER_Y = 28;

export const GridToolbar: React.FC<GridToolbarProps> = ({
  isFocused,
  hasSelection,
  canUndo,
  canRedo,
  hasHiddenColumns,
  onClearSelection,
  onDeleteRows,
  onUndo,
  onRedo,
  onAddRow,
  onToggleColumnVisibility,
  onDownloadCsv,
  onToggleSearch,
  onToggleFullscreen,
  onClose,
  overlay = false,
  overlayPosition,
  toolbarAnchor = "overlay",
  alwaysVisible = false,
  hiddenActions = [],
}) => {
  const [isToolbarHovered, setIsToolbarHovered] = React.useState(false);
  const hiddenActionSet = React.useMemo(
    () => new Set(hiddenActions),
    [hiddenActions]
  );
  const shouldShow =
    alwaysVisible || isFocused || isToolbarHovered || hasSelection;
  const [isShown, setIsShown] = React.useState<boolean>(false);
  const hideTimerRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const hasOverlayPosition =
    overlayPosition !== undefined &&
    overlayPosition !== null &&
    Number.isFinite(overlayPosition.top) &&
    Number.isFinite(overlayPosition.left);
  const effectiveOverlayPosition = hasOverlayPosition
    ? overlayPosition
    : { top: 0, left: 0 };

  // Calculate hover buffer Y offset based on toolbar anchor type
  let hoverBufferY = 0;
  if (overlay && toolbarAnchor === "overlay") {
    hoverBufferY = OVERLAY_TOOLBAR_BUFFER_Y;
  } else if (toolbarAnchor === "inline") {
    hoverBufferY = INLINE_TOOLBAR_BUFFER_Y;
  }

  const handlePointerEnter = React.useCallback(() => {
    setIsToolbarHovered(true);
  }, []);

  const handlePointerLeave = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const node = containerRef.current;
      if (!node) {
        setIsToolbarHovered(false);
        return;
      }
      const nextTarget = event.relatedTarget;
      if (
        nextTarget &&
        nextTarget instanceof Node &&
        node.contains(nextTarget)
      ) {
        return;
      }
      setIsToolbarHovered(false);
    },
    []
  );

  const handleFocusCapture = React.useCallback(() => {
    setIsToolbarHovered(true);
  }, []);

  const handleBlurCapture = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const node = containerRef.current;
      if (!node) {
        setIsToolbarHovered(false);
        return;
      }
      const nextTarget = event.relatedTarget;
      if (
        nextTarget &&
        nextTarget instanceof Node &&
        node.contains(nextTarget)
      ) {
        return;
      }
      setIsToolbarHovered(false);
    },
    []
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        setIsToolbarHovered(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (shouldShow) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setIsShown(true);
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsShown(false);
      hideTimerRef.current = null;
    }, TOOLBAR_HIDE_DELAY_MS);
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [shouldShow]);

  const isOverlayAnchor = overlay && toolbarAnchor === "overlay";

  let anchorModeClass: "overlay" | "inline" | "default" = "default";
  if (isOverlayAnchor) {
    anchorModeClass = "overlay";
  } else if (toolbarAnchor === "inline") {
    anchorModeClass = "inline";
  }

  const containerClassName = [
    "glide-grid-toolbar-container",
    isShown ? "visible" : undefined,
    anchorModeClass,
  ]
    .filter(Boolean)
    .join(" ");

  const toolbarClassName = [
    "glide-grid-toolbar-inner",
    isShown ? "visible" : undefined,
    anchorModeClass,
  ]
    .filter(Boolean)
    .join(" ");

  const toolbarStyle: React.CSSProperties = {
    ...(isOverlayAnchor &&
      hasOverlayPosition && {
        "--gdg-toolbar-top": `${effectiveOverlayPosition.top}px`,
        "--gdg-toolbar-left": `${effectiveOverlayPosition.left}px`,
        position: "fixed",
        top: `${effectiveOverlayPosition.top}px`,
        left: `${effectiveOverlayPosition.left}px`,
        transform: "translate(-100%, 0)",
      }),
    ...(hoverBufferY > 0 && {
      paddingTop: hoverBufferY,
      marginTop: -hoverBufferY,
    }),
  };

  return (
    <div
      className={containerClassName}
      data-has-position={isOverlayAnchor ? hasOverlayPosition : undefined}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={toolbarStyle}
    >
      <div
        aria-label="Grid toolbar"
        onBlurCapture={handleBlurCapture}
        onFocusCapture={handleFocusCapture}
        onKeyDown={handleKeyDown}
        ref={containerRef}
        role="toolbar"
      >
        <div className={toolbarClassName}>
          <MenuBar
            buttonClassName="w-[1.3rem] h-[1.3rem] p-0 hover:bg-muted/80"
            iconWrapperClassName="w-[1rem] h-[1rem]"
            items={[
              ...(hasSelection
                ? [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Close {...p} size={ICON_SIZE} />
                      ),
                      label: "Clear selection",
                      onClick: onClearSelection,
                    },
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Delete {...p} size={ICON_SIZE} />
                      ),
                      label: "Delete selected rows",
                      onClick: onDeleteRows,
                    },
                  ]
                : []),
              {
                icon: (p: React.SVGProps<SVGSVGElement>) => (
                  <Undo {...p} size={ICON_SIZE} />
                ),
                label: "Undo (Ctrl+Z)",
                onClick: onUndo,
                disabled: !canUndo,
              },
              {
                icon: (p: React.SVGProps<SVGSVGElement>) => (
                  <Redo {...p} size={ICON_SIZE} />
                ),
                label: "Redo (Ctrl+Shift+Z)",
                onClick: onRedo,
                disabled: !canRedo,
              },
              ...(hasSelection
                ? []
                : [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Plus {...p} size={ICON_SIZE} />
                      ),
                      label: "Add row",
                      onClick: onAddRow,
                    },
                  ]),
              ...(hasHiddenColumns
                ? [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Eye {...p} size={ICON_SIZE} />
                      ),
                      label: "Show/hide columns",
                      onClick: onToggleColumnVisibility,
                    },
                  ]
                : []),
              ...(hiddenActionSet.has("downloadCsv")
                ? []
                : [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Download {...p} size={ICON_SIZE} />
                      ),
                      label: "Download as CSV",
                      onClick: onDownloadCsv,
                    },
                  ]),
              ...(hiddenActionSet.has("search")
                ? []
                : [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Search {...p} size={ICON_SIZE} />
                      ),
                      label: "Search",
                      onClick: onToggleSearch,
                    },
                  ]),
              ...(hiddenActionSet.has("fullscreen")
                ? []
                : [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Maximize {...p} size={ICON_SIZE} />
                      ),
                      label: "Toggle fullscreen",
                      onClick: onToggleFullscreen,
                    },
                  ]),
              ...(onClose
                ? [
                    {
                      icon: (p: React.SVGProps<SVGSVGElement>) => (
                        <Close {...p} size={ICON_SIZE} />
                      ),
                      label: "Close",
                      onClick: onClose,
                    },
                  ]
                : []),
            ]}
            menuClassName="h-[1.15rem] px-2 rounded-[0.25rem] border border-border/50 shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};
