"use client";

import {
  fallbackCopyToClipboard,
  fallbackReadFromClipboard,
} from "./clipboard";

type ClipboardItemSource = Record<string, Promise<Blob> | Blob>;

class PolyfillClipboardItem {
  readonly types: string[];
  readonly #items: Record<string, Promise<Blob>>;

  constructor(items: ClipboardItemSource) {
    this.types = Object.keys(items);
    this.#items = Object.fromEntries(
      Object.entries(items).map(([key, value]) => [
        key,
        value instanceof Promise ? value : Promise.resolve(value),
      ])
    );
  }

  getType(type: string): Promise<Blob> {
    const item = this.#items[type];
    if (!item) {
      throw new Error(`Clipboard item of type "${type}" not available`);
    }
    return item;
  }
}

if (typeof window !== "undefined" && typeof navigator !== "undefined") {
  const nav = navigator as Navigator;
  if (!nav.clipboard) {
    Object.defineProperty(nav, "clipboard", {
      configurable: true,
      enumerable: false,
      value: {},
    });
  }

  const clipboard = nav.clipboard as {
    write?: (items: ClipboardItem[]) => Promise<void>;
    writeText?: (text: string) => Promise<void>;
    read?: () => Promise<ClipboardItem[]>;
    readText?: () => Promise<string>;
  };

  if (typeof window.ClipboardItem === "undefined") {
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: PolyfillClipboardItem,
    });
  }

  if (typeof clipboard.writeText !== "function") {
    clipboard.writeText = (text: string) => fallbackCopyToClipboard(text);
  }

  if (typeof clipboard.readText !== "function") {
    clipboard.readText = () => fallbackReadFromClipboard();
  }

  if (typeof clipboard.write !== "function") {
    clipboard.write = async (items: ClipboardItem[]) => {
      for (const item of items) {
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          const text = await blob.text();
          await fallbackCopyToClipboard(text);
          return;
        }
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          const text = await blob.text();
          await fallbackCopyToClipboard(text);
          return;
        }
      }
      throw new Error("Clipboard write fallback only supports text content");
    };
  }

  if (typeof clipboard.read !== "function") {
    clipboard.read = async () => {
      const text = await fallbackReadFromClipboard();
      const blob = new Blob([text], { type: "text/plain" });
      const item = new window.ClipboardItem({ "text/plain": blob });
      return [item as ClipboardItem];
    };
  }
}
