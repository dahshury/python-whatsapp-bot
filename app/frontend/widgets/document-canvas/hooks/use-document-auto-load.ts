"use client";

import {
	requestDocumentLoad,
	waitForNextDocumentUpdate,
} from "@processes/documents/document-load.process";
import { useEffect } from "react";
import { fetchCustomer } from "@/shared/libs/api";

type JsonRecord = Record<string, unknown>;

// Delay to suppress onChange echoes after initial scene load
const SCENE_LOAD_ECHO_SUPPRESS_MS = 250;
// Delay before timing out on WebSocket update
const WEBSOCKET_WAIT_TIMEOUT_MS = 700;
// Delay before requesting load via process
const LOAD_REQUEST_DELAY_MS = 150;

async function loadDocumentAsync(
	waId: string,
	initialSceneAppliedRef: { current: boolean }
): Promise<void> {
	try {
		await requestDocumentLoad(waId);
		// Wait briefly for a websocket external-update; if none, fallback to HTTP
		const got = await waitForNextDocumentUpdate(
			waId,
			WEBSOCKET_WAIT_TIMEOUT_MS
		);
		if (!(got || initialSceneAppliedRef.current)) {
			await handleDocumentFallback(waId);
		}
	} catch {
		// Intentional: loading errors are handled silently
	}
}

async function handleDocumentFallback(waId: string): Promise<void> {
	try {
		const resp = (await fetchCustomer(waId)) as unknown as {
			data?: { document?: unknown };
			document?: unknown;
		};
		const doc = (resp?.data?.document ?? resp?.document ?? null) as Record<
			string,
			unknown
		> | null;
		try {
			window.dispatchEvent(
				new CustomEvent("documents:external-update", {
					detail: { wa_id: waId, document: doc },
				})
			);
		} catch {
			// Intentional: event dispatch may fail
		}
	} catch {
		// Intentional: fallback fetch errors are handled silently
	}
}

export function useDocumentAutoLoad(args: {
	waId: string;
	enabled?: boolean;
	autoLoadOnMount?: boolean;
	startTransitionAction?: (cb: () => void) => void;
	setLoadingAction: (v: boolean) => void;
	lastLoadedWaIdRef: { current: string | null };
	initialSceneAppliedRef: { current: boolean };
	ignoreChangesUntilRef: { current: number };
	editorAppStateRef: { current: JsonRecord };
	lastSavedEditorSigRef: { current: string | null };
}) {
	const {
		waId,
		enabled = true,
		autoLoadOnMount = true,
		setLoadingAction,
		lastLoadedWaIdRef,
		initialSceneAppliedRef,
		ignoreChangesUntilRef,
		editorAppStateRef,
		lastSavedEditorSigRef,
	} = args;

	// Request initial load for the provided waId using the WebSocket process
	useEffect(() => {
		if (!enabled) {
			return;
		}
		if (!autoLoadOnMount) {
			return;
		}
		if (!waId) {
			return;
		}

		// Avoid duplicate load requests for the same waId if we've already received it
		if (lastLoadedWaIdRef.current === waId && initialSceneAppliedRef.current) {
			return;
		}

		// Reset local editor camera tracking when switching waId
		editorAppStateRef.current = {};
		lastSavedEditorSigRef.current = null;
		initialSceneAppliedRef.current = false;
		// Briefly suppress onChange echoes until the external scene applies
		ignoreChangesUntilRef.current = Date.now() + SCENE_LOAD_ECHO_SUPPRESS_MS;

		// Immediately reflect loading state; avoid later toggle-back flashes
		try {
			setLoadingAction(true);
		} catch {
			// Intentional: setLoadingAction may fail in certain contexts
		}

		const timer = window.setTimeout(() => {
			// If the scene already applied before the timer fired, skip re-requesting
			if (
				initialSceneAppliedRef.current &&
				lastLoadedWaIdRef.current === waId
			) {
				return;
			}
			// Intentional: we don't await this async operation
			loadDocumentAsync(waId, initialSceneAppliedRef).catch(() => {
				// Intentional: async load errors are handled silently
			});
		}, LOAD_REQUEST_DELAY_MS);

		return () => {
			try {
				window.clearTimeout(timer);
			} catch {
				// Intentional: clearTimeout may fail
			}
		};
	}, [
		waId,
		enabled,
		autoLoadOnMount,
		setLoadingAction,
		lastLoadedWaIdRef,
		initialSceneAppliedRef,
		ignoreChangesUntilRef,
		editorAppStateRef,
		lastSavedEditorSigRef,
	]);
}
