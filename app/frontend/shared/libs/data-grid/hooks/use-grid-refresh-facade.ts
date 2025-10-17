import type { DataEditorRef } from "@glideapps/glide-data-grid";
import type React from "react";
import { useFormatChangeRefresh } from "./use-format-change-refresh";
import { useGeometryRedrawEffect } from "./use-geometry-redraw-effect";
import { useGridRefreshApi } from "./use-grid-refresh-api";

type UseGridRefreshFacadeParams = {
	displayColumns: unknown[];
	filteredRowCount: number;
	isDataReady: boolean;
	isInitializing: boolean;
	dataEditorRef: React.RefObject<DataEditorRef | null>;
	columnFormats: Record<string, string | undefined>;
};

export function useGridRefreshFacade({
	displayColumns,
	filteredRowCount,
	isDataReady,
	isInitializing,
	dataEditorRef,
	columnFormats,
}: UseGridRefreshFacadeParams) {
	const { refreshCells } = useGridRefreshApi({ dataEditorRef });

	useGeometryRedrawEffect({
		displayColumnsCount: displayColumns.length,
		filteredRowCount,
		isDataReady,
		refreshCells,
	});

	useFormatChangeRefresh({
		columnFormats,
		isInitializing,
		isDataReady,
		dataEditorRef,
		displayColumns,
		filteredRowCount,
		refreshCells,
	});

	return { refreshCells };
}
