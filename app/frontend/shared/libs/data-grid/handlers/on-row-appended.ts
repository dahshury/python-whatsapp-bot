import { GridCellKind } from "@glideapps/glide-data-grid";

type CellContent = {
	kind?: unknown;
	data?: {
		kind?: string;
		value?: unknown;
		date?: Date;
		displayDate?: string;
		time?: Date;
	};
	displayData?: unknown;
};

function hasCellContent(cell: CellContent): boolean {
	const kind = cell?.kind as unknown;
	const data = cell?.data;
	const displayData = cell?.displayData;

	const isCustomCell =
		kind === GridCellKind.Custom &&
		data &&
		((data.kind === "phone-cell" &&
			typeof data.value === "string" &&
			String(data.value).trim().length > 0) ||
			(data.kind === "dropdown-cell" && Boolean(data.value)) ||
			(data.kind === "tempus-date-cell" &&
				Boolean(data.date || data.displayDate)) ||
			(data.kind === "timekeeper-cell" && Boolean(data.time)));

	const isNumberCell =
		kind === GridCellKind.Number && data !== null && data !== undefined;

	const isTextCell =
		kind === GridCellKind.Text &&
		typeof (cell as { data?: unknown }).data === "string" &&
		String((cell as { data?: unknown }).data).trim().length > 0;

	const hasDisplayData =
		Boolean(displayData) && String(displayData as string).trim().length > 0;

	return isCustomCell || isNumberCell || isTextCell || hasDisplayData;
}

function isFirstRowEmpty(
	dataProvider: { getColumnCount: () => number },
	getRawCellContent: (c: number, r: number) => unknown
): boolean {
	const colCount = dataProvider.getColumnCount();
	for (let c = 0; c < colCount; c++) {
		const cell = getRawCellContent(c, 0) as CellContent;
		if (hasCellContent(cell)) {
			return false;
		}
	}
	return true;
}

async function handleRowAppendAsync({
	dataProvider,
	dataSource,
	gs,
	getRawCellContent,
	saveState,
	externalDataSource,
}: {
	dataProvider: {
		addRow: () => Promise<unknown> | undefined;
		deleteRow: (row: number) => Promise<unknown> | undefined;
		getColumnCount: () => number;
	};
	dataSource: { rowCount: number };
	gs: { setNumRows: (n: number) => void };
	getRawCellContent: (c: number, r: number) => unknown;
	saveState: () => void;
	externalDataSource?: unknown;
}): Promise<void> {
	const baseRowCount = dataSource.rowCount;
	if (baseRowCount === 1 && isFirstRowEmpty(dataProvider, getRawCellContent)) {
		await dataProvider.deleteRow(0);
	}
	await dataProvider.addRow();
	gs.setNumRows(dataSource.rowCount);
	if (!externalDataSource) {
		saveState();
	}
}

export function createOnRowAppended({
	onAppendRow,
	dataProvider,
	dataSource,
	gs,
	getRawCellContent,
	saveState,
	externalDataSource,
}: {
	onAppendRow?: (() => void) | undefined;
	dataProvider: {
		addRow: () => Promise<unknown> | undefined;
		deleteRow: (row: number) => Promise<unknown> | undefined;
		getColumnCount: () => number;
	};
	dataSource: { rowCount: number };
	gs: { setNumRows: (n: number) => void };
	getRawCellContent: (c: number, r: number) => unknown;
	saveState: () => void;
	externalDataSource?: unknown;
}) {
	return () => {
		try {
			if (typeof onAppendRow === "function") {
				onAppendRow();
				return true;
			}
		} catch {
			// Silently ignore errors from user-provided callback
		}

		(async () => {
			try {
				await handleRowAppendAsync({
					dataProvider,
					dataSource,
					gs,
					getRawCellContent,
					saveState,
					externalDataSource,
				});
			} catch {
				// Silently ignore errors during async row append operations
			}
		})();

		return true;
	};
}
