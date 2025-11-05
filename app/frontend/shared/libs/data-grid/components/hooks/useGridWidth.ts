import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import {
  DEFAULT_COLUMN_WIDTH,
  GRID_BASE_WIDTH_PADDING,
} from "../../core/constants/grid";
import { computeGridWidth } from "../../core/selectors/gridSelectors";

type UseGridWidthOptions = {
  displayColumns: GridColumn[];
  fullWidth: boolean;
  containerWidth: number | undefined;
  isFullscreen: boolean;
};

export function useGridWidth({
  displayColumns,
  fullWidth,
  containerWidth,
  isFullscreen,
}: UseGridWidthOptions) {
  // Grid width
  const calculatedWidth = displayColumns.reduce(
    (sum, col) =>
      sum + ((col as { width?: number }).width || DEFAULT_COLUMN_WIDTH),
    GRID_BASE_WIDTH_PADDING
  );

  const gridWidth = React.useMemo(() => {
    const args: {
      isFullscreen: boolean;
      fullWidth: boolean;
      containerWidth?: number;
      calculatedWidth: number;
    } = {
      isFullscreen,
      fullWidth,
      calculatedWidth,
    };
    if (typeof containerWidth === "number") {
      args.containerWidth = containerWidth;
    }
    return computeGridWidth(args);
  }, [fullWidth, containerWidth, calculatedWidth, isFullscreen]);

  return {
    calculatedWidth,
    gridWidth,
  };
}
