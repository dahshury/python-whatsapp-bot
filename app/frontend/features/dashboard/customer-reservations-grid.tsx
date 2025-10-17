"use client";

import {
	DataEditor,
	type GridCell,
	GridCellKind,
	type GridColumn,
	type Item,
} from "@glideapps/glide-data-grid";
import { useTheme } from "next-themes";
import React, { useCallback, useMemo } from "react";
import type { Reservation } from "@/entities/event";
import { createGlideTheme } from "@/shared/libs/data-grid/components/utils/streamlit-glide-theme";
import { getColumnsForSchema } from "@/shared/libs/data-grid/schemas/registry";

// Grid sizing constants
const DEFAULT_COLUMN_WIDTH = 100;
const HEADER_HEIGHT = 22;
const ROW_HEIGHT = 24;
const MAX_GRID_HEIGHT = 300;
const THEME_UPDATE_DELAY_MS = 50;

// Time formatting constants
const NOON_HOUR = 12;
const HOURS_PER_12H_FORMAT = 12;

// Column width proportions and minimums
const DATE_COLUMN_PROPORTION = 0.35;
const DATE_COLUMN_MIN_WIDTH = 85;
const TIME_COLUMN_PROPORTION = 0.3;
const TIME_COLUMN_MIN_WIDTH = 70;

type CustomerReservationsGridProps = {
	reservations: Reservation[];
	isLocalized: boolean;
};

