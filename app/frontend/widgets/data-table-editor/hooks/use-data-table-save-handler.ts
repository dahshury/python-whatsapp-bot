import type { DataTableOperationsService as _D } from "@processes/data-table-operations.process";
import { DataTableOperationsService } from "@processes/data-table-operations.process";
import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import type { CalendarEvent, EditingChanges, ValidationResult } from "@widgets/data-table-editor/types";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import type { CalendarApi as LibCalendarApi, CalendarEvent as LibCalendarEvent, RowChange } from "@/entities/event";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";

interface UseDataTableSaveHandlerProps {
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	isLocalized: boolean;
	slotDurationHours: number;
	freeRoam: boolean;
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>;
	dataProviderRef: React.RefObject<DataProvider | null>;
	validateAllCells: () => ValidationResult;
	onEventAdded?: (event: CalendarEvent) => void;
	onEventModified?: (eventId: string, event: CalendarEvent) => void;
	onEventCancelled?: (eventId: string) => void;
	refreshCustomerData?: () => Promise<void>;
}

export function useDataTableSaveHandler({
	calendarRef,
	isLocalized,
	slotDurationHours: _slotDurationHours,
	freeRoam: _freeRoam,
	gridRowToEventMapRef,
	dataProviderRef,
	validateAllCells,
	onEventAdded,
	onEventModified,
	onEventCancelled,
	refreshCustomerData,
}: UseDataTableSaveHandlerProps) {
	const [isSaving, setIsSaving] = useState(false);
	const operationsServiceRef = useRef<DataTableOperationsService | null>(null);

	const getCalendarApi = useCallback(() => {
		return calendarRef?.current?.getApi?.();
	}, [calendarRef]);

	const handleSaveChanges = useCallback(async () => {
		if (!dataProviderRef.current) {
			console.error("❌ No data provider available");
			toastService.error(i18n.getMessage("system_error_try_later", isLocalized), undefined, 5000);
			return;
		}

		if (isSaving) {
			console.log("⏳ Already saving, skipping...");
			return;
		}

		const validation = validateAllCells();
		if (!validation.isValid) {
			const errorMessages = validation.errors
				.map((err) => `${isLocalized ? "الصف" : "Row"} ${err.row + 1}: ${err.message}`)
				.join("\n");

			toastService.error(isLocalized ? "أخطاء في التحقق" : "Validation Errors", errorMessages, 8000);

			return;
		}

		setIsSaving(true);

		try {
			const editingState = dataProviderRef.current.getEditingState();
			// Build BaseColumnProps from provider's column definitions so toJson can map values correctly
			const provider = dataProviderRef.current;
			const defs: IColumnDefinition[] =
				(
					provider as unknown as {
						dataSource?: { getColumnDefinitions?: () => IColumnDefinition[] };
					}
				).dataSource?.getColumnDefinitions?.() ?? [];
			const baseColumns: BaseColumnProps[] = defs.map(
				(def: IColumnDefinition, index: number): BaseColumnProps => ({
					id: def?.id ?? def?.name ?? `col_${index}`,
					name: def?.name ?? def?.id ?? `col_${index}`,
					title: def?.title ?? def?.name ?? def?.id ?? `Column ${index}`,
					width: def?.width ?? 100,
					isEditable: def?.isEditable !== false,
					isHidden: false,
					isPinned: false,
					isRequired: def?.isRequired === true,
					isIndex: false,
					indexNumber: index,
					contentAlignment: "left",
					defaultValue: def?.defaultValue,
					columnTypeOptions: {},
				})
			);
			const changesJson = editingState.toJson(baseColumns);
			const changes: EditingChanges = JSON.parse(changesJson);

			let hasErrors = false;
			let successfulOperations: Awaited<ReturnType<_D["processAdditions"]>>["successfulOperations"] = [];

			const calendarApi = getCalendarApi();

			// Adapter callbacks to satisfy service types
			const onAddedAdapter = onEventAdded
				? (ev: LibCalendarEvent) => onEventAdded(ev as unknown as CalendarEvent)
				: undefined;
			const onModifiedAdapter = onEventModified
				? (id: string, ev: LibCalendarEvent) => onEventModified(id, ev as unknown as CalendarEvent)
				: undefined;

			if (!operationsServiceRef.current) {
				if (!calendarApi) {
					console.error("❌ No calendar API available");
					toastService.error(i18n.getMessage("system_error_try_later", isLocalized), undefined, 5000);
					return false;
				}
				operationsServiceRef.current = new DataTableOperationsService(
					calendarApi as unknown as LibCalendarApi,
					isLocalized === true,
					refreshCustomerData
				);
			}

			const operations = operationsServiceRef.current;

			if (changes.deleted_rows && changes.deleted_rows.length > 0) {
				const result = await operations.processCancellations(
					changes.deleted_rows,
					gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
					onEventCancelled,
					undefined // do not pass onEventAdded to avoid type mismatch; not needed for cancellations
				);
				hasErrors = hasErrors || result.hasErrors;
				successfulOperations = [...successfulOperations, ...result.successfulOperations];
			}

			if (changes.edited_rows && Object.keys(changes.edited_rows).length > 0) {
				// Filter out edits for rows that are being deleted in the same save
				const deletedSet = new Set<number>(changes.deleted_rows || []);
				const filteredEditedEntries = Object.entries(changes.edited_rows).filter(
					([rowIdxStr]) => !deletedSet.has(Number(rowIdxStr))
				);
				const filteredEditedRows = Object.fromEntries(filteredEditedEntries);

				if (Object.keys(filteredEditedRows).length > 0) {
					const result = await operations.processModifications(
						(filteredEditedRows as Record<string, RowChange>) ?? {},
						gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
						onModifiedAdapter
					);
					hasErrors = hasErrors || result.hasErrors;
					successfulOperations = [...successfulOperations, ...result.successfulOperations];
				}
			}

			if (changes.added_rows && changes.added_rows.length > 0) {
				const result = await operations.processAdditions(changes.added_rows, onAddedAdapter, onEventCancelled);
				hasErrors = hasErrors || result.hasErrors;
				successfulOperations = [...successfulOperations, ...result.successfulOperations];
			}

			if (!hasErrors && successfulOperations.length > 0) {
				operations.updateCalendarWithOperations(successfulOperations, onAddedAdapter);

				if (dataProviderRef.current) {
					const editingState = dataProviderRef.current.getEditingState();
					editingState.clearMemory();
					dataProviderRef.current.refresh();
				}
			}

			return !hasErrors;
		} catch (error) {
			console.error("Error saving changes:", error);
			toastService.error(
				i18n.getMessage("save_error", isLocalized),
				i18n.getMessage("system_error_try_later", isLocalized),
				5000
			);
			return false;
		} finally {
			setIsSaving(false);
		}
	}, [
		dataProviderRef,
		isLocalized,
		isSaving,
		validateAllCells,
		getCalendarApi,
		gridRowToEventMapRef,
		onEventCancelled,
		onEventAdded,
		onEventModified,
		refreshCustomerData,
	]);

	return {
		isSaving,
		handleSaveChanges,
	};
}
