"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";

const IGNORE_PERSIST_DELAY_MS = 900;

type UseDocumentsWaIdOptions = {
	searchParams?: { get: (name: string) => string | null } | null;
};

export function useDocumentsWaId(
	initialWaId: string = DEFAULT_DOCUMENT_WA_ID,
	options?: UseDocumentsWaIdOptions
) {
	const { searchParams } = options || {};
	const [waId, setWaId] = useState<string>(initialWaId);
	const ignorePersistUntilRef = useRef<number>(0);
	const persistTimerRef = useRef<number | null>(null);
	const pendingInitialLoadWaIdRef = useRef<string | null>(initialWaId);

	// Initialize with default
	useEffect(() => {
		pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID;
		setWaId(DEFAULT_DOCUMENT_WA_ID);
	}, []);

	// Hydrate from URL param
	useEffect(() => {
		if (!searchParams) {
			return;
		}
		const urlWaId = searchParams.get("waId");
		if (urlWaId && urlWaId !== DEFAULT_DOCUMENT_WA_ID) {
			ignorePersistUntilRef.current = Date.now() + IGNORE_PERSIST_DELAY_MS;
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
				persistTimerRef.current = null;
			}
			pendingInitialLoadWaIdRef.current = urlWaId;
			setWaId(urlWaId);
		}
	}, [searchParams]);

	// Listen to external user-select events
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { waId?: string };
				const next = String(detail?.waId || "");
				if (!next) {
					return;
				}
				ignorePersistUntilRef.current = Date.now() + IGNORE_PERSIST_DELAY_MS;
				if (persistTimerRef.current) {
					clearTimeout(persistTimerRef.current);
					persistTimerRef.current = null;
				}
				pendingInitialLoadWaIdRef.current = next;
				setWaId(next);
			} catch {
				// Intentional: safely ignore errors in event handler
			}
		};
		window.addEventListener("doc:user-select", handler as EventListener);
		return () =>
			window.removeEventListener("doc:user-select", handler as EventListener);
	}, []);

	return { waId, setWaId } as const;
}
