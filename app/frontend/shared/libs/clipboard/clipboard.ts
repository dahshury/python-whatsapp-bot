"use client";

/**
 * Clipboard utility helpers with graceful fallbacks for environments where the
 * async Clipboard API is unavailable (e.g. certain mobile browsers or
 * insecure contexts).
 */

/**
 * Copy text to the clipboard using a DOM-based fallback.
 */
export function fallbackCopyToClipboard(text: string): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Clipboard copy is not supported in this environment");
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);

      const selection = document.getSelection();
      const previousRange =
        selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const succeeded = document.execCommand("copy");

      if (previousRange && selection) {
        selection.removeAllRanges();
        selection.addRange(previousRange);
      } else {
        selection?.removeAllRanges();
      }

      document.body.removeChild(textarea);

      if (!succeeded) {
        throw new Error("Copy command was unsuccessful");
      }

      resolve();
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Copy failed"));
    }
  });
}

/**
 * Prompt-based fallback for reading clipboard text. This keeps the operation in
 * the user's control when programmatic clipboard access is not available.
 * Note: Uses window.prompt as intentional fallback for environments without Clipboard API.
 */
export function fallbackReadFromClipboard(
  promptMessage = "Paste from clipboard:"
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Clipboard read is not supported in this environment");
  }

  return new Promise<string>((resolve, reject) => {
    try {
      // biome-ignore lint/suspicious/noAlert: Intentional fallback for environments without Clipboard API
      const pasted = window.prompt(promptMessage, "");
      if (pasted === null) {
        reject(new Error("Clipboard paste cancelled"));
        return;
      }
      resolve(pasted);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Paste failed"));
    }
  });
}

/**
 * Write text to the clipboard, falling back when necessary.
 */
export async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Continue to fallback below
    }
  }

  await fallbackCopyToClipboard(text);
}

/**
 * Read text from the clipboard, falling back to a user prompt when needed.
 */
export async function readClipboardText(options?: {
  promptMessage?: string;
}): Promise<string> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (typeof text === "string") {
        return text;
      }
    } catch {
      // Continue to fallback below
    }
  }

  const message = options?.promptMessage ?? "Paste from clipboard:";
  return fallbackReadFromClipboard(message);
}

export type ClipboardWriteFn = typeof writeClipboardText;
export type ClipboardReadFn = typeof readClipboardText;
