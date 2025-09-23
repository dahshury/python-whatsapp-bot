"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { AnimatePresence, motion } from "framer-motion";
import { Save, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { useDataTableDataSource } from "@/hooks/useDataTableDataSource";
import { useDataTableSaveHandler } from "@/hooks/useDataTableSaveHandler";
import { useDataTableValidation } from "@/hooks/useDataTableValidation";
import { formatHijriDate } from "@/lib/hijri-utils";
import { useSettings } from "@/lib/settings-context";
import { Z_INDEX } from "@/lib/z-index";
// formatDateTimeOptions removed - using inline options instead
import type {
	CalendarEvent as DataTableCalendarEvent,
	DataTableEditorProps,
} from "@/types/data-table-editor";
import { UnsavedChangesDialog } from "./data-table-editor/UnsavedChangesDialog";
import { ValidationErrorsPopover } from "./data-table-editor/ValidationErrorsPopover";
import { FullscreenProvider } from "./glide_custom_cells/components/contexts/FullscreenContext";
import type { DataProvider } from "./glide_custom_cells/components/core/services/DataProvider";
import { createGlideTheme } from "./glide_custom_cells/components/utils/streamlitGlideTheme";

const Grid = dynamic(() => import("./grids/CalendarEditorGrid"), {
	ssr: false,
});

// Deep comparison for validation errors to prevent unnecessary state updates
function areValidationErrorsEqual(
	a: Array<{ row: number; col: number; message: string; fieldName?: string }>,
	b: Array<{ row: number; col: number; message: string; fieldName?: string }>,
): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		const errA = a[i];
		const errB = b[i];
		if (
			!errA ||
			!errB ||
			errA.row !== errB.row ||
			errA.col !== errB.col ||
			errA.message !== errB.message ||
			errA.fieldName !== errB.fieldName
		) {
			return false;
		}
	}
	return true;
}

