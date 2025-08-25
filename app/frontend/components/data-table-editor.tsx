"use client";

import { Save, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDataTableDataSource } from "@/hooks/useDataTableDataSource";
import { useDataTableSaveHandler } from "@/hooks/useDataTableSaveHandler";
import { useDataTableValidation } from "@/hooks/useDataTableValidation";
import { useCustomerData } from "@/lib/customer-data-context";
import { formatDateRangeWithHijri } from "@/lib/hijri-utils";
import { useSettings } from "@/lib/settings-context";
// formatDateTimeOptions removed - using inline options instead
import type { DataTableEditorProps } from "@/types/data-table-editor";
import { UnsavedChangesDialog } from "./data-table-editor/UnsavedChangesDialog";
import { FullscreenProvider } from "./glide_custom_cells/components/contexts/FullscreenContext";
import type { DataProvider } from "./glide_custom_cells/components/core/services/DataProvider";
import { useDialogOverlayPortal } from "./glide_custom_cells/components/ui/DialogPortal";
import { TableSkeleton } from "./glide_custom_cells/components/ui/TableSkeleton";
import { configureCustomerAutoFill } from "./glide_custom_cells/components/utils/phoneInputCellFactory";
import { createGlideTheme } from "./glide_custom_cells/components/utils/streamlitGlideTheme";

const Grid = dynamic(() => import("./glide_custom_cells/components/Grid"), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center" style={{ height: 200 }}>
			<div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
		</div>
	),
});

