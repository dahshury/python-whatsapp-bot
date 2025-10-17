import { useCallback } from "react";

type Provider = {
	getRowCount?: () => number;
	getColumnCount?: () => number;
	getEditingState?: () => {
		getNumRows?: () => number;
		getCell?: (c: number, r: number) => unknown;
		onChange?: (fn: () => void) => () => void;
	};
	getColumnDefinition?: (
		c: number
	) => { isRequired?: boolean } | Record<string, unknown> | undefined;
	getCell?: (c: number, r: number) => unknown;
};

type EditingState = ReturnType<NonNullable<Provider["getEditingState"]>>;

type CellData = {
	kind?: string;
	date?: unknown;
	time?: unknown;
	value?: unknown;
};

type GridCell = {
	isMissingValue?: boolean;
	kind?: string;
	data?: CellData;
};

type Args = {
	dataProviderRef: React.RefObject<Provider | null>;
	gridRowToEventMapRef:
		| React.RefObject<Map<number, unknown> | null>
		| undefined;
	validateAllCells: () => {
		errors?: Array<{
			row: number;
			col: number;
			message: string;
			fieldName?: string;
		}>;
	};
	checkEditingState: () => { hasChanges: boolean; isValid: boolean };
	setValidationErrors: (
		errors: Array<{
			row: number;
			col: number;
			message: string;
			fieldName?: string;
		}>
	) => void;
};

function checkCustomCellData(
	data: CellData | undefined,
	kind: string | undefined
): boolean {
	if (kind === "dropdown-cell") {
		return !data?.value;
	}
	if (kind === "tempus-date-cell") {
		return !data?.date;
	}
	if (kind === "timekeeper-cell") {
		return !data?.time;
	}
	return false;
}

function isRequiredCellMissing(
	cell: unknown,
	colDef: { isRequired?: boolean }
): boolean {
	if (!colDef?.isRequired) {
		return false;
	}
	if (!cell) {
		return true;
	}

	const gridCell = cell as GridCell;
	if (gridCell.isMissingValue === true) {
		return true;
	}

	const k = gridCell.kind;
	const data = gridCell.data || {};

	if (k === "Custom") {
		const cellKind = data?.kind;
		return checkCustomCellData(data, cellKind);
	}

	if (k === "Text") {
		return !(gridCell.data && String(gridCell.data).trim());
	}

	return false;
}

function validateRow(args: {
	provider: Provider;
	rowIdx: number;
	colCount: number;
	editingState: EditingState;
}): boolean {
	const { provider, rowIdx, colCount, editingState } = args;

	let hasEdits = false;
	for (let c = 0; c < colCount; c++) {
		if (editingState?.getCell?.(c, rowIdx) !== undefined) {
			hasEdits = true;
			break;
		}
	}

	if (!hasEdits) {
		return true;
	}

	for (let c = 0; c < colCount; c++) {
		const colDef = (provider.getColumnDefinition?.(c) || {}) as {
			isRequired?: boolean;
		};
		if (!colDef?.isRequired) {
			continue;
		}

		const cell = provider.getCell?.(c, rowIdx);
		if (isRequiredCellMissing(cell, colDef)) {
			return false;
		}
	}

	return true;
}

function validateRequiredFields(args: {
	provider: Provider;
	rowCount: number;
	colCount: number;
	editingState: EditingState;
	mappedRows: Set<number>;
}): boolean {
	const { provider, rowCount, colCount, editingState, mappedRows } = args;

	for (let r = 0; r < rowCount; r++) {
		if (mappedRows.has(r)) {
			continue;
		}

		if (!validateRow({ provider, rowIdx: r, colCount, editingState })) {
			return false;
		}
	}

	return true;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex state initialization with multiple checks
function checkInitialState(args: {
	state: { hasChanges: boolean; isValid: boolean };
	dataProviderRef: React.RefObject<Provider | null>;
	gridRowToEventMapRef: Args["gridRowToEventMapRef"];
}): boolean {
	const { state, dataProviderRef, gridRowToEventMapRef } = args;
	let canEnable = state.hasChanges && state.isValid;

	try {
		if (canEnable && dataProviderRef.current) {
			const provider = dataProviderRef.current;
			const rowCount = provider.getRowCount?.() ?? 0;
			const colCount = provider.getColumnCount?.() ?? 0;
			const editingState = provider.getEditingState?.();

			if (!editingState) {
				return canEnable;
			}

			const mappedRows = new Set<number>();
			try {
				const mapRef = gridRowToEventMapRef?.current as
					| Map<number, unknown>
					| undefined;
				if (mapRef && mapRef.size > 0) {
					for (const key of mapRef.keys()) {
						mappedRows.add(key);
					}
				}
			} catch {
				// Grid row mapping retrieval failed; will continue validation
			}

			canEnable = validateRequiredFields({
				provider,
				rowCount,
				colCount,
				editingState,
				mappedRows,
			});
		}
	} catch {
		// Validation failed; fall back to state
	}

	return canEnable;
}

export function useSaveEnablement({
	dataProviderRef,
	gridRowToEventMapRef,
	validateAllCells,
	checkEditingState,
	setValidationErrors,
}: Args) {
	return useCallback(() => {
		const state = checkEditingState();
		const canEnable = checkInitialState({
			state,
			dataProviderRef,
			gridRowToEventMapRef,
		});

		try {
			const result = validateAllCells();
			setValidationErrors(result.errors || []);
		} catch {
			// Validation failed; errors will remain unchanged
		}

		return canEnable;
	}, [
		checkEditingState,
		dataProviderRef,
		gridRowToEventMapRef,
		validateAllCells,
		setValidationErrors,
	]);
}
