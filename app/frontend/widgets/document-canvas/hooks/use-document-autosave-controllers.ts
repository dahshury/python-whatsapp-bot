"use client";

import {
	createIdleAutosaveController,
	createIntervalAutosaveController,
} from "@processes/documents/document-save.process";
import { setDocSavingFlags } from "@shared/libs/documents";
import { useEffect, useRef } from "react";

type JsonRecord = Record<string, unknown>;

// Delay before clearing ignore flag to prevent rapid successive saves
const SAVE_IGNORE_DELAY_MS = 300;

export function useDocumentAutosaveControllers(args: {
	waId: string;
	setSaveStateAction: (
		v:
			| { status: "idle" }
			| { status: "dirty" }
			| { status: "saving" }
			| { status: "saved"; at: number }
			| { status: "error"; message?: string }
	) => void;
	computeDocumentSignatureAction: (p: {
		elements: unknown[];
		appState: JsonRecord;
		files: JsonRecord;
	}) => string;
	ignoreChangesUntilRef: { current: number };
	hasLocalEditsSinceSavingRef: { current: boolean };
}) {
	const {
		waId,
		setSaveStateAction,
		computeDocumentSignatureAction,
		ignoreChangesUntilRef,
		hasLocalEditsSinceSavingRef,
	} = args;

	const isSavingRef = useRef<boolean>(false);
	// Simple state machine for save flow: 'idle' | 'pending' | 'saving'
	const savePhaseRef = useRef<"idle" | "pending" | "saving">("idle");
	const lastSavedSigRef = useRef<string | null>(null);
	const idleControllerRef = useRef<{
		cancel?: () => void;
		schedule?: (payload: {
			elements: unknown[];
			appState: JsonRecord;
			files: JsonRecord;
			viewerAppState?: JsonRecord;
			editorAppState?: JsonRecord;
			sig?: string;
		}) => void;
		flushImmediate?: (payload: {
			elements: unknown[];
			appState: JsonRecord;
			files: JsonRecord;
			viewerAppState?: JsonRecord;
			editorAppState?: JsonRecord;
			sig?: string;
		}) => Promise<unknown> | null;
	} | null>(null);

	const intervalControllerRef = useRef<{
		start?: (getters: {
			getElements: () => unknown[];
			getAppState: () => JsonRecord;
			getFiles: () => JsonRecord;
		}) => void;
		stop?: () => void;
	} | null>(null);

	useEffect(() => {
		idleControllerRef.current = createIdleAutosaveController({
			waId,
			onSaving: () => {
				isSavingRef.current = true;
				savePhaseRef.current = "saving";
				setDocSavingFlags(true);
				setSaveStateAction({ status: "saving" });
			},
			onSaved: ({ scene }) => {
				try {
					const s = computeDocumentSignatureAction({
						elements: (scene?.elements as unknown[]) || [],
						appState: (scene?.appState as JsonRecord) || {},
						files: (scene?.files as JsonRecord) || {},
					});
					lastSavedSigRef.current = s;
				} catch {
					// Intentional: signature computation may fail
				}
				isSavingRef.current = false;
				savePhaseRef.current = "idle";
				setDocSavingFlags(false);
				setSaveStateAction({ status: "saved", at: Date.now() });
				if (hasLocalEditsSinceSavingRef.current) {
					hasLocalEditsSinceSavingRef.current = false;
					ignoreChangesUntilRef.current = Date.now() + SAVE_IGNORE_DELAY_MS;
				}
			},
			onError: ({ message }) => {
				isSavingRef.current = false;
				savePhaseRef.current = "idle";
				setDocSavingFlags(false);
				if (message !== undefined) {
					setSaveStateAction({ status: "error", message });
				} else {
					setSaveStateAction({ status: "error" });
				}
			},
		});

		intervalControllerRef.current = createIntervalAutosaveController({
			waId,
			onSaving: () => {
				// Avoid clobbering state if already saving due to idle controller
				if (!isSavingRef.current) {
					savePhaseRef.current = "saving";
					setSaveStateAction({ status: "saving" });
				}
			},
			onSaved: () => {
				if (!isSavingRef.current) {
					savePhaseRef.current = "idle";
					setSaveStateAction({ status: "saved", at: Date.now() });
				}
			},
			onError: ({ message }) => {
				if (!isSavingRef.current) {
					savePhaseRef.current = "idle";
					if (message !== undefined) {
						setSaveStateAction({ status: "error", message });
					} else {
						setSaveStateAction({ status: "error" });
					}
				}
			},
		});
	}, [
		waId,
		setSaveStateAction,
		computeDocumentSignatureAction,
		ignoreChangesUntilRef,
		hasLocalEditsSinceSavingRef,
	]);

	return {
		idleControllerRef,
		intervalControllerRef,
		lastSavedSigRef,
		isSavingRef,
		savePhaseRef,
	} as const;
}
