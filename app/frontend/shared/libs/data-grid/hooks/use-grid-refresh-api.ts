import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { useCallback, useEffect } from "react";

type UseGridRefreshApiArgs = {
	dataEditorRef: React.RefObject<DataEditorRef | null>;
};

type CellAddress = { cell: [number, number] };

type UseGridRefreshApiResult = {
	refreshCells: (cells: CellAddress[]) => void;
};

export function useGridRefreshApi({
	dataEditorRef,
}: UseGridRefreshApiArgs): UseGridRefreshApiResult {
	useEffect(() => {
		try {
			(
				window as unknown as {
					__docGridApi?: { updateCells?: (cells: CellAddress[]) => void };
				}
			).__docGridApi = {
				updateCells: (cells: CellAddress[]) => {
					try {
						dataEditorRef.current?.updateCells(cells);
					} catch {
						// Silently handle cell update errors
					}
				},
			};
		} catch {
			// Silently handle window API setup errors
		}
		return () => {
			try {
				(window as unknown as { __docGridApi?: unknown }).__docGridApi =
					undefined;
			} catch {
				// Silently handle window cleanup errors
			}
		};
	}, [dataEditorRef]);

	const refreshCells = useCallback(
		(cells: CellAddress[]) => {
			dataEditorRef.current?.updateCells(cells);
		},
		[dataEditorRef.current?.updateCells, dataEditorRef.current]
	);

	return { refreshCells };
}