export function CustomerReservationsGrid({
	reservations,
	isLocalized,
}: CustomerReservationsGridProps) {
	const { theme: currentTheme } = useTheme();
	const isDarkMode = currentTheme === "dark";

	// Container ref for measuring width
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] =
		React.useState<number>(DEFAULT_COLUMN_WIDTH);

	// Force grid to re-render when theme changes by using a key
	const [themeKey, setThemeKey] = React.useState(0);

	// Update theme key when theme changes
	React.useEffect(() => {
		// Small delay to ensure CSS variables are updated
		const timer = setTimeout(() => {
			setThemeKey((prev) => prev + 1);
		}, THEME_UPDATE_DELAY_MS);
		return () => clearTimeout(timer);
	}, []);

	// Measure container width
	React.useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const width = entry.contentRect.width;
				if (width > 0) {
					setContainerWidth(width);
				}
			}
		});

		// Initial measurement
		const initialWidth = containerRef.current.offsetWidth;
		if (initialWidth > 0) {
			setContainerWidth(initialWidth);
		}

		observer.observe(containerRef.current);

		return () => observer.disconnect();
	}, []);

	// Re-create theme when either light/dark mode or style theme changes
	const gridTheme = useMemo(() => {
		const baseTheme = createGlideTheme(isDarkMode ? "dark" : "light");
		return {
			...baseTheme,
			// Customize for smaller size in customer card
			cellHorizontalPadding: 6,
			cellVerticalPadding: 2,
			headerHeight: HEADER_HEIGHT,
			rowHeight: ROW_HEIGHT,
			baseFontStyle: "12px",
		};
	}, [isDarkMode]);

	const columns: GridColumn[] = useMemo(() => {
		const defs = getColumnsForSchema("reservationPreview", {
			localized: isLocalized,
		});
		// Calculate column widths based on container width while preserving ids and titles
		const totalWidth = containerWidth;
		const dateWidth = Math.max(
			DATE_COLUMN_MIN_WIDTH,
			Math.floor(totalWidth * DATE_COLUMN_PROPORTION)
		);
		const timeWidth = Math.max(
			TIME_COLUMN_MIN_WIDTH,
			Math.floor(totalWidth * TIME_COLUMN_PROPORTION)
		);
		const typeWidth = Math.max(
			DATE_COLUMN_MIN_WIDTH,
			totalWidth - dateWidth - timeWidth
		);

		const widthsById: Record<string, number> = {
			date: dateWidth,
			time: timeWidth,
			type: typeWidth,
		};

		return defs.map((d) => ({
			id: d.id,
			title: d.title || d.name,
			width: widthsById[d.id] ?? d.width ?? DEFAULT_COLUMN_WIDTH,
		}));
	}, [isLocalized, containerWidth]);

	const formatTime = useCallback((timeStr: string) => {
		try {
			// Handle various time formats
			if (timeStr.includes("AM") || timeStr.includes("PM")) {
				return timeStr;
			}
			// Convert 24-hour format to 12-hour format
			const [hours, minutes] = timeStr.split(":");
			const hour = Number.parseInt(hours || "0", 10);
			const ampm = hour >= NOON_HOUR ? "PM" : "AM";
			const hour12 = hour % HOURS_PER_12H_FORMAT || HOURS_PER_12H_FORMAT;
			return `${hour12}:${minutes} ${ampm}`;
		} catch {
			return timeStr;
		}
	}, []);

	const formatDate = useCallback(
		(dateStr: string) => {
			try {
				const date = new Date(dateStr);
				return date.toLocaleDateString(isLocalized ? "ar-SA" : "en-US", {
					month: "short",
					day: "numeric",
				});
			} catch {
				return dateStr;
			}
		},
		[isLocalized]
	);

	const getServiceType = useCallback(
		(reservation: Reservation) => {
			// Map reservation types to display names - same as drawer implementation
			const typeValue = reservation.type || 0;
			if (isLocalized) {
				return typeValue === 0 ? "كشف" : "مراجعة";
			}
			return typeValue === 0 ? "Check-up" : "Follow-up";
		},
		[isLocalized]
	);

	const getCellContent = React.useCallback(
		(cell: Item): GridCell => {
			const [col, row] = cell;
			const reservation = reservations[row];

			if (!reservation) {
				return {
					kind: GridCellKind.Text,
					data: "",
					displayData: "",
					allowOverlay: false,
				};
			}

			const column = columns[col];
			if (!column) {
				return {
					kind: GridCellKind.Text,
					data: "",
					displayData: "",
					allowOverlay: false,
				};
			}
			switch (column.id) {
				case "date":
					return {
						kind: GridCellKind.Text,
						data: reservation.date,
						displayData: formatDate(reservation.date),
						allowOverlay: false,
					};
				case "time":
					return {
						kind: GridCellKind.Text,
						data: reservation.time_slot,
						displayData: formatTime(reservation.time_slot),
						allowOverlay: false,
					};
				case "type":
					return {
						kind: GridCellKind.Text,
						data: reservation.type?.toString() || "0",
						displayData: getServiceType(reservation),
						allowOverlay: false,
					};
				default:
					return {
						kind: GridCellKind.Text,
						data: "",
						displayData: "",
						allowOverlay: false,
					};
			}
		},
		[reservations, columns, formatDate, formatTime, getServiceType]
	);

	if (reservations.length === 0) {
		return (
			<div className="py-2 text-center text-muted-foreground text-xs">
				{isLocalized ? "لا توجد حجوزات" : "No reservations"}
			</div>
		);
	}

	return (
		<div
			className="glide-grid-wrapper mt-1 w-full overflow-hidden rounded-sm"
			data-fullwidth="true"
			ref={containerRef}
		>
			<div className="glide-grid-inner glide-grid-inner-full glide-grid-fullwidth">
				<DataEditor
					className="gdg-wmyidgi"
					columns={columns}
					getCellContent={getCellContent}
					headerHeight={22}
					height={Math.min(
						MAX_GRID_HEIGHT,
						reservations.length * ROW_HEIGHT + HEADER_HEIGHT
					)}
					key={`customer-grid-${themeKey}`} // Header + rows (increased max height)
					rowHeight={ROW_HEIGHT}
					rowMarkers="none"
					rows={reservations.length}
					smoothScrollX={false}
					smoothScrollY={false}
					theme={gridTheme}
					width={containerWidth}
				/>
			</div>
		</div>
	);
}
