"use client";

import {
	DataEditor,
	type EditableGridCell,
	GridCellKind,
	type GridColumn,
	type Item,
	type TextCell,
} from "@glideapps/glide-data-grid";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { InMemoryDataSource } from "@/components/glide_custom_cells/components/core/data-sources/InMemoryDataSource";
import type { DataProvider } from "@/components/glide_custom_cells/components/core/services/DataProvider";
import { createGlideTheme } from "@/components/glide_custom_cells/components/utils/streamlitGlideTheme";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";

const Grid = dynamic(
	() => import("@/components/glide_custom_cells/components/Grid"),
	{
		ssr: false,
		loading: () => null,
	},
);

interface CalendarEvent {
	id: string;
	title: string;
	start: string;
	end?: string;
	type: "reservation" | "conversation" | "cancellation";
	extendedProps: {
		description?: string;
		customerName?: string;
		phone?: string;
		status?: string;
		type?: number; // 0 for check-up, 1 for follow-up, 2 for conversation
		cancelled?: boolean;
	};
}

interface DataTableEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	events: CalendarEvent[];
	selectedDateRange: { start: string; end: string } | null;
	isRTL: boolean;
	slotDurationHours: number;
	onSave: (events: CalendarEvent[]) => void;
	onEventClick: (event: CalendarEvent) => void;
	freeRoam?: boolean;
}

interface DataTableEditorContentProps {
	dataSource: InMemoryDataSource;
	isRTL: boolean;
	onSave: () => void;
	canSave: boolean;
	isSaving: boolean;
	dataProviderRef: React.MutableRefObject<DataProvider | null>;
	onDataProviderReady?: (provider: DataProvider) => void;
}