export function DataTableEditor(props: DataTableEditorProps) {
	const {
		open,
		onOpenChange,
		events,
		selectedDateRange,
		isRTL,
		slotDurationHours,
		onSave,
		onEventClick,
		freeRoam = false,
		data = [],
		onDataChange,
		language = "en",
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
	const { theme: styleTheme } = useSettings();
	const isDarkMode = appTheme === "dark";

	const dataProviderRef = useRef<DataProvider | null>(null);
	const dataEditorRef = useRef<any>(null);
	const [themeKey, setThemeKey] = useState(0);

	// Use the dialog overlay portal to move overlay editors outside dialog
	useDialogOverlayPortal();

	// Get customer data refresh function
	const { refresh: refreshCustomerData } = useCustomerData();

	React.useEffect(() => {
		const timer = setTimeout(() => {
			setThemeKey((prev) => prev + 1);
		}, 50);
		return () => clearTimeout(timer);
	}, []);

	const gridTheme = React.useMemo(
		() => createGlideTheme(isDarkMode ? "dark" : "light"),
		[isDarkMode],
	);

	const { dataSource, gridRowToEventMapRef } = useDataTableDataSource(
		events,
		selectedDateRange,
		slotDurationHours,
		freeRoam,
		isRTL,
		open,
	);

	const { validateAllCells, checkEditingState, hasUnsavedChanges } =
		useDataTableValidation(dataProviderRef, isRTL);

	const { isSaving, handleSaveChanges: performSave } = useDataTableSaveHandler({
		calendarRef,
		isRTL,
		slotDurationHours,
		freeRoam,
		gridRowToEventMapRef,
		dataProviderRef,
		validateAllCells,
		onEventAdded,
		onEventModified,
		onEventCancelled,
		refreshCustomerData,
	});

	const formatDateRange = () => {
		if (!selectedDateRange) return "";

		const startDate = new Date(selectedDateRange.start);
		const endDate = selectedDateRange.end
			? new Date(selectedDateRange.end)
			: null;
		const hasTimeInfo = selectedDateRange.start.includes("T");

		if (isRTL) {
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
				const provider: any = dataProviderRef.current as any;
				const rowCount: number = provider.getRowCount?.() ?? 0;
				const colCount: number = provider.getColumnCount?.() ?? 0;
				const editingState = provider.getEditingState?.();
				const mappedRows = new Set<number>();
				try {
					const mapRef: Map<number, any> | undefined = gridRowToEventMapRef?.current;
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

				const isRequiredCellMissing = (cell: any, colDef: any): boolean => {
					if (!colDef?.isRequired) return false;
					if (!cell) return true;
					if ((cell as any).isMissingValue === true) return true;
					const k = (cell as any).kind;
					const data = (cell as any).data || {};
					if (k === "Custom") {
						const kind = data?.kind;
						if (kind === "dropdown-cell") return !data.value;
						if (kind === "tempus-date-cell") return !data.date;
						if (kind === "timekeeper-cell") return !data.time;
						if (kind === "phone-input-cell") return !data.phone;
					}
					if (k === "Text") {
						return !((cell as any).data && String((cell as any).data).trim());
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
	}, [checkEditingState, hasUnsavedChanges]);

	useEffect(() => {
		if (open) {
			setIsGridReady(false);
			setCanSave(false);

			if (dataProviderRef.current) {
				const editingState = dataProviderRef.current.getEditingState();
				editingState.clearMemory();
				dataProviderRef.current.refresh();
			}
		} else {
			setIsGridReady(false);
			setCanSave(false);

			if ((dataProviderRef as any).unsubscribe) {
				(dataProviderRef as any).unsubscribe();
				delete (dataProviderRef as any).unsubscribe;
			}
		}
	}, [open]);

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
				<div
					className="fixed inset-0 dialog-backdrop bg-black/80 backdrop-blur-sm"
					style={{ zIndex: 1700 }}
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							handleCloseAttempt(() => onOpenChange(false));
						}
					}}
				/>
			)}

			{open && (
				<div
					className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-6xl w-full h-auto max-h-[95vh] p-0 flex flex-col overflow-visible dialog-content gap-0 grid border bg-background shadow-lg sm:rounded-lg"
					style={{ zIndex: 1710 }}
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
								className={`text-xl font-semibold leading-none tracking-tight py-2 ${isRTL ? "text-right" : "text-left"}`}
							>
								{isRTL ? "محرر البيانات" : "Data Editor"} - {formatDateRange()}
							</h2>
							<p id="data-editor-description" className="sr-only">
								{isRTL
									? "محرر لإدارة الحجوزات وبيانات العملاء"
									: "Editor for managing reservations and customer data"}
							</p>
						</div>
						<button
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
									<div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
								</div>
							)}
							<div
								style={{
									opacity: isGridReady ? 1 : 0,
									pointerEvents: isGridReady ? "auto" : "none",
								}}
							>
								<FullscreenProvider>
									<Grid
										key={`grid-${themeKey}`}
										showThemeToggle={false}
										fullWidth={true}
										theme={gridTheme}
										isDarkMode={isDarkMode}
										dataSource={dataSource}
										dataEditorRef={dataEditorRef}
										onReady={() => setIsGridReady(true)}
										onDataProviderReady={(provider: any) => {
											dataProviderRef.current = provider;

											const editingState = provider.getEditingState();
											const unsubscribe = editingState.onChange(() => {
												handleCheckEditingState();
											});

											(dataProviderRef as any).unsubscribe = unsubscribe;

											// Configure customer auto-fill service
											console.log("Configuring CustomerAutoFillService...");
											configureCustomerAutoFill(
												(rowIndex: number, customerName: string) => {
													// Handle customer auto-fill update

													const dataSource =
														provider.getDataSource?.() ||
														provider.dataSource ||
														provider.getData?.();

													if (dataSource) {
														// Try different methods to get columns
														const columns =
															dataSource.getColumns?.() || dataSource.columns;
														if (columns) {
															const nameColumnIndex = columns.findIndex(
																(col: any) => col.id === "name",
															);
															// Use provider.columnDefinitions for display order since displayColumns is out of scope here
															const nameDisplayIndex =
																provider.columnDefinitions.findIndex(
																	(col: any) => col.id === "name",
																);

															if (nameColumnIndex >= 0) {
																// Update the underlying data via provider.setCell
																const columnDef = columns[nameColumnIndex];
																const columnType =
																	provider.columnTypeRegistry.get(
																		columnDef.dataType,
																	);
																const newCell = columnType.createCell(
																	customerName,
																	columnDef,
																	provider.theme,
																	provider.isDarkTheme,
																	{
																		row: rowIndex,
																		getRowCellData: () => undefined,
																	},
																);
																provider.setCell(
																	nameColumnIndex,
																	rowIndex,
																	newCell,
																);

																// Trigger re-render helpers
																if (provider.editingState?.triggerOnChange)
																	provider.editingState.triggerOnChange();
																if (provider.refresh) provider.refresh();
																if (provider.cellCache?.invalidateCell)
																	provider.cellCache.invalidateCell(
																		rowIndex,
																		nameColumnIndex,
																	);

																// Update addedRows cache if applicable
																const isNewRow =
																	provider.editingState?.addedRows &&
																	provider.editingState.addedRows.length >
																		rowIndex;
																if (
																	isNewRow &&
																	provider.editingState?.addedRows[rowIndex]
																) {
																	provider.editingState.addedRows[rowIndex][
																		nameColumnIndex
																	] = customerName;
																}

																// Repaint cell
																if (dataEditorRef.current?.updateCells) {
																	dataEditorRef.current.updateCells([
																		{
																			cell: [
																				nameDisplayIndex >= 0
																					? nameDisplayIndex
																					: nameColumnIndex,
																				rowIndex,
																			],
																		},
																	]);
																}
															}
														}
													}
												},
												"phone", // phoneColumnId
												"name", // nameColumnId
											);
											console.log(
												"CustomerAutoFillService configuration complete",
											);

											handleCheckEditingState();
										}}
									/>
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
									{isRTL ? "جاري الحفظ..." : "Saving..."}
								</>
							) : (
								<>
									<Save className="h-4 w-4" />
									{isRTL ? "حفظ التغييرات" : "Save Changes"}
								</>
							)}
						</Button>
					</div>
				</div>
			)}

			<UnsavedChangesDialog
				open={showUnsavedChangesDialog}
				onOpenChange={setShowUnsavedChangesDialog}
				isRTL={isRTL}
				onDiscard={handleDiscardChanges}
				onSaveAndClose={handleSaveAndClose}
				isSaving={isSaving}
				canSave={canSave}
			/>
		</>
	);
}
