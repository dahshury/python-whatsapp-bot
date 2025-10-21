import type { DataTableOperationsService as _D } from "@processes/data-table-operations.process";
import { DataTableOperationsService } from "@processes/data-table-operations.process";
import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast/toast-service";
import { safeParseJson } from "@shared/validation/json";
import type {
	CalendarEvent,
	EditingChanges,
	ValidationResult,
} from "@widgets/data-table-editor/types";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import type {
	CalendarApi as LibCalendarApi,
	CalendarEvent as LibCalendarEvent,
	RowChange,
} from "@/entities/event";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/data-provider";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
import type { CalendarCoreRef } from "@/widgets/calendar/types";

const ERROR_TOAST_DURATION_MS = 5000;
const VALIDATION_ERROR_TOAST_DURATION_MS = 8000;
const DEFAULT_COLUMN_WIDTH_SAVE = 100;

function handleValidationError(
	isLocalized: boolean,
	errors: Array<{ row: number; message: string }>
): boolean {
	const errorMessages = errors
		.map(
			(err) => `${isLocalized ? "الصف" : "Row"} ${err.row + 1}: ${err.message}`
		)
		.join("\n");

	toastService.error(
		isLocalized ? "أخطاء في التحقق" : "Validation Errors",
		errorMessages,
		VALIDATION_ERROR_TOAST_DURATION_MS
	);

	return false;
}

