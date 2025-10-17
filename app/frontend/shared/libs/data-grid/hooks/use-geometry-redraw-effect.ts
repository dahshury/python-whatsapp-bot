import { useEffect } from "react";

type GeometryRedrawArgs = {
	displayColumnsCount: number;
	filteredRowCount: number;
	isDataReady: boolean;
	refreshCells: (cells: { cell: [number, number] }[]) => void;
};

const REDRAW_DELAY_MS = 30;

export function useGeometryRedrawEffect({
	displayColumnsCount,
	filteredRowCount,
	isDataReady,
	refreshCells,
}: GeometryRedrawArgs): void {
	useEffect(() => {
		if (!isDataReady) {
			return;
		}
		try {
			const cells: { cell: [number, number] }[] = [];
			for (let c = 0; c < displayColumnsCount; c++) {
				for (let r = 0; r < filteredRowCount; r++) {
					cells.push({ cell: [c as number, r as number] });
				}
			}
			const t = setTimeout(() => refreshCells(cells), REDRAW_DELAY_MS);
			return () => clearTimeout(t);
		} catch {
			// Silently handle geometry redraw errors
			return;
		}
	}, [displayColumnsCount, filteredRowCount, isDataReady, refreshCells]);
}
