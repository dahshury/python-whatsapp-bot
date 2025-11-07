import type { GridColumn } from "@glideapps/glide-data-grid";
import type { ColumnConfig } from "../types/column-config-streamlit.types";

// Reorder columns to put pinned columns first (similar to Streamlit's logic)
export function orderColumnsByPinning(
  displayColumns: GridColumn[],
  effectiveColumnConfig: Map<string, ColumnConfig>
): GridColumn[] {
  const pinnedColumns: GridColumn[] = [];
  const unpinnedColumns: GridColumn[] = [];

  displayColumns.forEach((column, index) => {
    const id = (column as { id?: string }).id ?? `col_${index}`;
    const isPinned =
      effectiveColumnConfig.get(id)?.pinned === true ||
      effectiveColumnConfig.get(`col_${index}`)?.pinned === true;

    if (isPinned) {
      pinnedColumns.push(column);
    } else {
      unpinnedColumns.push(column);
    }
  });

  return [...pinnedColumns, ...unpinnedColumns];
}



