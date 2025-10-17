"use client";

import { useEffect, useRef } from "react";
import { saveCustomerDocument } from "@/shared/libs/api";
import type { IDataSource } from "@/shared/libs/data-grid";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";
import { toastService } from "@/shared/libs/toast";

const PERSIST_DELAY_MS = 280;

type Options = {
	waId: string;
	customerColumns: Array<{ id?: string }>;
	customerDataSource: IDataSource | unknown;
	getIgnorePersistUntilAction?: () => number;
};

const isFieldPersistable = (f: string): f is "name" | "age" | "phone" =>
	f === "age" || f === "name" || f === "phone";

const checkSuppressUntil = (): boolean => {
	try {
		const suppressUntil = (
			globalThis as unknown as { __docSuppressPersistUntil?: number }
		).__docSuppressPersistUntil;
		if (typeof suppressUntil === "number" && Date.now() < suppressUntil) {
			return true;
		}
	} catch {
		// Intentional: safely ignore errors when checking suppress flag
	}
	return false;
};

type SkipPersistOptions = {
	waId: string;
	triggeredBy: string | undefined;
	isLocalized: boolean;
	prev: { name: string; age: number | null } | undefined;
	name: string;
	age: number | null;
};

const shouldSkipPersist = (
	options: SkipPersistOptions
): { skip: true; reason: string } | { skip: false } => {
	const { waId, triggeredBy, isLocalized, prev, name, age } = options;

	if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
		return { skip: true, reason: "default_document" };
	}

	if (triggeredBy === "phone") {
		toastService.success(i18n.getMessage("saved", isLocalized));
		return { skip: true, reason: "phone" };
	}

	const changed = !prev || prev.name !== name || prev.age !== age;
	if (!changed) {
		toastService.success(
			triggeredBy === "age"
				? i18n.getMessage("age_recorded", isLocalized)
				: i18n.getMessage("saved", isLocalized)
		);
		return { skip: true, reason: "no_changes" };
	}

	return { skip: false };
};

type PersistOptions = {
	waId: string;
	isLocalized: boolean;
	prevByWaRef: React.MutableRefObject<
		Map<string, { name: string; age: number | null }>
	>;
	persistInFlightRef: React.MutableRefObject<{
		waId: string;
		name: string;
		age: number | null;
	} | null>;
	customerColumns: Array<{ id?: string }>;
	customerDataSource: IDataSource | unknown;
};

const createPersistHandler = (options: PersistOptions) => {
	const {
		waId,
		isLocalized,
		prevByWaRef,
		persistInFlightRef,
		customerColumns,
		customerDataSource,
	} = options;

	return async (triggeredBy?: "name" | "age" | "phone") => {
		try {
			const ds = customerDataSource as IDataSource;
			const nameCol = customerColumns.findIndex((c) => c.id === "name");
			const ageCol = customerColumns.findIndex((c) => c.id === "age");
			const [nameVal, ageVal] = await Promise.all([
				ds.getCellData(nameCol, 0),
				ds.getCellData(ageCol, 0),
			]);
			const name = (nameVal as string) || "";
			const age = (ageVal as number | null) ?? null;

			const prev = prevByWaRef.current.get(waId);
			const skipResult = shouldSkipPersist({
				waId,
				triggeredBy,
				isLocalized,
				prev,
				name,
				age,
			});

			if (skipResult.skip) {
				return;
			}

			const currentSig = { waId, name, age } as const;
			const inflight = persistInFlightRef.current;
			if (
				inflight &&
				inflight.waId === currentSig.waId &&
				inflight.name === currentSig.name &&
				inflight.age === currentSig.age
			) {
				return;
			}

			persistInFlightRef.current = { waId, name, age };
			await toastService.promise(saveCustomerDocument({ waId, name, age }), {
				loading: i18n.getMessage("saving", isLocalized),
				success: () =>
					i18n.getMessage(
						triggeredBy === "age" ? "age_recorded" : "saved",
						isLocalized
					),
				error: () => i18n.getMessage("save_failed", isLocalized),
			});
			prevByWaRef.current.set(waId, { name, age });
			persistInFlightRef.current = null;
		} catch {
			// Intentional: safely ignore errors during persistence
		}
	};
};

const createEventHandler = (
	persistRow: React.MutableRefObject<
		(t?: "name" | "age" | "phone") => Promise<void>
	>,
	persistTimerRef: React.MutableRefObject<number | null>,
	getIgnorePersistUntilAction?: () => number
) => {
	return (e: Event) => {
		try {
			const detail = (e as CustomEvent).detail as { field?: string };
			const f = String(detail?.field || "");

			const ignoreUntil =
				typeof getIgnorePersistUntilAction === "function"
					? Number(getIgnorePersistUntilAction())
					: 0;
			if (Date.now() < ignoreUntil) {
				return;
			}

			if (checkSuppressUntil()) {
				return;
			}

			if (isFieldPersistable(f)) {
				if (persistTimerRef.current) {
					window.clearTimeout(persistTimerRef.current);
				}
				persistTimerRef.current = window.setTimeout(() => {
					try {
						persistRow.current?.(f);
					} catch {
						// Intentional: safely ignore errors when triggering persistence
					}
				}, PERSIST_DELAY_MS);
			}
		} catch {
			// Intentional: safely ignore errors in event handler
		}
	};
};

export function useCustomerPersistence({
	waId,
	customerColumns,
	customerDataSource,
	getIgnorePersistUntilAction,
}: Options) {
	const { isLocalized } = useLanguage();
	const prevByWaRef = useRef<Map<string, { name: string; age: number | null }>>(
		new Map()
	);
	const persistInFlightRef = useRef<{
		waId: string;
		name: string;
		age: number | null;
	} | null>(null);
	const persistTimerRef = useRef<number | null>(null);

	const persistRow = useRef<(t?: "name" | "age" | "phone") => Promise<void>>(
		() => Promise.resolve()
	);

	persistRow.current = createPersistHandler({
		waId,
		isLocalized,
		prevByWaRef,
		persistInFlightRef,
		customerColumns,
		customerDataSource,
	});

	useEffect(() => {
		const handler = createEventHandler(
			persistRow,
			persistTimerRef,
			getIgnorePersistUntilAction
		);
		window.addEventListener("doc:persist", handler as EventListener);
		return () =>
			window.removeEventListener("doc:persist", handler as EventListener);
	}, [getIgnorePersistUntilAction]);
}
