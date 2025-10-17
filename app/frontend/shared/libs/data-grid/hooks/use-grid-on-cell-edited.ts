import type {
	EditableGridCell,
	GridColumn,
	Item,
} from "@glideapps/glide-data-grid";
import { DOC_EVENTS } from "@widgets/documents/constants/events";
import { useCallback } from "react";

type BaseOnCellEdited = (
	rowsMapping: number[]
) => (cell: [number, number], newVal: EditableGridCell) => void;

type Customer = { id?: string; phone?: string; name?: string | null };

type DocAutoApi = {
	handlePhoneEdited: (args: {
		displayRow: number;
		phoneValue: string;
		customers: Customer[];
	}) => Promise<void> | void;
};

function isPhoneCell(cast: unknown): cast is {
	data?: { kind?: string; value?: string };
} {
	return (cast as { data?: { kind?: string } }).data?.kind === "phone-cell";
}

type PhoneEditContext = {
	column: { id?: string } | undefined;
	displayRow: number;
	docAuto: DocAutoApi | undefined;
	customers: Customer[] | undefined;
};

function handlePhoneEdit(
	cast: EditableGridCell,
	context: PhoneEditContext
): void {
	if (context.column?.id === "phone" && isPhoneCell(cast) && context.docAuto) {
		const phoneNumber = cast.data?.value;
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			"[Grid] handlePhoneEdit: invoking docAuto.handlePhoneEdited",
			{
				columnId: context.column?.id,
				displayRow: context.displayRow,
				phoneValue: phoneNumber,
			}
		);
		if (typeof phoneNumber === "string") {
			context.docAuto.handlePhoneEdited({
				displayRow: context.displayRow,
				phoneValue: phoneNumber,
				customers: context.customers ?? [],
			});
		}
	}
}

function dispatchPersistenceEvent(
	_columnId: string | undefined,
	fieldName: string
): void {
	window.dispatchEvent(
		new CustomEvent(DOC_EVENTS.Persist, { detail: { field: fieldName } })
	);
}

function isUpdateSuppressed(suppressUntil: number | undefined): boolean {
	return typeof suppressUntil === "number" && Date.now() < suppressUntil;
}

function handleDocumentGridPersistence(
	column: { id?: string } | undefined,
	documentsGrid: boolean | undefined
): void {
	if (!documentsGrid) {
		return;
	}

	const suppressUntil = (
		globalThis as unknown as { __docSuppressPersistUntil?: number }
	).__docSuppressPersistUntil;

	if (isUpdateSuppressed(suppressUntil)) {
		return;
	}

	if (column?.id === "age") {
		dispatchPersistenceEvent(column.id, "age");
	} else if (column?.id === "name") {
		dispatchPersistenceEvent(column.id, "name");
	} else if (column?.id === "phone") {
		dispatchPersistenceEvent(column.id, "phone");
	}
}

export function useGridOnCellEdited({
	filteredRows,
	displayColumns,
	baseOnCellEdited,
	saveState,
	externalDataSource,
	documentsGrid,
	docAuto,
	customers,
}: {
	filteredRows: number[];
	displayColumns: GridColumn[];
	baseOnCellEdited: BaseOnCellEdited;
	saveState: () => void;
	externalDataSource?: unknown;
	documentsGrid?: boolean;
	docAuto?: DocAutoApi;
	customers?: Customer[];
}) {
	return useCallback(
		(cell: Item, newVal: unknown) => {
			const cast = newVal as EditableGridCell;
			const [displayCol, displayRow] = cell;
			const column = displayColumns[displayCol] as unknown as { id?: string };

			// Handle phone field auto-fill
			handlePhoneEdit(cast, { column, displayRow, docAuto, customers });

			// Apply base edit logic
			baseOnCellEdited(filteredRows)(cell as [number, number], cast);

			// Dispatch persistence events for documents page
			try {
				handleDocumentGridPersistence(column, documentsGrid);
			} catch {
				// Silently handle document event dispatching errors
			}

			// Persist state
			if (!externalDataSource) {
				saveState();
			}
		},
		[
			filteredRows,
			displayColumns,
			baseOnCellEdited,
			saveState,
			externalDataSource,
			documentsGrid,
			docAuto,
			customers,
		]
	);
}
