import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TooltipData } from "../core/types";
import { useDebouncedCallback } from "./use-debounced-callback";

// Tooltip dimension and spacing constants
const CHAR_WIDTH_PIXELS = 8; // Average character width in pixels
const TOOLTIP_HEIGHT = 40; // Fixed tooltip height in pixels
const STRING_LENGTH_THRESHOLD = 50; // Character count threshold for tooltip content

export type TooltipConfig = {
	delay: number;
	hideDelay: number;
	offset: { x: number; y: number };
	maxWidth: number;
	position: "auto" | "top" | "bottom" | "left" | "right";
};

const DEFAULT_CONFIG: TooltipConfig = {
	delay: 500,
	hideDelay: 100,
	offset: { x: 10, y: 10 },
	maxWidth: 300,
	position: "auto",
};

export function useAdvancedTooltips(config: Partial<TooltipConfig> = {}) {
	const fullConfig = React.useMemo(
		() => ({ ...DEFAULT_CONFIG, ...config }),
		[config]
	);
	const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLElement | null>(null);

	const { debouncedCallback: debouncedShow } = useDebouncedCallback(
		(data: TooltipData) => setTooltipData(data),
		fullConfig.delay
	);

	const { debouncedCallback: debouncedHide } = useDebouncedCallback(
		() => setTooltipData(null),
		fullConfig.hideDelay
	);

	const adjustPositionForBounds = useCallback(
		(options: {
			x: number;
			y: number;
			tooltipWidth: number;
			tooltipHeight: number;
			container: DOMRect;
		}): { x: number; y: number } => {
			const { x, y, tooltipWidth, tooltipHeight, container } = options;
			let adjustedX = x;
			let adjustedY = y;

			if (adjustedX + tooltipWidth > container.right) {
				adjustedX = x - tooltipWidth - fullConfig.offset.x;
			}

			if (adjustedY + tooltipHeight > container.bottom) {
				adjustedY = y - tooltipHeight - fullConfig.offset.y;
			}

			if (adjustedX < container.left) {
				adjustedX = container.left + fullConfig.offset.x;
			}

			if (adjustedY < container.top) {
				adjustedY = container.top + fullConfig.offset.y;
			}

			return { x: adjustedX, y: adjustedY };
		},
		[fullConfig]
	);

	const calculatePosition = useCallback(
		(
			mouseX: number,
			mouseY: number,
			content: string
		): { x: number; y: number } => {
			if (!containerRef.current) {
				return {
					x: mouseX + fullConfig.offset.x,
					y: mouseY + fullConfig.offset.y,
				};
			}

			const container = containerRef.current.getBoundingClientRect();
			const tooltipWidth = Math.min(
				content.length * CHAR_WIDTH_PIXELS,
				fullConfig.maxWidth
			);
			const tooltipHeight = TOOLTIP_HEIGHT;

			const x = mouseX + fullConfig.offset.x;
			const y = mouseY + fullConfig.offset.y;

			if (fullConfig.position === "auto") {
				return adjustPositionForBounds({
					x,
					y,
					tooltipWidth,
					tooltipHeight,
					container,
				});
			}

			return { x, y };
		},
		[fullConfig, adjustPositionForBounds]
	);

	const showTooltip = useCallback(
		(content: string, mouseX: number, mouseY: number) => {
			if (hideTimeoutRef.current) {
				clearTimeout(hideTimeoutRef.current);
				hideTimeoutRef.current = null;
			}

			const position = calculatePosition(mouseX, mouseY, content);

			debouncedShow({
				content,
				position,
				visible: true,
			});
		},
		[debouncedShow, calculatePosition]
	);

	const hideTooltip = useCallback(() => {
		debouncedHide();
	}, [debouncedHide]);

	const updateTooltipPosition = useCallback(
		(mouseX: number, mouseY: number) => {
			if (tooltipData?.visible) {
				const newPosition = calculatePosition(
					mouseX,
					mouseY,
					tooltipData.content
				);
				setTooltipData((prev) =>
					prev ? { ...prev, position: newPosition } : null
				);
			}
		},
		[tooltipData, calculatePosition]
	);

	const setContainer = useCallback((element: HTMLElement | null) => {
		containerRef.current = element;
	}, []);

	useEffect(() => {
		const handleGlobalMouseMove = (event: MouseEvent) => {
			if (tooltipData?.visible) {
				updateTooltipPosition(event.clientX, event.clientY);
			}
		};

		if (tooltipData?.visible) {
			document.addEventListener("mousemove", handleGlobalMouseMove);
			return () =>
				document.removeEventListener("mousemove", handleGlobalMouseMove);
		}
		return;
	}, [tooltipData?.visible, updateTooltipPosition]);

	return {
		tooltipData,
		showTooltip,
		hideTooltip,
		updateTooltipPosition,
		setContainer,
		isVisible: tooltipData?.visible,
	};
}

export function useGridTooltips(
	data: (string | number | undefined)[][],
	columnNames: string[]
) {
	const { showTooltip, hideTooltip, tooltipData } = useAdvancedTooltips({
		delay: 300,
		maxWidth: 400,
	});

	const handleCellHover = useCallback(
		(col: number, row: number, mouseX: number, mouseY: number) => {
			const cellValue = data[row]?.[col];
			const columnName = columnNames[col];

			if (
				cellValue !== undefined &&
				cellValue !== null &&
				cellValue !== "" &&
				columnName
			) {
				const content = formatTooltipContent(cellValue, columnName, row, col);
				showTooltip(content, mouseX, mouseY);
			} else {
				hideTooltip();
			}
		},
		[data, columnNames, showTooltip, hideTooltip]
	);

	const handleCellLeave = useCallback(() => {
		hideTooltip();
	}, [hideTooltip]);

	return {
		tooltipData,
		onCellHover: handleCellHover,
		onCellLeave: handleCellLeave,
	};
}

function formatTooltipContent(
	value: string | number,
	columnName: string,
	row: number,
	col: number
): string {
	const lines = [] as string[];

	lines.push(`Column: ${columnName}`);
	lines.push(`Row: ${row + 1}, Col: ${col + 1}`);
	lines.push(`Value: ${value}`);

	if (typeof value === "number") {
		lines.push(`Formatted: ${value.toLocaleString()}`);
	}

	if (typeof value === "string" && value.length > STRING_LENGTH_THRESHOLD) {
		lines.push(`Length: ${value.length} characters`);
	}

	return lines.join("\n");
}
