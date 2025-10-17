import { useCallback, useRef, useState } from "react";

export type SaveStatus =
	| { status: "idle" }
	| { status: "dirty" }
	| { status: "saving" }
	| { status: "saved"; at: number }
	| { status: "error"; message?: string };

type UseEditorCanvasParams = {
	waId?: string;
	theme?: "light" | "dark";
	isUnlocked?: boolean;
};

/**
 * Hook to manage editor canvas refs and state
 */
export function useEditorCanvas(_params?: UseEditorCanvasParams) {
	const editorCanvasRef = useRef<HTMLDivElement>(null);
	const [scene, setScene] = useState<unknown>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: "idle" });
	const [loading, setLoading] = useState(false);

	const handleEditorChange = useCallback((newScene: unknown) => {
		setScene(newScene);
	}, []);

	const onEditorApiReady = useCallback((_api: unknown) => {
		// Handle editor API ready
	}, []);

	return {
		editorCanvasRef,
		scene,
		setScene,
		saveStatus,
		setSaveStatus,
		loading,
		setLoading,
		handleEditorChange,
		onEditorApiReady,
	};
}