export function DataTableEditor(props: DataTableEditorProps) {
	const {
		open,
		onOpenChange,
		events,
		selectedDateRange,
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
	const [canSave, setCanSave] = useState(false);
	const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
		useState(false);
	const [pendingCloseAction, setPendingCloseAction] = useState<
		(() => void) | null
	>(null);
	const { theme: appTheme } = useTheme();
	const { theme: _styleTheme } = useSettings();
	const isDarkMode = appTheme === "dark";

	const _isLocalized = isLocalized ?? false;

	const dataProviderRef = useRef<DataProvider | null>(null);
	const dataEditorRef = useRef<DataEditorRef | null>(null);
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
		open,
		isLocalized ?? false,
	);

	const { validateAllCells, checkEditingState, hasUnsavedChanges } =
		useDataTableValidation(dataProviderRef);

	const [validationErrors, setValidationErrors] = useState<
		Array<{ row: number; col: number; message: string; fieldName?: string }>
	>([]);

	// Ref to track previous validation errors for comparison
	const previousValidationErrors = useRef<
		Array<{ row: number; col: number; message: string; fieldName?: string }>
	>([]);

	// Stable validation error setter that only updates if errors actually changed
	const setValidationErrorsIfChanged = useCallback(
		(
			newErrors: Array<{
				row: number;
				col: number;
				message: string;
				fieldName?: string;
			}>,
		) => {
			if (
				!areValidationErrorsEqual(previousValidationErrors.current, newErrors)
			) {
				previousValidationErrors.current = newErrors;
				setValidationErrors(newErrors);
			}
		},
		[],
	);

	const { isSaving, handleSaveChanges: performSave } = useDataTableSaveHandler({
		...(calendarRef ? { calendarRef } : {}),
		isLocalized: _isLocalized,
		slotDurationHours: slotDurationHours || 1,
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

		if (_isLocalized) {
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

			const dayOptions: Intl.DateTimeFormatOptions = { weekday: "long" };
			const startDayName = startDate.toLocaleDateString("ar-SA", dayOptions);
			const isSameCalendarDay =
				computedEnd &&
				startDate.getFullYear() === computedEnd.getFullYear() &&
				startDate.getMonth() === computedEnd.getMonth() &&
				startDate.getDate() === computedEnd.getDate();

			// If time info and end date falls on the same calendar day, avoid repeating the date.
			if (hasTimeInfo && computedEnd && isSameCalendarDay) {
				const dateStr = formatHijriDate(startDate);
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
				return `${startDayName}, ${dateStr} ${startTimeStr} - ${endTimeStr}`;
			}

			// Date-only or cross-day range: include day names with Hijri dates
			if (!computedEnd || isSameCalendarDay) {
				return `${startDayName}, ${formatHijriDate(startDate)}`;
			}
			const endDayName = computedEnd.toLocaleDateString("ar-SA", dayOptions);
			return `${startDayName}, ${formatHijriDate(startDate)} - ${endDayName}, ${formatHijriDate(computedEnd)}`;
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
			}
			return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endTimeStr}`;
		}
		// Format without time (date only) with day name
		const dayOptions: Intl.DateTimeFormatOptions = {
			weekday: "long",
		};
		const startDayName = startDate.toLocaleDateString(undefined, dayOptions);

		if (endDate && startDate.toDateString() !== endDate.toDateString()) {
			const endDayName = endDate.toLocaleDateString(undefined, dayOptions);
			return `${startDayName}, ${startDate.toLocaleDateString()} - ${endDayName}, ${endDate.toLocaleDateString()}`;
		}
		return `${startDayName}, ${startDate.toLocaleDateString()}`;
	};

	const handleCheckEditingState = useCallback(() => {
		const state = checkEditingState();

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

		// Also refresh validation errors immediately so UI updates as rules are fixed/violated
		try {
			const result = validateAllCells();
			setValidationErrorsIfChanged(result.errors || []);
		} catch {}
	}, [
		checkEditingState,
		gridRowToEventMapRef?.current,
		setValidationErrorsIfChanged,
		validateAllCells,
	]);

	// Stable debounced validation check function
	const createDebouncedValidationCheck = useMemo(() => {
		return () => {
			let timeoutId: NodeJS.Timeout | null = null;

			return () => {
				if (timeoutId) clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					handleCheckEditingState();
					try {
						const result = validateAllCells();
						const provider = dataProviderRef.current as
							| (DataProvider & {
									getColumnDefinition?: (c: number) => {
										id?: string;
										name?: string;
										title?: string;
									};
									getCell?: (c: number, r: number) => unknown;
							  })
							| null;
						const mapped = (result.errors || [])
							.map((err) => {
								let fieldName = (err as { fieldName?: string })?.fieldName;
								if (!fieldName && provider?.getColumnDefinition) {
									try {
										const def = provider.getColumnDefinition(err.col) as
											| {
													id?: string;
													name?: string;
													title?: string;
											  }
											| undefined;
										fieldName = def?.id || def?.name || def?.title;
									} catch {}
								}
								return { ...err, fieldName };
							})
							.filter((err) => {
								const fn = String(err.fieldName || "").toLowerCase();
								if (fn !== "scheduled_time") return true;
								try {
									const cell = provider?.getCell?.(err.col, err.row) as
										| {
												data?: {
													kind?: string;
													date?: unknown;
												};
										  }
										| undefined;
									const hasDate = Boolean(
										cell &&
											(
												cell as {
													data?: {
														kind?: string;
														date?: unknown;
													};
												}
											).data?.kind === "tempus-date-cell" &&
											(
												cell as {
													data?: {
														kind?: string;
														date?: unknown;
													};
												}
											).data?.date,
									);
									return !hasDate;
								} catch {
									return true;
								}
							});
						setValidationErrorsIfChanged(
							mapped as Array<{
								row: number;
								col: number;
								message: string;
								fieldName?: string;
							}>,
						);
					} catch {}
					timeoutId = null;
				}, 100); // Debounce by 100ms
			};
		};
	}, [handleCheckEditingState, validateAllCells, setValidationErrorsIfChanged]);

	useEffect(() => {
		if (open) {
			setCanSave(false);
			if (dataProviderRef.current) {
				try {
					dataProviderRef.current.refresh?.();
				} catch {}
			}
			// Add body class for CSS targeting when dialog is open
			document.body.classList.add("has-dialog-backdrop");
			return () => {
				document.body.classList.remove("has-dialog-backdrop");
			};
		}
		setCanSave(false);
		// Clear validation errors when dialog is closed to prevent stale state
		setValidationErrors([]);
		previousValidationErrors.current = [];
		// Remove body class when dialog is closed
		document.body.classList.remove("has-dialog-backdrop");
		return undefined;
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
			for (const ev of previousEventsRef.current || []) {
				const k = getReservationKeyRef.current(ev);
				if (k) prevMap.set(k, ev);
			}

			// Merge: follow new ordering, but preserve blocked keys' prior versions
			const merged: DataTableCalendarEvent[] = [];
			for (const ev of events || []) {
				const k = getReservationKeyRef.current(ev);
				if (k && blockedKeys.has(k)) {
					merged.push(prevMap.get(k) ?? ev);
				} else {
					merged.push(ev);
				}
			}

			// If a blocked event was deleted on server, keep it locally until edits are resolved
			for (const [k, oldEv] of prevMap.entries()) {
				if (blockedKeys.has(k)) {
					const stillExists = (events || []).some(
						(ev) => getReservationKeyRef.current(ev) === k,
					);
					if (!stillExists) merged.push(oldEv);
				}
			}

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
		// Check validation
		validateAllCells();

		const success = await performSave();

		if (success) {
			setCanSave(false);
		}
	}, [performSave, validateAllCells]);

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
			<AnimatePresence>
				{open && (
					<>
						<motion.button
							key="dt-backdrop"
							className="fixed inset-0 dialog-backdrop bg-black/80 backdrop-blur-sm"
							style={{ zIndex: Z_INDEX.DIALOG_BACKDROP }}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.22, ease: "easeInOut" }}
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

						<motion.dialog
							key="dt-dialog"
							className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-6xl w-full h-auto max-h-[95vh] p-0 flex flex-col overflow-visible dialog-content gap-0 grid border bg-background shadow-lg sm:rounded-lg"
							style={{ zIndex: Z_INDEX.DIALOG_CONTENT }}
							aria-describedby="data-editor-description"
							initial={{ opacity: 0, scale: 0.98, y: 8 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.98, y: -8 }}
							transition={{ duration: 0.25, ease: "easeInOut" }}
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
							open
						>
							<div className="px-4 py-1.5 border-b flex flex-row items-center justify-between">
								<div className="flex flex-col space-y-1.5">
									<h2
										className={`text-xl font-semibold leading-none tracking-tight py-2 ${_isLocalized ? "text-right" : "text-left"}`}
									>
										{_isLocalized ? "محرر البيانات" : "Data Editor"} -{" "}
										{formatDateRange()}
									</h2>
									<p
										id={`data-editor-description-${typeof window !== "undefined" ? "client" : "ssr"}`}
										className="sr-only"
									>
										{_isLocalized
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
										<div className="absolute inset-0 z-10 bg-background/0" />
									)}
									<div>
										<FullscreenProvider>
											{Grid && (
												<Grid
													showThemeToggle={false}
													fullWidth={true}
													theme={gridTheme}
													isDarkMode={isDarkMode}
													dataSource={dataSource}
													dataEditorRef={
														dataEditorRef as React.RefObject<DataEditorRef>
													}
													loading={!isGridReady}
													validationErrors={validationErrors}
													onReady={() => setIsGridReady(true)}
													onDataProviderReady={(provider: unknown) => {
														const dataProvider = provider as DataProvider;
														dataProviderRef.current = dataProvider;

														const editingState = dataProvider.getEditingState();

														// Use the stable debounced validation check function
														const debouncedCheck =
															createDebouncedValidationCheck();

														const unsubscribe =
															editingState.onChange(debouncedCheck);

														// Live validation updates whenever a cell value is loaded/changed
														try {
															dataProvider.setOnCellDataLoaded?.(
																(_c: number, _r: number) => {
																	try {
																		const v = validateAllCells();
																		setValidationErrorsIfChanged(
																			v.errors || [],
																		);
																	} catch {}
																},
															);
														} catch {}

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

							<div className="px-4 py-1.5 border-t flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 gap-2">
								<div className="flex items-center gap-2 relative ms-auto">
									<Button
										onClick={handleSaveChanges}
										className="gap-2"
										disabled={!canSave || isSaving}
									>
										{isSaving ? (
											<>
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
												{_isLocalized ? "جاري الحفظ..." : "Saving..."}
											</>
										) : (
											<>
												<Save className="h-4 w-4" />
												{_isLocalized ? "حفظ التغييرات" : "Save Changes"}
											</>
										)}
									</Button>
									{validationErrors?.length > 0 && (
										<div className="absolute -top-1 -left-1">
											<ValidationErrorsPopover
												errors={validationErrors}
												triggerClassName=""
											/>
										</div>
									)}
								</div>
							</div>
						</motion.dialog>
					</>
				)}
			</AnimatePresence>

			<UnsavedChangesDialog
				open={showUnsavedChangesDialog}
				onOpenChange={setShowUnsavedChangesDialog}
				isLocalized={_isLocalized}
				onDiscard={handleDiscardChanges}
				onSaveAndClose={handleSaveAndClose}
				isSaving={isSaving}
				canSave={canSave}
			/>
		</>
	);
}
