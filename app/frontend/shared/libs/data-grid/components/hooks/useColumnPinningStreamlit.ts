import type { GridColumn } from "@glideapps/glide-data-grid";
import { useCallback, useMemo } from "react";
import type { ColumnConfig } from "../types/column-config-streamlit.types";

const PINNED_COLUMNS_WIDTH_THRESHOLD = 0.6;

type UseColumnPinningStreamlitOptions = {
  columns: GridColumn[];
  containerWidth: number;
  minColumnWidth: number;
  clearSelection: (keepRows?: boolean, keepColumns?: boolean) => void;
  columnConfigMapping: Map<string, ColumnConfig>;
  setColumnConfigMapping: (mapping: Map<string, ColumnConfig>) => void;
};

// Hook for managing column pinning (similar to Streamlit's useColumnPinning)
export function useColumnPinningStreamlit(
  options: UseColumnPinningStreamlitOptions
) {
  const {
    columns,
    containerWidth,
    minColumnWidth,
    clearSelection,
    columnConfigMapping,
    setColumnConfigMapping,
  } = options;
  // Calculate if pinned columns width is too large (similar to Streamlit's logic)
  const isPinnedColumnsWidthTooLarge = useMemo(() => {
    const pinnedColumnsWidth = columns
      .filter((col, idx) => {
        const id = (col as { id?: string }).id ?? `col_${idx}`;
        return (
          columnConfigMapping.get(id)?.pinned === true ||
          columnConfigMapping.get(`col_${idx}`)?.pinned === true
        );
      })
      .reduce(
        (acc, col) =>
          acc + ((col as { width?: number }).width || minColumnWidth * 2),
        0
      );

    return pinnedColumnsWidth > containerWidth * PINNED_COLUMNS_WIDTH_THRESHOLD;
  }, [columns, containerWidth, minColumnWidth, columnConfigMapping]);

  // Calculate freeze columns count
  const freezeColumns = useMemo(() => {
    if (isPinnedColumnsWidthTooLarge) {
      return 0;
    }

    return columns.filter((col, idx) => {
      const id = (col as { id?: string }).id ?? `col_${idx}`;
      return (
        columnConfigMapping.get(id)?.pinned === true ||
        columnConfigMapping.get(`col_${idx}`)?.pinned === true
      );
    }).length;
  }, [columns, columnConfigMapping, isPinnedColumnsWidthTooLarge]);

  const pinColumn = useCallback(
    (columnIndex: number) => {
      const col = columns[columnIndex];
      const id = (col as { id?: string }).id ?? `col_${columnIndex}`;
      const newMapping = new Map(columnConfigMapping);
      newMapping.set(id, {
        ...(newMapping.get(id) as object | undefined),
        pinned: true,
      });
      if (newMapping.has(`col_${columnIndex}`) && `col_${columnIndex}` !== id) {
        newMapping.delete(`col_${columnIndex}`);
      }
      setColumnConfigMapping(newMapping);
      clearSelection(true, false);
    },
    [columns, columnConfigMapping, setColumnConfigMapping, clearSelection]
  );

  const unpinColumn = useCallback(
    (columnIndex: number) => {
      const col = columns[columnIndex];
      const id = (col as { id?: string }).id ?? `col_${columnIndex}`;
      const newMapping = new Map(columnConfigMapping);
      newMapping.set(id, {
        ...(newMapping.get(id) as object | undefined),
        pinned: false,
      });
      if (newMapping.has(`col_${columnIndex}`) && `col_${columnIndex}` !== id) {
        newMapping.delete(`col_${columnIndex}`);
      }
      setColumnConfigMapping(newMapping);
      clearSelection(true, false);
    },
    [columns, columnConfigMapping, setColumnConfigMapping, clearSelection]
  );

  return {
    freezeColumns,
    pinColumn,
    unpinColumn,
    isPinnedColumnsWidthTooLarge,
  };
}
