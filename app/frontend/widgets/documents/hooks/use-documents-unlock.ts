"use client";

import { useCallback, useEffect, useState } from "react";
import type { IDataSource } from "@/shared/libs/data-grid";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";

type Options = {
	customerColumns: Array<{ id?: string }>;
	customerDataSource: IDataSource | unknown;
};

export function useDocumentsUnlock(
	waId: string,
	{ customerColumns, customerDataSource }: Options
) {
	const [isUnlocked, setIsUnlocked] = useState(false);

	const recomputeUnlock = useCallback(async () => {
		try {
			if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
				if (isUnlocked) {
					setIsUnlocked(false);
				}
				return;
			}
			const ds = customerDataSource as IDataSource;
			const nameCol = customerColumns.findIndex((c) => c.id === "name");
			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");
			const [nameVal, phoneVal] = await Promise.all([
				ds.getCellData(nameCol, 0),
				ds.getCellData(phoneCol, 0),
			]);
			const nameOk = typeof nameVal === "string" && nameVal.trim().length > 0;
			const phoneOk =
				typeof phoneVal === "string" && phoneVal.trim().startsWith("+");
			const waIdOk = Boolean(waId && waId !== DEFAULT_DOCUMENT_WA_ID);
			setIsUnlocked(Boolean(nameOk && phoneOk && waIdOk));
		} catch {
			setIsUnlocked(false);
		}
	}, [waId, customerColumns, customerDataSource, isUnlocked]);

	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { waId?: string };
				const eventWaId = String(detail?.waId || "");
				if (eventWaId === waId) {
					recomputeUnlock();
				}
			} catch {
				// Intentional: safely ignore errors in event handler
			}
		};
		window.addEventListener("doc:customer-loaded", handler as EventListener);
		return () =>
			window.removeEventListener(
				"doc:customer-loaded",
				handler as EventListener
			);
	}, [waId, recomputeUnlock]);

	useEffect(() => {
		// Re-evaluate when waId changes (via recomputeUnlock identity change)
		recomputeUnlock();
	}, [recomputeUnlock]);

	return { isUnlocked } as const;
}
