import type { RefObject } from "react";

export type GridHoverArgs = {
	kind: "header" | "cell";
	location?: [number, number];
	bounds?: { x: number; y: number; width: number; height: number };
};

export function createGridHoverHandler(
	gs: { setHoverRow: (r?: number) => void },
	onTooltipHover: (args: GridHoverArgs) => void,
	dataEditorRef: RefObject<{
		getBounds?: (
			c: number,
			r: number
		) => { x: number; y: number; width: number; height: number } | undefined;
	} | null>
) {
	return (args: GridHoverArgs) => {
		if (args.kind !== "cell") {
			gs.setHoverRow(undefined);
		} else {
			const loc = args.location;
			if (loc) {
				gs.setHoverRow(loc[1] >= 0 ? loc[1] : undefined);
			}
		}
		let bounds = args.bounds;
		try {
			const loc = args.location;
			if (!bounds && loc && dataEditorRef.current?.getBounds) {
				bounds = dataEditorRef.current.getBounds(loc[0], loc[1]);
			}
		} catch {
			// Ignore errors when getting bounds - gracefully fall back to args.bounds
		}
		onTooltipHover({
			kind: args.kind,
			...(args.location && { location: args.location }),
			...(bounds && { bounds }),
		});
	};
}
