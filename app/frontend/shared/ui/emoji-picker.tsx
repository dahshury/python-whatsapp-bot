"use client";

import { cn } from "@shared/libs/utils";
import { useTheme } from "next-themes";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { logger } from "@/shared/libs/logger";

// Type declarations for emoji-picker-element
declare global {
  // biome-ignore lint: Required for JSX type augmentation with web components
  namespace JSX {
    // biome-ignore lint: Required for JSX.IntrinsicElements
    interface IntrinsicElements {
      "emoji-picker": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          class?: string;
          "data-slot"?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface EmojiClickEvent extends CustomEvent {
  detail: {
    emoji: {
      annotation: string;
      group: number;
      order: number;
      shortcodes: string[];
      tags: string[];
      unicode: string;
      version: number;
    };
    skinTone: number;
    unicode: string;
  };
}

export interface EmojiPickerProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onEmojiSelect"> {
  className?: string;
  onEmojiSelect?: (params: { emoji: string }) => void;
}

/**
 * EmojiPicker component wrapper around emoji-picker-element
 */
export function EmojiPicker({
  className,
  onEmojiSelect,
  ...props
}: EmojiPickerProps) {
  const pickerRef = useRef<HTMLElement>(null);
  const { resolvedTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  // Dynamically import emoji-picker-element only on client side
  // to avoid requestAnimationFrame error during SSR
  useEffect(() => {
    // Only import on client side
    if (typeof window !== "undefined" && !isLoaded) {
      import("emoji-picker-element")
        .then(() => {
          setIsLoaded(true);
        })
        .catch((error) => {
          logger.error("Failed to load emoji-picker-element", error);
        });
    }
  }, [isLoaded]);

  // Handle emoji selection - wait for picker to be ready
  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) {
      return;
    }
    if (!onEmojiSelect) {
      return;
    }

    const INIT_RETRY_DELAY_MS = 50;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cleanup: (() => void) | null = null;

    const setupEmojiClickHandler = () => {
      // Wait for the picker to be fully initialized
      if (!picker.shadowRoot) {
        timeoutId = setTimeout(setupEmojiClickHandler, INIT_RETRY_DELAY_MS);
        return;
      }

      const handleEmojiClick = (event: Event) => {
        const customEvent = event as EmojiClickEvent;
        if (customEvent.detail?.unicode) {
          onEmojiSelect({ emoji: customEvent.detail.unicode });
        }
      };

      picker.addEventListener("emoji-click", handleEmojiClick);

      cleanup = () => {
        picker.removeEventListener("emoji-click", handleEmojiClick);
      };
    };

    setupEmojiClickHandler();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [onEmojiSelect]);

  // Sync dark mode with app theme
  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) {
      return;
    }

    // Remove existing theme classes
    picker.classList.remove("dark", "light");

    // Add appropriate theme class based on resolved theme
    if (resolvedTheme === "dark") {
      picker.classList.add("dark");
    } else if (resolvedTheme === "light") {
      picker.classList.add("light");
    }
    // If resolvedTheme is undefined or "system", emoji-picker-element will use prefers-color-scheme
  }, [resolvedTheme]);

  // Inject custom scrollbar styles and handle wheel events
  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) {
      return;
    }

    const SHADOW_ROOT_RETRY_DELAY_MS = 50;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cleanup: (() => void) | null = null;

    // Wait for shadow root to be ready
    const setupShadowDOM = () => {
      const shadowRoot = picker.shadowRoot;
      if (!shadowRoot) {
        // Shadow root not ready yet, try again
        timeoutId = setTimeout(setupShadowDOM, SHADOW_ROOT_RETRY_DELAY_MS);
        return;
      }

      // Inject custom scrollbar styles into Shadow DOM
      const styleId = "emoji-picker-scrollbar-styles";
      // Remove existing style if it exists (for theme updates)
      const existingStyle = shadowRoot.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      // Get computed CSS variable values from the host element
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const isDark = resolvedTheme === "dark";
      const muted =
        computedStyle.getPropertyValue("--muted").trim() || "0 0% 14.9%";
      const mutedForeground =
        computedStyle.getPropertyValue("--muted-foreground").trim() ||
        "0 0% 63.9%";
      const primary =
        computedStyle.getPropertyValue("--primary").trim() || "0 0% 98%";
      const radiusValue =
        computedStyle.getPropertyValue("--radius").trim() || "0.5rem";

      // Convert radius to a numeric value for calculations (assuming rem or px)
      const THUMB_RADIUS_REDUCTION = 0.1;
      const radiusNum = Number.parseFloat(radiusValue);
      const radiusUnit = radiusValue.replace(/[0-9.]/g, "");
      // Thumb radius should be slightly smaller to account for the border spacing
      const thumbRadius = `${Math.max(0, radiusNum - THUMB_RADIUS_REDUCTION)}${radiusUnit}`;

      // Match phone-dropdown-scrollbar colors exactly (from themed-scrollbar.css)
      // Base (light): track 0.3/0.5, thumb 0.5/0.7
      // Dark: track 0.2/0.3, thumb 0.3/0.5
      const trackBg = isDark ? "0.2" : "0.3";
      const trackHoverBg = isDark ? "0.3" : "0.5";
      const thumbBg = isDark ? "0.3" : "0.5";
      const thumbHoverBg = isDark ? "0.5" : "0.7";

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
					/* Custom scrollbar styles matching phone-dropdown-scrollbar exactly */
					/* Track width: 18px (15px * 1.2), Thumb: 14.4px with 1.8px margins */
					::-webkit-scrollbar {
						width: 18px;
					}
					::-webkit-scrollbar-track {
						background-color: hsl(${muted} / ${trackBg});
						border-radius: ${radiusValue};
						transition: background-color 0.2s ease, opacity 0.2s ease;
						user-select: none;
					}
					::-webkit-scrollbar-track:hover {
						background-color: hsl(${muted} / ${trackHoverBg});
					}
					::-webkit-scrollbar-thumb {
						background-color: hsl(${mutedForeground} / ${thumbBg});
						border-radius: ${thumbRadius};
						cursor: grab;
						/* Create 1.8px margin on each side to match phone-dropdown-scrollbar */
						border-left: 1.8px solid transparent;
						border-right: 1.8px solid transparent;
						background-clip: padding-box;
						transition: background-color 0.2s ease;
					}
					::-webkit-scrollbar-thumb:hover {
						background-color: hsl(${mutedForeground} / ${thumbHoverBg});
					}
					::-webkit-scrollbar-thumb:active {
						background-color: hsl(${primary});
						cursor: grabbing;
					}
					/* Firefox */
					* {
						scrollbar-width: auto;
						scrollbar-color: hsl(${mutedForeground} / ${thumbBg}) hsl(${muted} / ${trackBg});
					}
				`;
      shadowRoot.appendChild(style);

      const handleWheel = (event: WheelEvent) => {
        // Try to find the scrollable viewport element
        let viewport: HTMLElement | null = null;

        // Find any element with overflow-y: auto or scroll
        const allDivs = shadowRoot.querySelectorAll("div");
        for (const div of allDivs) {
          const htmlDiv = div as HTMLElement;
          const divStyle = window.getComputedStyle(htmlDiv);
          if (
            (divStyle.overflowY === "auto" ||
              divStyle.overflowY === "scroll") &&
            htmlDiv.scrollHeight > htmlDiv.clientHeight
          ) {
            viewport = htmlDiv;
            break;
          }
        }

        if (viewport) {
          // Forward the wheel event to the scrollable area
          viewport.scrollTop += event.deltaY;
          event.preventDefault();
          event.stopPropagation();
        }
      };

      picker.addEventListener("wheel", handleWheel, { passive: false });

      cleanup = () => {
        picker.removeEventListener("wheel", handleWheel);
      };
    };

    setupShadowDOM();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
    // Note: resolvedTheme dependency is intentional to update scrollbar colors when theme changes
  }, [resolvedTheme]);

  // Don't render until the library is loaded to avoid SSR errors
  if (!isLoaded) {
    return (
      <div
        className={cn(
          "flex h-[21.375rem] w-[21.375rem] items-center justify-center rounded-lg border",
          className
        )}
      >
        <div className="text-muted-foreground text-sm">
          Loading emoji picker...
        </div>
      </div>
    );
  }

  return (
    // @ts-expect-error - emoji-picker-element is a web component, TypeScript doesn't recognize it
    <emoji-picker
      className={cn("h-[21.375rem] w-[21.375rem] rounded-lg border", className)}
      data-slot="emoji-picker"
      ref={pickerRef}
      {...props}
    />
  );
}

// Legacy exports for backwards compatibility
// These are no longer needed but kept for compatibility
export function EmojiPickerSearch() {
  // emoji-picker-element has built-in search, so this is a no-op
  return null;
}

export function EmojiPickerContent() {
  // emoji-picker-element has built-in content, so this is a no-op
  return null;
}

export function EmojiPickerFooter() {
  // emoji-picker-element has built-in footer, so this is a no-op
  return null;
}
