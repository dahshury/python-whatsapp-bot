import { GridCellKind } from "@glideapps/glide-data-grid";

type OnRowAppendedArgs = {
  getRowCount: () => number;
  getColumnCount: () => number;
  getRawCellContent: (col: number, row: number) => unknown;
  addRow: () => Promise<void>;
  deleteRow: (row: number) => Promise<void>;
  setNumRows: (n: number) => void;
};

export function createOnRowAppendedFallback({
  getRowCount,
  getColumnCount,
  getRawCellContent,
  addRow,
  deleteRow,
  setNumRows,
}: OnRowAppendedArgs) {
  return async () => {
    try {
      const baseRowCount = getRowCount();
      if (baseRowCount === 1) {
        const colCount = getColumnCount();
        let isEmpty = true;
        for (let c = 0; c < colCount; c += 1) {
          const cell = getRawCellContent(c, 0) as unknown as {
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
          const kind = cell?.kind;
          const data = cell?.data as unknown as {
            kind?: string;
            value?: unknown;
            date?: Date;
            displayDate?: string;
            time?: Date;
          };
          const displayData = (cell as { displayData?: unknown })?.displayData;

          const hasContent =
            (kind === GridCellKind.Custom &&
              data &&
              ((data.kind === "phone-cell" &&
                typeof data.value === "string" &&
                String(data.value).trim().length > 0) ||
                (data.kind === "dropdown-cell" && Boolean(data.value)) ||
                (data.kind === "tempus-date-cell" &&
                  Boolean(data.date || data.displayDate)) ||
                (data.kind === "timekeeper-cell" && Boolean(data.time)))) ||
            (kind === GridCellKind.Number &&
              (cell as { data?: unknown }).data !== null &&
              (cell as { data?: unknown }).data !== undefined) ||
            (kind === GridCellKind.Text &&
              typeof (cell as { data?: unknown }).data === "string" &&
              String((cell as { data?: unknown }).data).trim().length > 0) ||
            (Boolean(displayData) &&
              String(displayData as string).trim().length > 0);

          if (hasContent) {
            isEmpty = false;
            break;
          }
        }
        if (isEmpty) {
          await deleteRow(0);
        }
      }
      await addRow();
      setNumRows(getRowCount());
    } catch {
      // ignore
    }
    return true;
  };
}
