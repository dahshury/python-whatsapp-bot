import { useMemo } from "react";

const DEFAULT_COLUMN_WIDTH = 150;
const DEFAULT_GRID_OFFSET = 60;

export function useGridWidth({
	isFullscreen,
	fullWidth,
	containerWidth,
	displayColumns,
}: {
	isFullscreen: boolean;
	fullWidth: boolean;
	containerWidth?: number;
	displayColumns: Array<{ width?: number }>;
}) {
	return useMemo(() => {
		if (isFullscreen) {
			return;
		}
		if (fullWidth) {
			if (containerWidth && containerWidth > 0) {
				return containerWidth;
			}
			return;
		}
		const calculatedWidth = displayColumns.reduce(
			(sum, col) =>
				sum + ((col as { width?: number }).width || DEFAULT_COLUMN_WIDTH),
			DEFAULT_GRID_OFFSET
		);
		return calculatedWidth;
	}, [isFullscreen, fullWidth, containerWidth, displayColumns]);
}
