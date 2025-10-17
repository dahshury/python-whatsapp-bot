import React from "react";

export function useColumnHide(
	columns: Array<{ id: string }>,
	setHiddenColumns: (updater: (prev: Set<number>) => Set<number>) => void
) {
	return React.useCallback(
		(columnId: string) => {
			const idx = columns.findIndex((c) => c.id === columnId);
			if (idx >= 0) {
				setHiddenColumns((prev) => new Set([...prev, idx]));
			}
		},
		[columns, setHiddenColumns]
	);
}