function buildBaseColumnsFromProvider(
	provider: DataProvider
): BaseColumnProps[] {
	const defs: IColumnDefinition[] =
		(
			provider as unknown as {
				dataSource?: { getColumnDefinitions?: () => IColumnDefinition[] };
			}
		).dataSource?.getColumnDefinitions?.() ?? [];
	return defs.map(
		(def: IColumnDefinition, index: number): BaseColumnProps => ({
			id: def?.id ?? def?.name ?? `col_${index}`,
			name: def?.name ?? def?.id ?? `col_${index}`,
			title: def?.title ?? def?.name ?? def?.id ?? `Column ${index}`,
			width: def?.width ?? DEFAULT_COLUMN_WIDTH_SAVE,
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
}

function processDeletions(
	operations: DataTableOperationsService,
	changes: EditingChanges,
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>,
	onEventCancelled?: (eventId: string) => void
): ReturnType<typeof operations.processCancellations> {
	if (!changes.deleted_rows || changes.deleted_rows.length === 0) {
		return Promise.resolve({ hasErrors: false, successfulOperations: [] });
	}

	return operations.processCancellations(
		changes.deleted_rows,
		gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
		onEventCancelled,
		undefined
	);
}

function processModifications(
	operations: DataTableOperationsService,
	changes: EditingChanges,
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>,
	onModifiedAdapter?: (id: string, ev: LibCalendarEvent) => void
): ReturnType<typeof operations.processModifications> {
	if (!changes.edited_rows || Object.keys(changes.edited_rows).length === 0) {
		return Promise.resolve({ hasErrors: false, successfulOperations: [] });
	}

	const deletedSet = new Set<number>(changes.deleted_rows || []);
	const filteredEditedEntries = Object.entries(changes.edited_rows).filter(
		([rowIdxStr]) => !deletedSet.has(Number(rowIdxStr))
	);
	const filteredEditedRows = Object.fromEntries(filteredEditedEntries);

	if (Object.keys(filteredEditedRows).length === 0) {
		return Promise.resolve({ hasErrors: false, successfulOperations: [] });
	}

	return operations.processModifications(
		(filteredEditedRows as Record<string, RowChange>) ?? {},
		gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
		onModifiedAdapter
	);
}

function processAdditions(
	operations: DataTableOperationsService,
	changes: EditingChanges,
	onAddedAdapter?: (ev: LibCalendarEvent) => void,
	onEventCancelled?: (eventId: string) => void
): ReturnType<typeof operations.processAdditions> {
	if (!changes.added_rows || changes.added_rows.length === 0) {
		return Promise.resolve({ hasErrors: false, successfulOperations: [] });
	}

	return operations.processAdditions(
		changes.added_rows,
		onAddedAdapter,
		onEventCancelled
	);
}

function prepareOperationData(args: {
	dataProviderRef: React.RefObject<DataProvider | null>;
	onEventAdded?: (event: CalendarEvent) => void;
	onEventModified?: (eventId: string, event: CalendarEvent) => void;
}): {
	editingState: ReturnType<DataProvider["getEditingState"]>;
	baseColumns: BaseColumnProps[];
	changes: EditingChanges;
	onAddedAdapter?: (ev: LibCalendarEvent) => void;
	onModifiedAdapter?: (id: string, ev: LibCalendarEvent) => void;
} {
	const { dataProviderRef, onEventAdded, onEventModified } = args;
	const provider = dataProviderRef.current;
	if (!provider) {
		throw new Error("Data provider is not available");
	}

	const editingState = provider.getEditingState();
	const baseColumns = buildBaseColumnsFromProvider(provider);
	const changesJson = editingState.toJson(baseColumns);
	const zEditingChanges = z
		.object({
			edited_rows: z.record(z.unknown()).optional(),
			added_rows: z.array(z.unknown()).optional(),
			deleted_rows: z.array(z.number()).optional(),
		})
		.passthrough();
	const parsed = safeParseJson(zEditingChanges, changesJson);
	const changes: EditingChanges = (parsed.success
		? parsed.data
		: {
				edited_rows: {},
				added_rows: [],
				deleted_rows: [],
			}) as unknown as EditingChanges;
	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.("[SaveHandler] prepareOperationData", {
		edited_rows: changes?.edited_rows,
		added_rows: changes?.added_rows,
		deleted_rows: changes?.deleted_rows,
		baseColumns: baseColumns.map((c) => ({
			id: c.id,
			indexNumber: c.indexNumber,
		})),
	});

	const onAddedAdapter = onEventAdded
		? (ev: LibCalendarEvent) => onEventAdded(ev as unknown as CalendarEvent)
		: undefined;
	const onModifiedAdapter = onEventModified
		? (id: string, ev: LibCalendarEvent) =>
				onEventModified(id, ev as unknown as CalendarEvent)
		: undefined;

	const baseReturn = {
		editingState,
		baseColumns,
		changes,
	} as const;

	if (onAddedAdapter || onModifiedAdapter) {
		return {
			...baseReturn,
			...(onAddedAdapter && { onAddedAdapter }),
			...(onModifiedAdapter && { onModifiedAdapter }),
		};
	}
	return baseReturn;
}

function executeAllOperations(args: {
	operations: DataTableOperationsService;
	changes: EditingChanges;
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>;
	onEventCancelled?: (eventId: string) => void;
	onAddedAdapter?: (ev: LibCalendarEvent) => void;
	onModifiedAdapter?: (id: string, ev: LibCalendarEvent) => void;
}): Promise<{
	hasErrors: boolean;
	successfulOperations: Awaited<
		ReturnType<_D["processAdditions"]>
	>["successfulOperations"];
}> {
	return (async () => {
		const {
			operations,
			changes,
			gridRowToEventMapRef,
			onEventCancelled,
			onAddedAdapter,
			onModifiedAdapter,
		} = args;
		let hasErrors = false;
		let successfulOperations: Awaited<
			ReturnType<_D["processAdditions"]>
		>["successfulOperations"] = [];

		const deletionResult = await processDeletions(
			operations,
			changes,
			gridRowToEventMapRef,
			onEventCancelled
		);
		hasErrors = hasErrors || deletionResult.hasErrors;
		successfulOperations = [
			...successfulOperations,
			...deletionResult.successfulOperations,
		];

		const modificationResult = await processModifications(
			operations,
			changes,
			gridRowToEventMapRef,
			onModifiedAdapter
		);
		hasErrors = hasErrors || modificationResult.hasErrors;
		successfulOperations = [
			...successfulOperations,
			...modificationResult.successfulOperations,
		];

		const additionResult = await processAdditions(
			operations,
			changes,
			onAddedAdapter,
			onEventCancelled
		);
		hasErrors = hasErrors || additionResult.hasErrors;
		successfulOperations = [
			...successfulOperations,
			...additionResult.successfulOperations,
		];

		return { hasErrors, successfulOperations };
	})();
}

function ensureOperationsService(args: {
	operationsServiceRef: React.RefObject<DataTableOperationsService | null>;
	getCalendarApi: () => LibCalendarApi | undefined;
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>;
	slotDurationHours: number;
	isLocalized: boolean;
	refreshCustomerData?: () => Promise<void>;
	toastService: typeof toastService;
	i18n: typeof i18n;
	isLocalizedParam: boolean;
}): DataTableOperationsService | null {
	if (args.operationsServiceRef.current) {
		return args.operationsServiceRef.current;
	}

	const calendarApi = args.getCalendarApi();
	if (!calendarApi) {
		args.toastService.error(
			args.i18n.getMessage("system_error_try_later", args.isLocalizedParam),
			undefined,
			ERROR_TOAST_DURATION_MS
		);
		return null;
	}

	args.operationsServiceRef.current = new DataTableOperationsService({
		calendarApi: calendarApi as unknown as LibCalendarApi,
		gridRowToEventMap:
			args.gridRowToEventMapRef.current ?? new Map<number, CalendarEvent>(),
		slotDurationHours: args.slotDurationHours ?? 1,
		isLocalized: args.isLocalized === true,
		refreshCustomerData: args.refreshCustomerData,
	});

	return args.operationsServiceRef.current;
}

function finalizeSave(args: {
	dataProviderRef: React.RefObject<DataProvider | null>;
	operationsService: DataTableOperationsService;
	successfulOperations: Awaited<
		ReturnType<_D["processAdditions"]>
	>["successfulOperations"];
	onAddedAdapter?: (ev: LibCalendarEvent) => void;
}): void {
	const {
		dataProviderRef,
		operationsService,
		successfulOperations,
		onAddedAdapter,
	} = args;

	operationsService.updateCalendarWithOperations(
		successfulOperations,
		onAddedAdapter
	);

	const provider = dataProviderRef.current;
	if (provider) {
		const editingState = provider.getEditingState();
		editingState.clearMemory();
	}
}

type UseDataTableSaveHandlerProps = {
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
};

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

	const getCalendarApi = useCallback(
		() =>
			calendarRef?.current?.getApi?.() as unknown as LibCalendarApi | undefined,
		[calendarRef]
	);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex save logic with multiple validation steps and calendar updates
	const handleSaveChanges = useCallback(async () => {
		if (!dataProviderRef.current) {
			toastService.error(
				i18n.getMessage("system_error_try_later", isLocalized),
				undefined,
				ERROR_TOAST_DURATION_MS
			);
			return false;
		}

		if (isSaving) {
			return false;
		}

		const validation = validateAllCells();
		if (!validation.isValid) {
			return handleValidationError(isLocalized, validation.errors);
		}

		setIsSaving(true);

		try {
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.("[SaveHandler] handleSaveChanges: starting");
			const { changes, onAddedAdapter, onModifiedAdapter } =
				prepareOperationData({
					dataProviderRef,
					...(typeof onEventAdded === "function" && { onEventAdded }),
					...(typeof onEventModified === "function" && { onEventModified }),
				});
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.("[SaveHandler] extracted changes", changes);

			const operationsService = ensureOperationsService({
				operationsServiceRef,
				getCalendarApi,
				gridRowToEventMapRef,
				slotDurationHours: _slotDurationHours,
				isLocalized,
				...(typeof refreshCustomerData === "function" && {
					refreshCustomerData,
				}),
				toastService,
				i18n,
				isLocalizedParam: isLocalized,
			});

			if (!operationsService) {
				return false;
			}

			const { hasErrors, successfulOperations } = await executeAllOperations({
				operations: operationsService,
				changes,
				gridRowToEventMapRef,
				...(typeof onEventCancelled === "function" && { onEventCancelled }),
				...(onAddedAdapter !== undefined && { onAddedAdapter }),
				...(onModifiedAdapter !== undefined && { onModifiedAdapter }),
			});
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.("[SaveHandler] operations result", {
				hasErrors,
				successfulOperations,
			});

			if (!hasErrors && successfulOperations.length > 0) {
				finalizeSave({
					dataProviderRef,
					operationsService,
					successfulOperations,
					...(onAddedAdapter !== undefined && { onAddedAdapter }),
				});
			} else if (hasErrors) {
				try {
					dataProviderRef.current?.refresh();
				} catch {
					// Refresh failed; rely on subsequent websocket updates
				}
			}

			return !hasErrors;
		} catch (_error) {
			toastService.error(
				i18n.getMessage("save_error", isLocalized),
				i18n.getMessage("system_error_try_later", isLocalized),
				ERROR_TOAST_DURATION_MS
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
		_slotDurationHours,
	]);

	return {
		isSaving,
		handleSaveChanges,
	};
}
