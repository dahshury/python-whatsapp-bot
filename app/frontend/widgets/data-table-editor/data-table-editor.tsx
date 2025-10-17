"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
// formatHijriDate used within utils/format-dates
import { useSettings } from "@shared/libs/state/settings-context";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { CalendarEditorGridContainer } from "@widgets/data-table-editor/components/calendar-editor-grid-container";
import { DataEditorFooter } from "@widgets/data-table-editor/components/data-editor-footer";
import { DataEditorHeader } from "@widgets/data-table-editor/components/data-editor-header";
import type { default as CalendarEditorGridComponent } from "@widgets/data-table-editor/grids/calendar-editor-grid";
// import { Button } from "@ui/button"; // moved into DataEditorFooter
import { useDataTableDataSource } from "@widgets/data-table-editor/hooks/use-data-table-data-source";
import { useDataTableSaveHandler } from "@widgets/data-table-editor/hooks/use-data-table-save-handler";
import { useDataTableValidation } from "@widgets/data-table-editor/hooks/use-data-table-validation";
import { useDebouncedValidationCheck } from "@widgets/data-table-editor/hooks/use-debounced-validation-check";
import { useGlideTheme } from "@widgets/data-table-editor/hooks/use-glide-theme";
import { useProviderUnsubscribe } from "@widgets/data-table-editor/hooks/use-provider-unsubscribe";
import { useSaveChanges } from "@widgets/data-table-editor/hooks/use-save-changes";
import { useSaveEnablement } from "@widgets/data-table-editor/hooks/use-save-enablement";
import { useStableSourceEvents } from "@widgets/data-table-editor/hooks/use-stable-source-events";
import { useUnsavedCloseGuard } from "@widgets/data-table-editor/hooks/use-unsaved-close-guard";
// formatDateTimeOptions removed - using inline options instead
import type {
	CalendarEvent as DataTableCalendarEvent,
	DataTableEditorProps,
} from "@widgets/data-table-editor/types";
import { computeFormattedDateRange } from "@widgets/data-table-editor/utils/format-dates";
import { getReservationKey } from "@widgets/data-table-editor/utils/reservations";
// import { ValidationErrorsPopover } from "./data-table-editor/data-table-editor/ValidationErrorsPopover"; // handled by DataEditorFooter
import { areValidationErrorsEqual } from "@widgets/data-table-editor/utils/validation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
// import { Save } from "lucide-react"; // used in DataEditorFooter
import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// FullscreenProvider moved into CalendarEditorGridContainer
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/data-provider";
import { useDialogBackdrop } from "@/shared/libs/ui/hooks/use-dialog-backdrop";
// createGlideTheme moved into useGlideTheme hook
// import { i18n } from "@/shared/libs/i18n"; // used within subcomponents
// import { Spinner } from "@/shared/ui/spinner"; // moved into DataEditorFooter
import { UnsavedChangesDialog } from "./data-table-editor/data-table-editor/unsaved-changes-dialog";

// duplicate imports removed

// Dynamic import of calendar editor grid
const CalendarGrid = dynamic(() => import("./grids/calendar-editor-grid"), {
	ssr: false,
	loading: () => null,
}) as unknown as React.ComponentType<
	Parameters<typeof CalendarEditorGridComponent>[0]
>;

