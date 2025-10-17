"use client";

import type { RefObject } from "react";
import { useCallback, useRef } from "react";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/data-provider";

export type UseDocumentsProviderEventsArgs = {
	onDataProviderReady: (provider: unknown) => Promise<void> | void;
};

export type UseDocumentsProviderEventsResult = {
	providerRef: RefObject<DataProvider | null>;
	handleProviderReady: (provider: unknown) => Promise<void>;
};

export function useDocumentsProviderEvents(
	args: UseDocumentsProviderEventsArgs
): UseDocumentsProviderEventsResult {
	const { onDataProviderReady } = args;

	const providerRef = useRef<DataProvider | null>(null);

	const handleProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				providerRef.current = provider as DataProvider;
				await onDataProviderReady(provider);

				// Attach commit-like hook (listen for loaded cell data changes)
				try {
					(
						providerRef.current as unknown as {
							setOnCellDataLoaded?: (
								cb: (c: number, r: number) => void
							) => void;
						}
					)?.setOnCellDataLoaded?.(((colIdx: number, rowIdx: number) => {
						try {
							const column = (
								providerRef.current as DataProvider
							).getColumnDefinition(colIdx);
							if (!column) {
								return;
							}
							if (rowIdx !== 0) {
								return; // single-row grid
							}

							// Guard: ignore provider-applied loads for a brief window after waId change
							if (
								(globalThis as unknown as { __docIgnoreProviderLoad?: number })
									.__docIgnoreProviderLoad
							) {
								return;
							}
						} catch {
							// Intentional: safely ignore errors when checking column definitions
						}
					}) as unknown as (c: number, r: number) => void);
				} catch {
					// Intentional: provider may not support cell data loaded callbacks
				}
			} catch {
				// Intentional: safely handle provider initialization errors
			}
		},
		[onDataProviderReady]
	);

	return { providerRef, handleProviderReady };
}
