"use client";

import { useEffect } from "react";

/**
 * Suppresses known Excalidraw dev-only warnings that are harmless in production.
 * Excalidraw's internal gesture handlers can schedule state updates during render
 * in React 18, which triggers a warning but doesn't affect functionality.
 */
export function SuppressExcalidrawWarnings() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}

		// Idempotent, safe patching across StrictMode double-mounts
		const anyConsole = console as unknown as Record<string, unknown> & {
			__suppressExcalPatched?: boolean;
			__suppressExcalOrigError?: (...args: unknown[]) => void;
			__suppressExcalOrigWarn?: (...args: unknown[]) => void;
		};
		if (anyConsole.__suppressExcalPatched) {
			return;
		}

		// Capture original methods from the global Console prototype to avoid rebinding to our own wrappers
		const globalConsole = (globalThis as unknown as { console: Console })
			.console;
		const origError = globalConsole.error.bind(globalConsole) as (
			...args: unknown[]
		) => void;
		const origWarn = globalConsole.warn.bind(globalConsole) as (
			...args: unknown[]
		) => void;

		anyConsole.__suppressExcalOrigError = origError;
		anyConsole.__suppressExcalOrigWarn = origWarn;

		const shouldSuppress = (args: unknown[]) => {
			try {
				const full = args.map((a) => String(a ?? "")).join(" ");
				return (
					full.includes("validateDOMNesting") ||
					full.includes("<html> cannot appear as a child") ||
					full.includes("appears more than once") ||
					full.includes("Excalidraw") ||
					full.includes("excalidraw") ||
					full.includes("UNSAFE_") ||
					full.includes("findDOMNode") ||
					full.includes("<button> cannot contain a nested <button>") ||
					full.includes("Maximum update depth exceeded") ||
					// TanStack Query dev-only hydration noise
					full.includes(
						"A query that was dehydrated as pending ended up rejecting"
					) ||
					(full.includes("CancelledError") &&
						full.includes("dehydrated as pending"))
				);
			} catch {
				return false;
			}
		};

		// Guard to prevent re-entrancy if our wrapper triggers console again
		let inError = false;
		let inWarn = false;

		console.error = (...args: unknown[]) => {
			if (inError) {
				return; // prevent recursion
			}
			if (shouldSuppress(args)) {
				return; // Suppress completely, no forwarding
			}
			inError = true;
			try {
				origError(...args);
			} catch {
				// Suppress nested console errors to prevent infinite loops
			}
			inError = false;
		};

		console.warn = (...args: unknown[]) => {
			if (inWarn) {
				return; // prevent recursion
			}
			if (shouldSuppress(args)) {
				return; // Suppress completely, no forwarding
			}
			inWarn = true;
			try {
				origWarn(...args);
			} catch {
				// Suppress nested console warnings to prevent infinite loops
			}
			inWarn = false;
		};

		anyConsole.__suppressExcalPatched = true;

		// Keep patch stable across StrictMode remounts - no-op cleanup function
		return;
	}, []);

	return null;
}
