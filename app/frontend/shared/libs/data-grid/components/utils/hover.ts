import type {
	GridMouseCellEventArgs as GDGGridMouseCellEventArgs,
	GridMouseEventArgs,
} from "@glideapps/glide-data-grid";
import type { GridDataEditorProps } from "../../types";

export const createHandleItemHovered =
	(onItemHovered?: GridDataEditorProps["onItemHovered"]) =>
	(args: GridMouseEventArgs) => {
		if (onItemHovered && (args as { kind: string }).kind === "cell") {
			const g = args as unknown as GDGGridMouseCellEventArgs;
			const bounds = (
				g as unknown as {
					bounds?: { x: number; y: number; width: number; height: number };
				}
			).bounds;

			onItemHovered({
				location: g.location as [number, number],
				item: g.location,
				...(bounds && { bounds }),
			});
		}
	};
