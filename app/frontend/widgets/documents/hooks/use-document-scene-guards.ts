import { useEffect, useRef } from "react";

const IGNORE_PERSIST_DELAY_MS = 900;

export function useDocumentSceneGuards(waId: string) {
	const pendingInitialLoadWaIdRef = useRef<string | null>(waId);
	const editorSigRef = useRef<string | null>(null);
	const persistTimerRef = useRef<number | null>(null);
	const ignorePersistUntilRef = useRef<number>(0);

	useEffect(() => {
		try {
			pendingInitialLoadWaIdRef.current = waId;
			ignorePersistUntilRef.current = Date.now() + IGNORE_PERSIST_DELAY_MS;
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
				persistTimerRef.current = null;
			}
		} catch {
			// Intentional: safely handle any potential errors during guard setup
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [waId]);

	return {
		pendingInitialLoadWaIdRef,
		editorSigRef,
		persistTimerRef,
		ignorePersistUntilRef,
	};
}
