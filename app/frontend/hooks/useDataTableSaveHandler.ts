import React, { useCallback, useRef, useState } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import type { IColumnDefinition } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/components/glide_custom_cells/components/core/services/DataProvider";
import type { BaseColumnProps } from "@/components/glide_custom_cells/components/core/types";
import { getMessage } from "@/lib/api";
import type { DataTableOperationsService as _D } from "@/lib/services/data-table-operations.service";
import { DataTableOperationsService } from "@/lib/services/data-table-operations.service";
import { toastService } from "@/lib/toast-service";
import type {
	CalendarEvent,
	EditingChanges,
	ValidationResult,
} from "@/types/data-table-editor";

interface UseDataTableSaveHandlerProps {
	calendarRef?: React.RefObject<CalendarCoreRef>;
	isRTL: boolean;
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
}: UseDataTableSaveHandlerProps) {
	const [isSaving, setIsSaving] = useState(false);
	const operationsServiceRef = useRef<DataTableOperationsService | null>(null);

	const getCalendarApi = useCallback(() => {
		return calendarRef?.current?.getApi?.();
	}, [calendarRef]);

	const handleSaveChanges = useCallback(async () => {
		console.log("🚀 useDataTableSaveHandler: handleSaveChanges called");

		if (!dataProviderRef.current) {
			console.error("❌ No data provider available");
			toastService.error(
				getMessage("system_error_try_later", isRTL),
				undefined,
				5000,
			);
			return;
		}

		if (isSaving) {
			console.log("⏳ Already saving, skipping...");
			return;
		}

		const validation = validateAllCells();
		if (!validation.isValid) {
			const errorMessages = validation.errors
				.map(
					(err) => `${isRTL ? "الصف" : "Row"} ${err.row + 1}: ${err.message}`,
				)
				.join("\n");

			toastService.error(
				isRTL ? "أخطاء في التحقق" : "Validation Errors",
				errorMessages,
				8000,
			);

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
				}),
			);
			const changesJson = editingState.toJson(baseColumns);
			const changes: EditingChanges = JSON.parse(changesJson);

			console.log("📝 Changes detected:", {
				changesJson,
				changes,
				hasDeletedRows: (changes.deleted_rows?.length ?? 0) > 0,
				hasEditedRows:
					changes.edited_rows && Object.keys(changes.edited_rows).length > 0,
				hasAddedRows: (changes.added_rows?.length ?? 0) > 0,
			});

			let hasErrors = false;
			let successfulOperations: Awaited<
				ReturnType<_D["processAdditions"]>
			>["successfulOperations"] = [];

			const calendarApi = getCalendarApi();

			if (!operationsServiceRef.current) {
				operationsServiceRef.current = new DataTableOperationsService(
					calendarApi,
					isRTL,
					slotDurationHours,
					freeRoam,
					refreshCustomerData,
				);
			}

			const operations = operationsServiceRef.current;

			if (changes.deleted_rows && changes.deleted_rows.length > 0) {
				const result = await operations.processCancellations(
					changes.deleted_rows,
					gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
					onEventCancelled,
					onEventAdded,
				);
				hasErrors = hasErrors || result.hasErrors;
				successfulOperations = [
					...successfulOperations,
					...result.successfulOperations,
				];
			}

			if (changes.edited_rows && Object.keys(changes.edited_rows).length > 0) {
				const result = await operations.processModifications(
					changes.edited_rows,
					gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
					onEventModified,
				);
				hasErrors = hasErrors || result.hasErrors;
				successfulOperations = [
					...successfulOperations,
					...result.successfulOperations,
				];
			}

			if (changes.added_rows && changes.added_rows.length > 0) {
				const result = await operations.processAdditions(
					changes.added_rows,
					onEventAdded,
					onEventCancelled,
				);
				hasErrors = hasErrors || result.hasErrors;
				successfulOperations = [
					...successfulOperations,
					...result.successfulOperations,
				];
			}

			if (!hasErrors && successfulOperations.length > 0) {
				operations.updateCalendarWithOperations(
					successfulOperations,
					onEventAdded,
				);

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
				isRTL ? "خطأ في الحفظ" : "Save Error",
				getMessage("system_error_try_later", isRTL),
				5000,
			);
			return false;
		} finally {
			setIsSaving(false);
		}
	}, [
		dataProviderRef,
		isRTL,
		isSaving,
		validateAllCells,
		getCalendarApi,
		slotDurationHours,
		freeRoam,
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
