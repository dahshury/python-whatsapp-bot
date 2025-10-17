import { useEffect, useRef, useState } from "react";
import type { ExcalidrawCellProps } from "../components/models/excalidraw-cell-types";

export type UseExcalidrawEditorStateReturn = {
	containerRef: React.MutableRefObject<HTMLDivElement | null>;
	mounted: boolean;
	initialSceneRef: React.MutableRefObject<
		ExcalidrawCellProps["scene"] | undefined
	>;
};

/**
 * Hook that manages editor state for the Excalidraw cell editor
 * Handles: container reference, mount detection, and ResizeObserver setup
 */
export function useExcalidrawEditorState(
	initialScene: ExcalidrawCellProps["scene"] | undefined
): UseExcalidrawEditorStateReturn {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [mounted, setMounted] = useState(false);
	const initialSceneRef = useRef<ExcalidrawCellProps["scene"] | undefined>(
		initialScene
	);

	// Detect when container is sized and ready
	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}
		const { width, height } = el.getBoundingClientRect();
		if (width > 1 && height > 1) {
			setMounted(true);
			return;
		}
		let resolved = false;
		const ro = new ResizeObserver((entries) => {
			const r = entries[0]?.target as HTMLElement | undefined;
			const rect = r?.getBoundingClientRect?.();
			if (rect && rect.width > 1 && rect.height > 1 && !resolved) {
				resolved = true;
				setMounted(true);
				try {
					ro.disconnect();
				} catch {
					// ResizeObserver may fail to disconnect
				}
			}
		});
		try {
			ro.observe(el as Element);
		} catch {
			// ResizeObserver may fail to observe
		}
		return () => {
			try {
				ro.disconnect();
			} catch {
				// ResizeObserver cleanup may fail
			}
		};
	}, []);

	return { containerRef, mounted, initialSceneRef };
}
