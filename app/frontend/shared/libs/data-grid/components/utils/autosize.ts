import type { CompactSelection } from "@glideapps/glide-data-grid";
import type React from "react";

export const createAutosizeHandler =
	<
		T extends {
			remeasureColumns: (selection: CompactSelection) => void;
		},
	>(
		dataEditorRef?: React.RefObject<T | null | undefined>
	) =>
	(columnIndex: number) => {
		if (dataEditorRef?.current) {
			import("@glideapps/glide-data-grid").then(
				({ CompactSelection: CompactSelectionDynamic }) => {
					dataEditorRef.current?.remeasureColumns(
						CompactSelectionDynamic.fromSingleSelection(columnIndex)
					);
				}
			);
		}
	};

export const registerAutosize = (
	onAutosize: unknown,
	handleAutosize: (columnIndex: number) => void
) => {
	if (onAutosize) {
		(window as unknown as { gridAutosize?: () => void }).gridAutosize = () =>
			handleAutosize(0);
	}
	return () => {
		const w = window as unknown as { gridAutosize?: () => void };
		if (w.gridAutosize) {
			// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally clearing to prevent repeated calls
			w.gridAutosize = () => {};
		}
	};
};
