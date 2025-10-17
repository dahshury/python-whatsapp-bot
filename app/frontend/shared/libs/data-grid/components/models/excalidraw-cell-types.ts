import type { AppState } from "@excalidraw/excalidraw/types";
import type { CustomCell } from "@glideapps/glide-data-grid";

export type ExcalidrawSceneLike = {
	readonly elements?: readonly unknown[];
	readonly appState?: Partial<AppState>;
	readonly files?: Record<string, unknown>;
};

export type ExcalidrawCellProps = {
	readonly kind: "excalidraw-cell";
	readonly scene?: ExcalidrawSceneLike;
	readonly display?: string;
	readonly readonly?: boolean;
	readonly preview?: string;
};

export type ExcalidrawCell = CustomCell<ExcalidrawCellProps>;
