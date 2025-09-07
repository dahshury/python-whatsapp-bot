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
import { createGlideTheme } from "@/components/glide_custom_cells/components/utils/streamlitGlideTheme";
import type { Reservation } from "@/types/calendar";

interface CustomerReservationsGridProps {
	reservations: Reservation[];
	isLocalized: boolean;
}

export function CustomerReservationsGrid({
	reservations,
	isLocalized,
}: CustomerReservationsGridProps) {
	const { theme: currentTheme } = useTheme();
	const isDarkMode = currentTheme === "dark";

	// Container ref for measuring width
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = React.useState<number>(240); // Default width

	// Force grid to re-render when theme changes by using a key
	const [themeKey, setThemeKey] = React.useState(0);

	// Update theme key when theme changes
	React.useEffect(() => {
		// Small delay to ensure CSS variables are updated
		const timer = setTimeout(() => {
			setThemeKey((prev) => prev + 1);
		}, 50);
		return () => clearTimeout(timer);
	}, []);

	// Measure container width
	React.useEffect(() => {
		if (!containerRef.current) return;

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
			headerHeight: 22,
			rowHeight: 24,
			baseFontStyle: "12px",
		};
	}, [isDarkMode]);

	const columns: GridColumn[] = useMemo(() => {
		// Calculate column widths based on container width
		const totalWidth = containerWidth;
		const dateWidth = Math.max(85, Math.floor(totalWidth * 0.35));
		const timeWidth = Math.max(70, Math.floor(totalWidth * 0.3));
		const typeWidth = Math.max(85, totalWidth - dateWidth - timeWidth);

		return [
			{
				title: isLocalized ? "التاريخ" : "Date",
				id: "date",
				width: dateWidth,
			},
			{
				title: isLocalized ? "الوقت" : "Time",
				id: "time",
				width: timeWidth,
			},
			{
				title: isLocalized ? "النوع" : "Type",
				id: "type",
				width: typeWidth,
			},
		];
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
			const ampm = hour >= 12 ? "PM" : "AM";
			const hour12 = hour % 12 || 12;
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
		[isLocalized],
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
		[isLocalized],
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
		[reservations, columns, formatDate, formatTime, getServiceType],
	);

	if (reservations.length === 0) {
		return (
			<div className="text-center py-2 text-xs text-muted-foreground">
				{isLocalized ? "لا توجد حجوزات" : "No reservations"}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="w-full mt-1 rounded-sm overflow-hidden glide-grid-wrapper"
			data-fullwidth="true"
		>
			<div className="glide-grid-inner glide-grid-inner-full glide-grid-fullwidth">
				<DataEditor
					key={`customer-grid-${themeKey}`}
					getCellContent={getCellContent}
					columns={columns}
					rows={reservations.length}
					width={containerWidth}
					height={Math.min(300, reservations.length * 24 + 22)} // Header + rows (increased max height)
					smoothScrollX={false}
					smoothScrollY={false}
					rowMarkers="none"
					headerHeight={22}
					rowHeight={24}
					theme={gridTheme}
					className="gdg-wmyidgi"
				/>
			</div>
		</div>
	);
}
