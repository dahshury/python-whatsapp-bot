import type { EditableGridCell, Item } from "@glideapps/glide-data-grid";

export type EditInterceptorContext = {
  cell: Item;
  newValue: EditableGridCell;
  visibleRows: number[];
  visibleColumns: number[];
  extras: {
    displayColumns: unknown[];
    dataProvider?: unknown;
    dataSource?: unknown;
  };
};

export type EditInterceptor = (
  ctx: EditInterceptorContext
) => boolean | undefined;

type RunEditPipelineArgs = {
  interceptors: EditInterceptor[];
  filteredRows: number[];
  visibleColumnIndices: number[];
  displayColumns: unknown[];
  baseOnCellEdited: (
    visibleRows: number[]
  ) => (cell: Item, newVal: EditableGridCell) => void;
  saveState: () => void;
  externalDataSource?: unknown;
  onFieldEvent?: (columnId?: string) => void;
  dataProvider?: unknown;
  dataSource?: unknown;
};

export function runEditPipeline({
  interceptors,
  filteredRows,
  visibleColumnIndices,
  displayColumns,
  baseOnCellEdited,
  saveState,
  externalDataSource,
  onFieldEvent,
  dataProvider,
  dataSource,
}: RunEditPipelineArgs) {
  return (cell: Item, newVal: unknown) => {
    const cast = newVal as EditableGridCell;
    const [displayCol] = cell;
    const column = (displayColumns as { id?: string }[])[displayCol];

    try {
      let handled = false;
      if (interceptors.length > 0) {
        const ctx: EditInterceptorContext = {
          cell,
          newValue: cast,
          visibleRows: filteredRows,
          visibleColumns: visibleColumnIndices,
          extras: {
            displayColumns,
            ...(dataProvider !== undefined ? { dataProvider } : {}),
            ...(dataSource !== undefined ? { dataSource } : {}),
          },
        };
        for (const fn of interceptors) {
          try {
            if (fn(ctx) === true) {
              handled = true;
              break;
            }
          } catch {
            /* ignore interceptor error */
          }
        }
      }
      if (handled) {
        baseOnCellEdited(filteredRows)(cell, cast);
        if (!externalDataSource) {
          saveState();
        }
        return;
      }
    } catch {
      /* ignore onCellEdited error */
    }

    // default path
    baseOnCellEdited(filteredRows)(cell, cast);

    if (typeof onFieldEvent === "function") {
      onFieldEvent((column as { id?: string } | undefined)?.id);
    }

    if (!externalDataSource) {
      saveState();
    }
  };
}
