"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { Save, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDataTableDataSource } from "@/hooks/useDataTableDataSource";
import { useDataTableSaveHandler } from "@/hooks/useDataTableSaveHandler";
import { useDataTableValidation } from "@/hooks/useDataTableValidation";

import { formatDateRangeWithHijri } from "@/lib/hijri-utils";
import { Z_INDEX } from "@/lib/z-index";
import { useSettings } from "@/lib/settings-context";
// formatDateTimeOptions removed - using inline options instead
import type {
	CalendarEvent as DataTableCalendarEvent,
	DataTableEditorProps,
} from "@/types/data-table-editor";

import { UnsavedChangesDialog } from "./data-table-editor/UnsavedChangesDialog";
import { FullscreenProvider } from "./glide_custom_cells/components/contexts/FullscreenContext";
import type { DataProvider } from "./glide_custom_cells/components/core/services/DataProvider";

import { createGlideTheme } from "./glide_custom_cells/components/utils/streamlitGlideTheme";

const Grid = dynamic(() => import("./glide_custom_cells/components/Grid"), {
	ssr: false,
});

export function DataTableEditor(props: DataTableEditorProps) {
	const {
		open,
		onOpenChange,
		events,
		selectedDateRange,
		isRTL,
		isLocalized,
		slotDurationHours,
		onSave: _onSave,
		onEventClick: _onEventClick,
		freeRoam = false,
		data: _data = [],
		onDataChange: _onDataChange,
		language: _language = "en",
		calendarRef,
		onEventAdded,
		onEventModified,
		onEventCancelled,
	} = props;

	const [isGridReady, setIsGridReady] = useState(false);
	const [showSpinner, setShowSpinner] = useState(false);
	const [canSave, setCanSave] = useState(false);
	const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
		useState(false);
	const [pendingCloseAction, setPendingCloseAction] = useState<
		(() => void) | null
	>(null);
	const { theme: appTheme } = useTheme();
	const { theme: _styleTheme } = useSettings();
	const isDarkMode = appTheme === "dark";

	const _isRTL = (isRTL ?? isLocalized === true) === true;

	const dataProviderRef = useRef<DataProvider | null>(null);
	const dataEditorRef = useRef<DataEditorRef>(null);
	// Removed themeKey to prevent forced Grid remounts that cause flicker

	// Maintain a local, merge-friendly events source while editing to avoid losing draft rows/cells
	const [sourceEvents, setSourceEvents] =
		useState<DataTableCalendarEvent[]>(events);
	const previousEventsRef = useRef<DataTableCalendarEvent[]>(events);

	// Stable reservation identity used for locking and dedupe
	const getReservationKey = useCallback(
		(ev: DataTableCalendarEvent): string => {
			try {
				const ex = ev?.extendedProps as Record<string, unknown> | undefined;
				const rid =
					(ex?.reservationId as string | number | undefined) ?? undefined;
				if (rid !== undefined && rid !== null) return String(rid);
				const wa =
					(ex?.waId as string | undefined) ||
					(ex?.wa_id as string | undefined) ||
					(ex?.phone as string | undefined) ||
					"";
				const start = ev?.start || "";
				return `${wa}__${start}`;
			} catch {
				return String(ev?.id ?? ev?.start ?? "");
			}
		},
		[],
	);

	useEffect(() => {
		previousEventsRef.current = sourceEvents;
	}, [sourceEvents]);

	// Theme changes are handled via props; avoid forced remount timers

	const gridTheme = React.useMemo(
		() => createGlideTheme(isDarkMode ? "dark" : "light"),
		[isDarkMode],
	);

	const { dataSource, gridRowToEventMapRef } = useDataTableDataSource(
		sourceEvents,
		selectedDateRange,
		slotDurationHours,
		freeRoam,
		isRTL || _isRTL,
		isLocalized ?? false,
		open,
	);

	const { validateAllCells, checkEditingState, hasUnsavedChanges } =
		useDataTableValidation(dataProviderRef, _isRTL);

	const { isSaving, handleSaveChanges: performSave } = useDataTableSaveHandler({
		...(calendarRef ? { calendarRef } : {}),
		isRTL: _isRTL,
		slotDurationHours,
		freeRoam,
		gridRowToEventMapRef,
		dataProviderRef,
		validateAllCells,
		...(onEventAdded ? { onEventAdded } : {}),
		...(onEventModified ? { onEventModified } : {}),
		...(onEventCancelled ? { onEventCancelled } : {}),
	});

	// Stabilize function references used inside effects to keep dependency arrays constant
	const getReservationKeyRef = useRef(getReservationKey);
	useEffect(() => {
		getReservationKeyRef.current = getReservationKey;
	}, [getReservationKey]);

	const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
	useEffect(() => {
		hasUnsavedChangesRef.current = hasUnsavedChanges;
	}, [hasUnsavedChanges]);

	const formatDateRange = () => {
		if (!selectedDateRange) return "";

		const startDate = new Date(selectedDateRange.start);
		const endDate = selectedDateRange.end
			? new Date(selectedDateRange.end)
			: null;
		const hasTimeInfo = selectedDateRange.start.includes("T");

		if (_isRTL) {
			let computedEnd: Date | undefined;
			if (
				hasTimeInfo &&
				(!endDate || endDate.getTime() === startDate.getTime())
			) {
				computedEnd = new Date(
					startDate.getTime() + slotDurationHours * 60 * 60 * 1000,
				);
			} else {
				computedEnd = endDate || undefined;
			}

			// If time info and end date falls on the same calendar day, avoid repeating the date.
			if (
				hasTimeInfo &&
				computedEnd &&
				startDate.getFullYear() === computedEnd.getFullYear() &&
				startDate.getMonth() === computedEnd.getMonth() &&
				startDate.getDate() === computedEnd.getDate()
			) {
				const dateStr = formatDateRangeWithHijri(startDate, undefined);
				const startTimeStr = startDate.toLocaleTimeString("ar-SA", {
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
				});
				const endTimeStr = computedEnd.toLocaleTimeString("ar-SA", {
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
				});
				return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
			}
			return formatDateRangeWithHijri(startDate, computedEnd);
		}

		// Non-RTL formatting with day name first
		if (hasTimeInfo) {
			const timeOptions: Intl.DateTimeFormatOptions = {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			};
			const dateOptions: Intl.DateTimeFormatOptions = {
				year: "numeric",
				month: "short",
				day: "numeric",
			};
			const dayOptions: Intl.DateTimeFormatOptions = {
				weekday: "long",
			};

			const startDayName = startDate.toLocaleDateString(undefined, dayOptions);
			const startDateStr = startDate.toLocaleDateString(undefined, dateOptions);
			const startTimeStr = startDate.toLocaleTimeString(undefined, timeOptions);

			let computedEnd: Date | null = null;
			if (endDate && endDate.getTime() !== startDate.getTime()) {
				computedEnd = endDate;
			} else {
				computedEnd = new Date(
					startDate.getTime() + slotDurationHours * 60 * 60 * 1000,
				);
			}

			const endDateStr = computedEnd.toLocaleDateString(undefined, dateOptions);
			const endTimeStr = computedEnd.toLocaleTimeString(undefined, timeOptions);

			if (startDateStr !== endDateStr) {
				const endDayName = computedEnd.toLocaleDateString(
					undefined,
					dayOptions,
				);
				return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endDayName}, ${endDateStr} ${endTimeStr}`;
			} else {
				return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endTimeStr}`;
			}
		} else {
			// Format without time (date only) with day name
			const dayOptions: Intl.DateTimeFormatOptions = {
				weekday: "long",
			};
			const startDayName = startDate.toLocaleDateString(undefined, dayOptions);

			if (endDate && startDate.toDateString() !== endDate.toDateString()) {
				const endDayName = endDate.toLocaleDateString(undefined, dayOptions);
				return `${startDayName}, ${startDate.toLocaleDateString()} - ${endDayName}, ${endDate.toLocaleDateString()}`;
			} else {
				return `${startDayName}, ${startDate.toLocaleDateString()}`;
			}
		}
	};

	const handleCheckEditingState = useCallback(() => {
		const state = checkEditingState();

		// Debug logging
		console.log("🔍 DataTableEditor: checkEditingState result:", {
			hasChanges: state.hasChanges,
			isValid: state.isValid,
			canSave: state.hasChanges && state.isValid,
		});

		// Additional debugging for editing state
		if (dataProviderRef.current) {
			const editingState = dataProviderRef.current.getEditingState();
			const memoryUsage = editingState.getMemoryUsage();
			const hasChanges = editingState.hasChanges();

			console.log("🔍 EditingState details:", {
				memoryUsage,
				hasChanges,
				hasUnsavedChanges: hasUnsavedChanges(),
			});
		}

		let canEnable = state.hasChanges && state.isValid;

		// Additional guard: if user is editing an unmapped/template row,
		// require ALL required fields in that row to be filled and valid
		try {
			if (canEnable && dataProviderRef.current) {
				const provider = dataProviderRef.current;
				const rowCount: number = provider.getRowCount?.() ?? 0;
				const colCount: number = provider.getColumnCount?.() ?? 0;
				const editingState = provider.getEditingState?.();
				const mappedRows = new Set<number>();
				try {
					const mapRef = gridRowToEventMapRef?.current;
					if (mapRef && mapRef.size > 0) {
						for (const key of mapRef.keys()) mappedRows.add(key);
					}
				} catch {}

				const rowHasEdits = (rowIdx: number): boolean => {
					if (!editingState) return false;
					for (let c = 0; c < colCount; c++) {
						const cell = editingState.getCell?.(c, rowIdx);
						if (cell !== undefined) return true;
					}
					return false;
				};

				const isRequiredCellMissing = (
					cell: unknown,
					colDef: { isRequired?: boolean },
				): boolean => {
					if (!colDef?.isRequired) return false;
					if (!cell) return true;
					const gridCell = cell as {
						isMissingValue?: boolean;
						kind?: string;
						data?: unknown;
					};
					if (gridCell.isMissingValue === true) return true;
					const k = gridCell.kind;
					const data = (gridCell.data as Record<string, unknown>) || {};
					if (k === "Custom") {
						const kind = data?.kind;
						if (kind === "dropdown-cell") return !data.value;
						if (kind === "tempus-date-cell") return !data.date;
						if (kind === "timekeeper-cell") return !data.time;
					}
					if (k === "Text") {
						const gridCell = cell as { data?: unknown };
						return !(gridCell.data && String(gridCell.data).trim());
					}
					return false;
				};

				for (let r = 0; r < rowCount; r++) {
					const isMapped = mappedRows.has(r);
					if (isMapped) continue; // existing event row
					if (!rowHasEdits(r)) continue; // untouched template row

					// Enforce completeness for required columns in this row
					for (let c = 0; c < colCount; c++) {
						const colDef = provider.getColumnDefinition?.(c);
						if (!colDef?.isRequired) continue;
						const cell = provider.getCell?.(c, r);
						if (isRequiredCellMissing(cell, colDef)) {
							canEnable = false;
							break;
						}
					}
					if (!canEnable) break;
				}
			}
		} catch (e) {
			console.warn("Additional validation check failed:", e);
		}

		setCanSave(canEnable);
	}, [checkEditingState, hasUnsavedChanges, gridRowToEventMapRef?.current]);

	useEffect(() => {
		if (open) {
			// Delay spinner to avoid flashing on very fast readiness
			setShowSpinner(false);
			const t = setTimeout(() => setShowSpinner(true), 150);
			setCanSave(false);
			if (dataProviderRef.current) {
				try {
					dataProviderRef.current.refresh?.();
				} catch {}
			}
			// Add body class for CSS targeting when dialog is open
			document.body.classList.add("has-dialog-backdrop");
			return () => {
				clearTimeout(t);
				document.body.classList.remove("has-dialog-backdrop");
			};
		} else {
			setShowSpinner(false);
			setCanSave(false);
			// Remove body class when dialog is closed
			document.body.classList.remove("has-dialog-backdrop");
		}
	}, [open]);

	useEffect(() => {
		return () => {
			const provider = dataProviderRef.current as
				| (DataProvider & { unsubscribe?: () => void })
				| null;
			if (provider?.unsubscribe) provider.unsubscribe();
		};
	}, []);

	// Merge incoming websocket-driven events with local editing state so edited rows don't disappear
	// Use layout effect to avoid a visible frame where rows flicker before merge applies
	React.useLayoutEffect(() => {
		try {
			if (!open) {
				setSourceEvents(events);
				return;
			}

			const provider = dataProviderRef.current;
			if (!provider) {
				setSourceEvents(events);
				return;
			}

			// If there are no unsaved changes, accept incoming events wholesale
			if (!hasUnsavedChangesRef.current()) {
				setSourceEvents(events);
				return;
			}

			// Compute which existing grid rows have edits
			const editingState = provider.getEditingState?.();
			const baseRowCount: number = provider.getRowCount?.() ?? 0;
			const totalRows: number = editingState?.getNumRows?.() ?? baseRowCount;
			const colCount: number = provider.getColumnCount?.() ?? 0;
			const editedRowSet = new Set<number>();
			for (let r = 0; r < totalRows; r++) {
				for (let c = 0; c < colCount; c++) {
					const cell = editingState?.getCell?.(c, r);
					if (cell !== undefined) {
						editedRowSet.add(r);
						break;
					}
				}
			}

			// Map edited existing rows to their event keys via the previous grid row → event map
			const blockedKeys = new Set<string>();
			try {
				const mapRef = gridRowToEventMapRef?.current as
					| Map<number, DataTableCalendarEvent>
					| undefined;
				if (mapRef && mapRef.size > 0) {
					for (const [rowIndex, ev] of mapRef.entries()) {
						if (rowIndex < baseRowCount && editedRowSet.has(rowIndex)) {
							const key = getReservationKeyRef.current(ev);
							if (key) blockedKeys.add(key);
						}
					}
				}
			} catch {}

			// Build quick lookup of previous events by key
			const prevMap = new Map<string, DataTableCalendarEvent>();
			(previousEventsRef.current || []).forEach((ev) => {
				const k = getReservationKeyRef.current(ev);
				if (k) prevMap.set(k, ev);
			});

			// Merge: follow new ordering, but preserve blocked keys' prior versions
			const merged: DataTableCalendarEvent[] = [];
			(events || []).forEach((ev) => {
				const k = getReservationKeyRef.current(ev);
				if (k && blockedKeys.has(k)) {
					merged.push(prevMap.get(k) ?? ev);
				} else {
					merged.push(ev);
				}
			});

			// If a blocked event was deleted on server, keep it locally until edits are resolved
			prevMap.forEach((oldEv, k) => {
				if (blockedKeys.has(k)) {
					const stillExists = (events || []).some(
						(ev) => getReservationKeyRef.current(ev) === k,
					);
					if (!stillExists) merged.push(oldEv);
				}
			});

			// Dedupe by stable reservationId; fall back to getEventKey if missing
			const seen = new Set<string>();
			const deduped: DataTableCalendarEvent[] = [];
			for (const ev of merged) {
				const key = getReservationKeyRef.current(ev);
				if (!seen.has(key)) {
					seen.add(key);
					deduped.push(ev);
				}
			}
			setSourceEvents(deduped);
		} catch {
			// On any failure, fall back to incoming events to avoid stale UI
			setSourceEvents(events);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [events, open, gridRowToEventMapRef?.current]);

	const handleSaveChanges = useCallback(async () => {
		console.log("💾 DataTableEditor: Save button clicked!");

		// Debug the current state before saving
		if (dataProviderRef.current) {
			const editingState = dataProviderRef.current.getEditingState();
			const memoryUsage = editingState.getMemoryUsage();
			const hasChanges = editingState.hasChanges();

			console.log("💾 Pre-save EditingState:", {
				memoryUsage,
				hasChanges,
				canSave,
				isSaving,
			});

			// Check validation
			const validation = validateAllCells();
			console.log("💾 Validation result:", validation);
		}

		const success = await performSave();
		console.log("💾 Save result:", { success });

		if (success) {
			setCanSave(false);
		}
	}, [performSave, canSave, isSaving, validateAllCells]);

	const handleCloseAttempt = useCallback(
		(closeAction: () => void) => {
			if (hasUnsavedChanges()) {
				setPendingCloseAction(() => closeAction);
				setShowUnsavedChangesDialog(true);
			} else {
				closeAction();
			}
		},
		[hasUnsavedChanges],
	);

	const handleDiscardChanges = useCallback(() => {
		setShowUnsavedChangesDialog(false);
		if (pendingCloseAction) {
			pendingCloseAction();
			setPendingCloseAction(null);
		}
	}, [pendingCloseAction]);

	const handleSaveAndClose = useCallback(async () => {
		setShowUnsavedChangesDialog(false);
		await handleSaveChanges();
		if (pendingCloseAction) {
			pendingCloseAction();
			setPendingCloseAction(null);
		}
	}, [pendingCloseAction, handleSaveChanges]);

	return (
		<>
			{open && (
				<button
					className="fixed inset-0 dialog-backdrop bg-black/80 backdrop-blur-sm"
					style={{ zIndex: Z_INDEX.DIALOG_BACKDROP }}
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							handleCloseAttempt(() => onOpenChange(false));
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							handleCloseAttempt(() => onOpenChange(false));
						}
					}}
					type="button"
				/>
			)}

			{open && (
				<div
					role="dialog"
					className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-6xl w-full h-auto max-h-[95vh] p-0 flex flex-col overflow-visible dialog-content gap-0 grid border bg-background shadow-lg sm:rounded-lg"
					style={{ zIndex: Z_INDEX.DIALOG_CONTENT }}
					aria-describedby="data-editor-description"
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							const fullscreenPortal = document.getElementById(
								"grid-fullscreen-portal",
							);
							if (fullscreenPortal) {
								e.preventDefault();
								return;
							}
							handleCloseAttempt(() => onOpenChange(false));
						}
					}}
				>
					<div className="px-4 py-1.5 border-b flex flex-row items-center justify-between">
						<div className="flex flex-col space-y-1.5">
							<h2
								className={`text-xl font-semibold leading-none tracking-tight py-2 ${_isRTL ? "text-right" : "text-left"}`}
							>
								{_isRTL ? "محرر البيانات" : "Data Editor"} - {formatDateRange()}
							</h2>
							<p
								id={`data-editor-description-${typeof window !== "undefined" ? "client" : "ssr"}`}
								className="sr-only"
							>
								{_isRTL
									? "محرر لإدارة الحجوزات وبيانات العملاء"
									: "Editor for managing reservations and customer data"}
							</p>
						</div>
						<button
							type="button"
							className="flex-shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
							onClick={() => handleCloseAttempt(() => onOpenChange(false))}
						>
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</button>
					</div>

					<div className="overflow-visible w-full flex-1 min-h-0">
						<div className="overflow-visible relative w-full h-full">
							{!isGridReady && (
								<div className="absolute inset-0 z-10 bg-background flex items-center justify-center">
									{showSpinner && (
										<div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
									)}
								</div>
							)}
							<div
								style={{
									opacity: isGridReady ? 1 : 0,
									transition: "opacity 120ms ease-out",
									pointerEvents: isGridReady ? "auto" : "none",
								}}
							>
								<FullscreenProvider>
									{Grid && (
										<Grid
											showThemeToggle={false}
											fullWidth={true}
											theme={gridTheme}
											isDarkMode={isDarkMode}
											dataSource={dataSource}
											dataEditorRef={dataEditorRef}
											onReady={() => setIsGridReady(true)}
											onDataProviderReady={(provider: unknown) => {
												const dataProvider = provider as DataProvider;
												dataProviderRef.current = dataProvider;

												const editingState = dataProvider.getEditingState();
												const unsubscribe = editingState.onChange(() => {
													handleCheckEditingState();
												});

												(
													dataProviderRef.current as DataProvider & {
														unsubscribe?: () => void;
													}
												).unsubscribe = unsubscribe;

												handleCheckEditingState();
											}}
										/>
									)}
								</FullscreenProvider>
							</div>
						</div>
					</div>

					<div className="px-4 py-1.5 border-t flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
						<Button
							onClick={handleSaveChanges}
							className="gap-2"
							disabled={!canSave || isSaving}
						>
							{isSaving ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									{_isRTL ? "جاري الحفظ..." : "Saving..."}
								</>
							) : (
								<>
									<Save className="h-4 w-4" />
									{_isRTL ? "حفظ التغييرات" : "Save Changes"}
								</>
							)}
						</Button>
					</div>
				</div>
			)}

			<UnsavedChangesDialog
				open={showUnsavedChangesDialog}
				onOpenChange={setShowUnsavedChangesDialog}
				isRTL={_isRTL}
				onDiscard={handleDiscardChanges}
				onSaveAndClose={handleSaveAndClose}
				isSaving={isSaving}
				canSave={canSave}
			/>
		</>
	);
}
