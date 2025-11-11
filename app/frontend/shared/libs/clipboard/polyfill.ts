"use client";

import {
  ClipboardItem as ClipboardItemPolyfill,
  read,
  readText,
  write,
  writeText,
} from "clipboard-polyfill";

/**
 * Clipboard polyfill initialization using clipboard-polyfill library.
 * This provides full clipboard API support across all browsers and devices,
 * including proper handling of images, SVGs, and rich content on mobile.
 *
 * The clipboard-polyfill library properly handles:
 * - Text copying and pasting
 * - Image copying and pasting (PNG, JPEG, SVG)
 * - Rich content (HTML)
 * - Mobile device compatibility
 * - Fallback to legacy execCommand when needed
 */

if (typeof window !== "undefined" && typeof navigator !== "undefined") {
  // Install the polyfill if clipboard API is not available or incomplete
  const nav = navigator as Navigator & {
    clipboard?: Clipboard;
  };

  // Override navigator.clipboard with the polyfilled version
  // This ensures all clipboard operations use the polyfill
  if (!nav.clipboard || typeof nav.clipboard.write !== "function") {
    Object.defineProperty(nav, "clipboard", {
      configurable: true,
      enumerable: false,
      value: {
        write,
        writeText,
        read,
        readText,
      },
    });
  }

  // Install ClipboardItem polyfill
  if (typeof window.ClipboardItem === "undefined") {
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: ClipboardItemPolyfill,
    });
  }
}
