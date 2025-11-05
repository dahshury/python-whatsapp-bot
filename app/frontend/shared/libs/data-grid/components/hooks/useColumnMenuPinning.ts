import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import type { ColumnConfig } from "../../core/types/grid";

type UseColumnMenuPinningOptions = {
  columnId: string | undefined;
  columnConfigMapping: Map<string, ColumnConfig>;
  displayColumns: GridColumn[];
};

export function useColumnMenuPinning({
  columnId,
  columnConfigMapping,
  displayColumns,
}: UseColumnMenuPinningOptions): "left" | false {
  return React.useMemo(() => {
    if (!columnId) {
      return false as const;
    }
    const byId = columnConfigMapping.get(columnId)?.pinned === true;
    if (byId) {
      return "left" as const;
    }
    const displayIdx = displayColumns.findIndex((c) => c.id === columnId);
    const legacyKey = displayIdx >= 0 ? `col_${displayIdx}` : undefined;
    const result =
      legacyKey && columnConfigMapping.get(legacyKey)?.pinned === true
        ? ("left" as const)
        : (false as const);
    return result;
  }, [columnId, columnConfigMapping, displayColumns]);
}