export function DataTableEditor({
	open,
	onOpenChange,
	events,
	selectedDateRange,
	isRTL,
	slotDurationHours,
	onSave,
	onEventClick: _onEventClick,
	freeRoam = false,
}: DataTableEditorProps) {
	const [editingEvents, setEditingEvents] = useState<CalendarEvent[]>([]);
	const [isDirty, setIsDirty] = useState(false);
	const { theme } = useTheme();
	const { theme: _styleTheme } = useSettings(); // Get the style theme (e.g., "theme-ghibli-studio")
	const [gridKey, setGridKey] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);

	// Force grid to re-render when theme changes by using a key
	const [themeKey, setThemeKey] = useState(0);

	// Update theme key when theme changes
	React.useEffect(() => {
		// Small delay to ensure CSS variables are updated
		const timer = setTimeout(() => {
			setThemeKey((prev) => prev + 1);
		}, 50);
		return () => clearTimeout(timer);
	}, []);

	// Dynamic grid and dialog height based on row count
	const [gridHeight, setGridHeight] = useState(300);
	useEffect(() => {
		const rowHeight = 35; // px per row
		const headerHeight = 60; // px for DataEditor header row

		let calculatedHeight: number;
		if (editingEvents.length === 0) {
			// Height for header + single trailing row if no data
			calculatedHeight = headerHeight + rowHeight;
		} else {
			// Height for header + data rows
			calculatedHeight = editingEvents.length * rowHeight + headerHeight;
		}

		// Cap at 80% of viewport height
		const maxHeight =
			typeof window !== "undefined"
				? window.innerHeight * 0.8
				: calculatedHeight;
		setGridHeight(Math.min(calculatedHeight, maxHeight));
	}, [editingEvents]);

	// Create a unique ID for each event that includes all relevant data to deduplicate
	const _createUniqueEventId = (event: CalendarEvent) => {
		// Include id, date, time, and type in the unique key
		const dateTime =
			event.start.split("T")[0] + (event.start.split("T")[1] || "");
		return `${event.id}_${dateTime}_${event.extendedProps.type || 0}`;
	};

	// Use memoization to prevent unnecessary filtering and re-renders
	const filteredEvents = useMemo(() => {
		if (!selectedDateRange || !events.length) return [];

		return events
			.filter((event) => {
				// Only include reservations (excluding conversations)
				if (event.type === "conversation") {
					return false;
				}

				// Only include active reservations and cancelled ones in free roam
				if (event.extendedProps.cancelled && !freeRoam) {
					return false;
				}

				const eventStart = new Date(event.start);

				// Handle different selection types
				if (selectedDateRange.start.includes("T")) {
					// Time-specific selection
					const rangeStart = new Date(selectedDateRange.start);
					const rangeEnd = new Date(
						selectedDateRange.end || selectedDateRange.start,
					);

					// Add slot duration if end time is the same as start time
					if (rangeStart.getTime() === rangeEnd.getTime()) {
						rangeEnd.setHours(rangeEnd.getHours() + slotDurationHours);
					}

					return eventStart >= rangeStart && eventStart < rangeEnd;
				} else {
					// Full day selection
					const rangeStartDay = new Date(selectedDateRange.start);
					rangeStartDay.setHours(0, 0, 0, 0);

					let rangeEndDay: Date;
					if (
						selectedDateRange.end &&
						selectedDateRange.end !== selectedDateRange.start
					) {
						// Date range
						rangeEndDay = new Date(selectedDateRange.end);
						rangeEndDay.setHours(23, 59, 59, 999);
					} else {
						// Single day
						rangeEndDay = new Date(rangeStartDay);
						rangeEndDay.setHours(23, 59, 59, 999);
					}

					return eventStart >= rangeStartDay && eventStart <= rangeEndDay;
				}
			})
			.sort((a, b) => {
				// Sort by date and time
				const dateA = new Date(a.start);
				const dateB = new Date(b.start);

				// First sort by date
				if (dateA.toDateString() !== dateB.toDateString()) {
					return dateA.getTime() - dateB.getTime();
				}

				// Then by time
				return dateA.getTime() - dateB.getTime();
			});
	}, [events, selectedDateRange, slotDurationHours, freeRoam]);

	// Update editing events whenever filtered events change
	useEffect(() => {
		setEditingEvents(filteredEvents);
		setGridKey((prevKey) => prevKey + 1);
		setIsDirty(false);
	}, [filteredEvents]);

	const handleAddEvent = () => {
		const newEvent: CalendarEvent = {
			id: Date.now().toString(),
			title: "New Event",
			start: selectedDateRange?.start
				? `${selectedDateRange.start}T09:00:00`
				: (() => {
						// Build local timestamp without timezone to avoid UTC shift in calendar
						const now = new Date();
						const yyyy = now.getFullYear();
						const mm = String(now.getMonth() + 1).padStart(2, "0");
						const dd = String(now.getDate()).padStart(2, "0");
						const HH = String(now.getHours()).padStart(2, "0");
						const MM = String(now.getMinutes()).padStart(2, "0");
						const SS = String(now.getSeconds()).padStart(2, "0");
						return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}`;
					})(),
			type: "reservation",
			extendedProps: {
				customerName: "",
				phone: "",
				description: "",
				status: "pending",
				type: 0, // Default to check-up (0)
				cancelled: false,
			},
		};
		setEditingEvents((prev) => [...prev, newEvent]);
		setIsDirty(true);
	};

	const handleEditEvent = (id: string, field: string, value: string) => {
		setEditingEvents((prev) =>
			prev.map((event) => {
				if (event.id === id) {
					if (field.startsWith("extendedProps.")) {
						const propName = field.replace("extendedProps.", "");
						return {
							...event,
							extendedProps: {
								...event.extendedProps,
								[propName]: value,
							},
						};
					}
					if (field === "eventDate") {
						const time = new Date(event.start).toTimeString().slice(0, 8);
						return { ...event, start: `${value}T${time}` };
					}
					if (field === "eventTime") {
						const date = new Date(event.start).toISOString().split("T")[0];
						return { ...event, start: `${date}T${value}:00` };
					}
					return { ...event, [field]: value };
				}
				return event;
			}),
		);
		setIsDirty(true);
	};

	const formatDateRange = () => {
		if (!selectedDateRange) return "";

		const formatOptions: Intl.DateTimeFormatOptions = {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			...(isRTL && { calendar: "islamic" }),
		};

		const startDate = new Date(selectedDateRange.start);

		if (selectedDateRange.start.includes("T")) {
			// Single slot selection
			const startTimeFormatted = startDate.toLocaleTimeString(
				isRTL ? "ar-SA" : "en-US",
				{
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
					...(isRTL && { calendar: "islamic" }),
				},
			);
			const endDate = new Date(startDate);
			endDate.setHours(startDate.getHours() + slotDurationHours);
			const endTimeFormatted = endDate.toLocaleTimeString(
				isRTL ? "ar-SA" : "en-US",
				{
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
					...(isRTL && { calendar: "islamic" }),
				},
			);
			const dayFormatted = startDate.toLocaleDateString(
				isRTL ? "ar-SA" : "en-US",
				formatOptions,
			);
			return `${dayFormatted}, ${startTimeFormatted} - ${endTimeFormatted}`;
		} else {
			// Date or date range selection
			const startDateFormatted = startDate.toLocaleDateString(
				isRTL ? "ar-SA" : "en-US",
				formatOptions,
			);
			const endDate = new Date(selectedDateRange.end);
			const endDateFormatted = endDate.toLocaleDateString(
				isRTL ? "ar-SA" : "en-US",
				formatOptions,
			);

			if (
				selectedDateRange.start.split("T")[0] ===
				selectedDateRange.end.split("T")[0]
			) {
				return startDateFormatted; // Single day
			} else {
				return `${startDateFormatted} - ${endDateFormatted}`; // Date range
			}
		}
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			if (isDirty) {
				// When closing, if data has changed, prepare and save it.

				// 1. Filter out events that are not within the currently edited date range.
				const otherEvents = events.filter((event) => {
					if (!selectedDateRange) return true;

					const eventStart = new Date(event.start);

					if (selectedDateRange.start.includes("T")) {
						// This is a time-based selection
						const rangeStart = new Date(selectedDateRange.start);
						const rangeEnd = new Date(
							selectedDateRange.end || selectedDateRange.start,
						);

						if (rangeStart.getTime() === rangeEnd.getTime()) {
							const extendedEnd = new Date(rangeStart);
							extendedEnd.setHours(rangeStart.getHours() + slotDurationHours);
							return eventStart < rangeStart || eventStart >= extendedEnd;
						}
						return eventStart < rangeStart || eventStart >= rangeEnd;
					} else {
						// This is a full-day or day-range selection
						const rangeStartDay = new Date(selectedDateRange.start);
						rangeStartDay.setHours(0, 0, 0, 0);

						const rangeEndDay = new Date(
							selectedDateRange.end || selectedDateRange.start,
						);
						rangeEndDay.setHours(23, 59, 59, 999);

						return eventStart < rangeStartDay || eventStart > rangeEndDay;
					}
				});

				// 2. Combine the other events with the events that were edited.
				// The edited events replace the original ones from that date range.
				const finalEvents = [...otherEvents, ...editingEvents];

				onSave(finalEvents);
			}
		}
		onOpenChange(open);
	};

	// Track container width for responsive columns
	useEffect(() => {
		if (!containerRef.current) return;

		const updateWidth = () => {
			if (containerRef.current) {
				setContainerWidth(containerRef.current.offsetWidth);
			}
		};

		// Set initial width
		updateWidth();

		// Set up resize observer to update width when container resizes
		const resizeObserver = new ResizeObserver(updateWidth);
		resizeObserver.observe(containerRef.current);

		return () => {
			if (containerRef.current) {
				resizeObserver.unobserve(containerRef.current);
			}
			resizeObserver.disconnect();
		};
	}, []);

	// Define grid columns for Glide Data Grid with proportional widths
	const getColumns = (): GridColumn[] => {
		// Fallback to a default width if container width not yet measured
		const totalWidth =
			containerWidth && containerWidth > 0
				? containerWidth
				: typeof window !== "undefined"
					? window.innerWidth * 0.8
					: 600;
		// Calculate total available width (subtract some padding for safety)
		const availableWidth = Math.max(totalWidth - 60, 300);

		// Define column proportions (must add up to 1)
		const proportions = [0.2, 0.2, 0.25, 0.2, 0.15];

		return [
			{
				title: isRTL ? "التاريخ الميلادي" : "Date",
				width: availableWidth * proportions[0],
				grow: 1,
			},
			{
				title: isRTL ? "الوقت" : "Time",
				width: availableWidth * proportions[1],
				grow: 1,
			},
			{
				title: isRTL ? "رقم الهاتف" : "Phone Number",
				width: availableWidth * proportions[2],
				grow: 1,
			},
			{
				title: isRTL ? "نوع الحجز" : "Reservation type",
				width: availableWidth * proportions[3],
				grow: 1,
			},
			{
				title: isRTL ? "الاسم" : "Name",
				width: availableWidth * proportions[4],
				grow: 1,
			},
		];
	};

	// Provide cell content for each cell, matching Python implementation order
	const getCellContent = (cell: Item): TextCell => {
		const [col, row] = cell;
		const event = editingEvents[row];
		const emptyCell: TextCell = {
			kind: GridCellKind.Text,
			data: "",
			displayData: "",
			allowOverlay: true,
		};
		if (!event) return emptyCell;

		switch (col) {
			case 0: {
				// Date
				const dateStr = new Date(event.start).toISOString().split("T")[0];
				return {
					kind: GridCellKind.Text,
					data: dateStr,
					displayData: dateStr,
					allowOverlay: true,
				};
			}
			case 1: {
				// Time
				const timeStr = new Date(event.start).toTimeString().slice(0, 5);
				return {
					kind: GridCellKind.Text,
					data: timeStr,
					displayData: timeStr,
					allowOverlay: true,
				};
			}
			case 2: // Phone
				return {
					kind: GridCellKind.Text,
					data: event.id || "",
					displayData: event.id || "",
					allowOverlay: true,
				};
			case 3: {
				// Type
				// Map event type number to text with proper localization
				const typeValue = event.extendedProps.type || 0;
				const typeText =
					typeValue === 0
						? isRTL
							? "كشف"
							: "Check-up"
						: isRTL
							? "مراجعة"
							: "Follow-up";
				return {
					kind: GridCellKind.Text,
					data: typeText,
					displayData: typeText,
					allowOverlay: true,
				};
			}
			case 4: // Name
				return {
					kind: GridCellKind.Text,
					data: event.extendedProps.customerName || "",
					displayData: event.extendedProps.customerName || "",
					allowOverlay: true,
				};
			default:
				return emptyCell;
		}
	};

	// Handle cell edits and update events
	const onCellEdited = (cell: Item, newValue: EditableGridCell) => {
		const [col, row] = cell;
		const event = editingEvents[row];
		const column = getColumns()[col];

		if (newValue.kind !== "text") return;

		handleEditEvent(event.id, column.id ?? "", newValue.data);
	};

	// Row append handler matching Python's new event creation
	const onRowAppended = () => {
		handleAddEvent();
	};

	// Re-create theme when either light/dark mode or style theme changes
	const gridTheme = React.useMemo(
		() => createGlideTheme(theme === "dark" ? "dark" : "light"),
		[theme],
	);

	// Trailing row options for the plus sign
	const trailingRowOptions = {
		tint: true,
		sticky: true,
		hint: "", // Remove the "click to add" text
		themeOverride: {
			bgCell: gridTheme.bgCellMedium,
			textMedium: gridTheme.textMedium,
			borderColor: gridTheme.borderColor,
		},
	};

	if (!open) return null;

	const modalHeight = `${Math.min(gridHeight + 200, typeof window !== "undefined" ? window.innerHeight * 0.95 : 800)}px`;

	return (
		<button
			type="button"
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 border-none bg-transparent cursor-pointer"
			onClick={() => handleClose(false)}
			aria-label={isRTL ? "إغلاق المحرر" : "Close editor"}
		>
			<div
				role="dialog"
				className="bg-background rounded-lg shadow-lg flex flex-col p-4 w-[90vw] max-w-5xl max-h-[95vh]"
				style={{ height: modalHeight }}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					e.stopPropagation();
					if (e.key === "Escape") {
						handleClose(false);
					}
				}}
				tabIndex={-1}
			>
				{/* Header */}
				<div className="px-0 pb-4">
					<h2
						className={`flex items-center gap-2 text-xl font-semibold ${isRTL ? "flex-row-reverse" : ""}`}
					>
						{isRTL ? "محرر البيانات" : "Data Editor"} - {formatDateRange()}
						<span className="text-sm font-normal text-muted-foreground">
							({editingEvents.length} {isRTL ? "أحداث" : "events"})
						</span>
					</h2>
					<p className="text-sm text-muted-foreground">
						{isRTL
							? "تحرير أحداث التقويم للفترة المحددة"
							: "Edit calendar events for the selected date range"}
					</p>
				</div>

				{/* Events Grid */}
				<div className="flex flex-col gap-4 flex-1 overflow-hidden">
					<div
						ref={containerRef}
						className="border rounded-lg overflow-hidden flex-1"
					>
						<DataEditor
							key={`${gridKey}-${themeKey}`}
							getCellContent={getCellContent}
							columns={getColumns()}
							rows={editingEvents.length}
							onCellEdited={onCellEdited}
							onRowAppended={onRowAppended}
							trailingRowOptions={trailingRowOptions}
							width="100%"
							height={gridHeight}
							rowMarkers="checkbox"
							theme={gridTheme}
							smoothScrollX
							smoothScrollY
							scaleToRem={true}
							experimental={{
								disableMinimumCellWidth: true,
								paddingRight: 0,
							}}
							fillHandle={false}
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex justify-end pt-4 gap-2">
					<Button variant="secondary" onClick={() => handleClose(false)}>
						{isRTL ? "إلغاء" : "Cancel"}
					</Button>
					<Button onClick={() => handleClose(false)}>
						{isRTL ? "حفظ" : "Save"}
					</Button>
				</div>
			</div>
		</button>
	);
}

export function DataTableEditorContent({
	dataSource,
	isRTL: _isRTL,
	onSave: _onSave,
	canSave: _canSave,
	isSaving: _isSaving,
	dataProviderRef,
	onDataProviderReady,
}: DataTableEditorContentProps) {
	const [_isGridReady, setIsGridReady] = React.useState(false);

	const handleDataProviderReady = React.useCallback(
		(provider: unknown) => {
			const dp = provider as DataProvider;
			dataProviderRef.current = dp;
			setIsGridReady(true);
			onDataProviderReady?.(dp);
		},
		[dataProviderRef, onDataProviderReady],
	);

	return (
		<Grid
			dataSource={dataSource}
			showThemeToggle={false}
			fullWidth={true}
			theme={
				createGlideTheme("light") as unknown as Partial<
					import("@glideapps/glide-data-grid").Theme
				>
			}
			isDarkMode={false}
			onReady={() => setIsGridReady(true)}
			onDataProviderReady={handleDataProviderReady}
		/>
	);
}
