import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TooltipData } from "../core/types";
import { useDebouncedCallback } from "./useDebouncedCallback";

export interface TooltipConfig {
	delay: number;
	hideDelay: number;
	offset: { x: number; y: number };
	maxWidth: number;
	position: "auto" | "top" | "bottom" | "left" | "right";
}

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
		[config],
	);
	const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLElement | null>(null);

	const { debouncedCallback: debouncedShow } = useDebouncedCallback(
		(data: TooltipData) => setTooltipData(data),
		fullConfig.delay,
	);

	const { debouncedCallback: debouncedHide } = useDebouncedCallback(
		() => setTooltipData(null),
		fullConfig.hideDelay,
	);

	const calculatePosition = useCallback(
		(
			mouseX: number,
			mouseY: number,
			content: string,
		): { x: number; y: number } => {
			if (!containerRef.current) {
				return {
					x: mouseX + fullConfig.offset.x,
					y: mouseY + fullConfig.offset.y,
				};
			}

			const container = containerRef.current.getBoundingClientRect();
			const tooltipWidth = Math.min(content.length * 8, fullConfig.maxWidth);
			const tooltipHeight = 40;

			let x = mouseX + fullConfig.offset.x;
			let y = mouseY + fullConfig.offset.y;

			if (fullConfig.position === "auto") {
				if (x + tooltipWidth > container.right) {
					x = mouseX - tooltipWidth - fullConfig.offset.x;
				}

				if (y + tooltipHeight > container.bottom) {
					y = mouseY - tooltipHeight - fullConfig.offset.y;
				}

				if (x < container.left) {
					x = container.left + fullConfig.offset.x;
				}

				if (y < container.top) {
					y = container.top + fullConfig.offset.y;
				}
			}

			return { x, y };
		},
		[fullConfig],
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
		[debouncedShow, calculatePosition],
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
					tooltipData.content,
				);
				setTooltipData((prev) =>
					prev ? { ...prev, position: newPosition } : null,
				);
			}
		},
		[tooltipData, calculatePosition],
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
	}, [tooltipData?.visible, updateTooltipPosition]);

	return {
		tooltipData,
		showTooltip,
		hideTooltip,
		updateTooltipPosition,
		setContainer,
		isVisible: tooltipData?.visible || false,
	};
}

export function useGridTooltips(
	data: (string | number | undefined)[][],
	columnNames: string[],
) {
	const { showTooltip, hideTooltip, tooltipData } = useAdvancedTooltips({
		delay: 300,
		maxWidth: 400,
	});

	const handleCellHover = useCallback(
		(col: number, row: number, mouseX: number, mouseY: number) => {
			const cellValue = data[row]?.[col];
			const columnName = columnNames[col];

			if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
				const content = formatTooltipContent(cellValue, columnName, row, col);
				showTooltip(content, mouseX, mouseY);
			} else {
				hideTooltip();
			}
		},
		[data, columnNames, showTooltip, hideTooltip],
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
	col: number,
): string {
	const lines = [] as string[];

	lines.push(`Column: ${columnName}`);
	lines.push(`Row: ${row + 1}, Col: ${col + 1}`);
	lines.push(`Value: ${value}`);

	if (typeof value === "number") {
		lines.push(`Formatted: ${value.toLocaleString()}`);
	}

	if (typeof value === "string" && value.length > 50) {
		lines.push(`Length: ${value.length} characters`);
	}

	return lines.join("\n");
}