// areValidationErrorsEqual is imported from utils

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
	const [isExiting, setIsExiting] = useState(false);
	const { theme: appTheme } = useTheme();
	const { theme: _styleTheme } = useSettings();
	const isDarkMode = appTheme === "dark";

	const _isLocalized = isLocalized ?? false;

	const dataProviderRef = useRef<DataProvider | null>(null);
	const dataEditorRef = useRef<DataEditorRef | null>(null);
	// Removed themeKey to prevent forced Grid remounts that cause flicker

	// Stable ref accessor for unsaved-change checker used by hooks
	const hasUnsavedChangesRef = useRef<() => boolean>(() => false);

	// Proxy ref to allow passing grid row->event map to hooks before it's available
	const gridRowToEventMapProxyRef = useRef<Map<
		number,
		DataTableCalendarEvent
	> | null>(null);

	// Stable source events with merge behavior while editing
	const { sourceEvents } = useStableSourceEvents({
		events,
		open,
		dataProviderRef,
		gridRowToEventMapRef: gridRowToEventMapProxyRef,
		hasUnsavedChanges: () => hasUnsavedChangesRef.current(),
		getReservationKey,
	});

	// getReservationKey imported from utils; keep ref indirection

	// previous events tracking handled inside useStableSourceEvents

	// Theme: computed via reusable hook
	const gridTheme = useGlideTheme(isDarkMode);

	const { dataSource, gridRowToEventMapRef } = useDataTableDataSource({
		events: sourceEvents,
		selectedDateRange,
		slotDurationHours,
		freeRoam,
		open,
		isLocalized: isLocalized ?? false,
	});

	// Sync real grid map into proxy for the stable-source hook
	useEffect(() => {
		try {
			gridRowToEventMapProxyRef.current =
				(gridRowToEventMapRef?.current as unknown as Map<
					number,
					DataTableCalendarEvent
				>) ?? null;
		} catch {
			gridRowToEventMapProxyRef.current = null;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gridRowToEventMapRef?.current]);

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
			}>
		) => {
			if (
				!areValidationErrorsEqual(previousValidationErrors.current, newErrors)
			) {
				previousValidationErrors.current = newErrors;
				setValidationErrors(newErrors);
			}
		},
		[]
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
	}, []);

	useEffect(() => {
		hasUnsavedChangesRef.current = hasUnsavedChanges;
	}, [hasUnsavedChanges]);

	// Memoize the formatted date range
	const formattedDateRange = useMemo(
		() =>
			computeFormattedDateRange(
				selectedDateRange,
				_isLocalized,
				slotDurationHours || 1
			),
		[selectedDateRange, _isLocalized, slotDurationHours]
	);

	const evaluateSaveEnablement = useSaveEnablement({
		dataProviderRef,
		gridRowToEventMapRef,
		validateAllCells,
		checkEditingState,
		setValidationErrors: setValidationErrorsIfChanged,
	});
	const handleCheckEditingState = useCallback(() => {
		const ok = evaluateSaveEnablement();
		setCanSave(ok);
	}, [evaluateSaveEnablement]);

	// Stable debounced validation check function
	const createDebouncedValidationCheck = useDebouncedValidationCheck({
		validateAllCells,
		dataProviderRef,
		gridRowToEventMapRef,
		setValidationErrors: setValidationErrorsIfChanged,
	});

	useEffect(() => {
		if (open) {
			setCanSave(false);
			if (dataProviderRef.current) {
				try {
					dataProviderRef.current.refresh?.();
				} catch {
					// Grid refresh failed; data will remain as-is
				}
			}
		}
		setCanSave(false);
		// Clear validation errors when dialog transitions to closed to prevent stale state
		if (!open) {
			setValidationErrors([]);
			previousValidationErrors.current = [];
		}
	}, [open]);

	// Keep body backdrop class while open or exiting to avoid flicker
	useDialogBackdrop({ open, isExiting });

	// When open toggles to false, mark as exiting so class stays until exit completes
	useEffect(() => {
		if (!open) {
			setIsExiting(true);
		}
	}, [open]);

	// handled by useDialogBackdrop

	useProviderUnsubscribe(
		dataProviderRef as React.RefObject<{ unsubscribe?: () => void } | null>
	);

	// Merged source events handled by useStableSourceEvents

	const handleSaveChanges = useSaveChanges({
		validateAllCells,
		performSave,
		setCanSave,
	});

	const {
		showUnsavedChangesDialog,
		setShowUnsavedChangesDialog,
		handleCloseAttempt,
		handleDiscardChanges,
		handleSaveAndClose,
	} = useUnsavedCloseGuard({
		hasUnsavedChanges,
		performSave: handleSaveChanges,
	});

	return (
		<>
			<AnimatePresence
				mode="wait"
				onExitComplete={() => {
					setIsExiting(false);
					document.body.classList.remove("has-dialog-backdrop");
				}}
			>
				{open && (
					<>
						<motion.button
							animate={{ opacity: 1 }}
							className="dialog-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm"
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							key="dt-backdrop"
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
							style={{ zIndex: Z_INDEX.DIALOG_BACKDROP }}
							transition={{ duration: 0.25, ease: "easeInOut" }}
							type="button"
						/>

						<motion.dialog
							animate={{ opacity: 1, scale: 1, y: "-50%" }}
							aria-describedby="data-editor-description"
							className="dialog-content fixed top-[50%] left-[50%] flex h-auto max-h-[95vh] w-full max-w-6xl flex-col gap-0 overflow-visible border bg-background p-0 shadow-lg sm:rounded-lg"
							exit={{ opacity: 0, scale: 0.98, y: "calc(-50% - 8px)" }}
							initial={{ opacity: 0, scale: 0.98, y: "calc(-50% + 8px)" }}
							key={`dt-dialog-${selectedDateRange?.start || "none"}`}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									const fullscreenPortal = document.getElementById(
										"grid-fullscreen-portal"
									);
									if (fullscreenPortal) {
										e.preventDefault();
										return;
									}
									handleCloseAttempt(() => onOpenChange(false));
								}
							}}
							open
							style={{
								zIndex: Z_INDEX.DIALOG_CONTENT,
								animation: "none",
								x: "-50%",
							}}
							transition={{ duration: 0.25, ease: "easeInOut" }}
						>
							<button
								aria-label="Close"
								className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
								onClick={() => handleCloseAttempt(() => onOpenChange(false))}
								type="button"
							>
								<X />
							</button>
							<div className="flex flex-row items-center justify-between border-b px-4 py-1.5">
								<DataEditorHeader
									formattedDateRange={formattedDateRange}
									isLocalized={_isLocalized}
								/>
							</div>

							<div className="min-h-0 w-full flex-1 overflow-visible">
								<div className="relative h-full w-full overflow-visible">
									{!isGridReady && (
										<div className="absolute inset-0 z-10 bg-background/0" />
									)}
									<div>
										<CalendarEditorGridContainer
											createDebouncedValidationCheck={
												createDebouncedValidationCheck
											}
											dataEditorRef={
												dataEditorRef as React.RefObject<DataEditorRef>
											}
											dataProviderRef={dataProviderRef}
											dataSource={dataSource}
											Grid={CalendarGrid}
											handleCheckEditingState={handleCheckEditingState}
											isDarkMode={isDarkMode}
											loading={!isGridReady}
											onReady={() => setIsGridReady(true)}
											setValidationErrorsIfChanged={
												setValidationErrorsIfChanged
											}
											theme={gridTheme}
											validateAllCells={validateAllCells}
											validationErrors={validationErrors}
										/>
									</div>
								</div>
							</div>

							<DataEditorFooter
								canSave={canSave}
								errors={validationErrors}
								isLocalized={_isLocalized}
								isSaving={isSaving}
								onSave={handleSaveChanges}
							/>
						</motion.dialog>
					</>
				)}
			</AnimatePresence>

			<UnsavedChangesDialog
				canSave={canSave}
				isLocalized={_isLocalized}
				isSaving={isSaving}
				onDiscard={handleDiscardChanges}
				onOpenChange={setShowUnsavedChangesDialog}
				onSaveAndClose={handleSaveAndClose}
				open={showUnsavedChangesDialog}
			/>
		</>
	);
}
