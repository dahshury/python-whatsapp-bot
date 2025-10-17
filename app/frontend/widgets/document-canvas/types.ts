import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ComponentType } from "react";

export type ExcalidrawAPI = ExcalidrawImperativeAPI;

export type SaveState =
	| { status: "idle" }
	| { status: "dirty" }
	| { status: "saving" }
	| { status: "saved"; at: number }
	| { status: "error"; message?: string };

export type UseDocumentSceneReturn = {
	loading: boolean;
	handleCanvasChange: (
		elements?: unknown[],
		appState?: Record<string, unknown>,
		files?: Record<string, unknown>,
		editorAppState?: Record<string, unknown>,
		sig?: string
	) => void;
	onExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void;
	saveStatus: SaveState;
};

export type ToolOptionItem = {
	value: string;
	label: string;
	Icon: ComponentType<{
		size?: number;
		className?: string;
		"aria-hidden"?: boolean;
	}>;
};
