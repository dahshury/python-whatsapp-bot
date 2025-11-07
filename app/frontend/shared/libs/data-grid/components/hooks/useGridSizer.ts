import type { GridColumn } from "@glideapps/glide-data-grid";

const DEFAULT_ROW_HEIGHT = 33;
const DEFAULT_HEADER_HEIGHT = 35;
const BORDER_WIDTH = 1;
const MIN_TABLE_WIDTH = 300;
const DEFAULT_TABLE_HEIGHT = 400;
const DEFAULT_COLUMN_WIDTH = 150;
const INITIAL_CONTENT_WIDTH = 60;
const MAX_WIDTH_MULTIPLIER = 1.2;
const MAX_WIDTH_OFFSET = 200;

type UseGridSizerOptions = {
  displayColumns: GridColumn[];
  filteredRowCount: number;
  containerWidth: number;
  containerHeight?: number;
  isFullscreen?: boolean;
  gridWidth?: number;
  fullWidth?: boolean;
  rowHeightOverride?: number;
  headerHeightOverride?: number;
  showAppendRowPlaceholder?: boolean;
  hideOuterFrame?: boolean;
};

// Hook for calculating grid dimensions (inspired by Streamlit's useTableSizer)
export function useGridSizer(options: UseGridSizerOptions) {
  const {
    displayColumns,
    filteredRowCount,
    containerWidth,
    containerHeight,
    isFullscreen,
    gridWidth,
    fullWidth,
    rowHeightOverride,
    headerHeightOverride,
    showAppendRowPlaceholder = true,
    hideOuterFrame = false,
  } = options;

  const rowHeight = rowHeightOverride ?? DEFAULT_ROW_HEIGHT;
  const headerHeight = headerHeightOverride ?? DEFAULT_HEADER_HEIGHT;
  const borderHeight = hideOuterFrame ? 0 : BORDER_WIDTH;
  const minTableHeight = headerHeight + rowHeight + borderHeight;

  const contentWidth = displayColumns.reduce(
    (sum, col) =>
      sum + ((col as { width?: number }).width || DEFAULT_COLUMN_WIDTH),
    INITIAL_CONTENT_WIDTH
  );
  const totalRows = filteredRowCount + (showAppendRowPlaceholder ? 1 : 0);
  const contentHeight = headerHeight + totalRows * rowHeight + borderHeight;

  let maxHeight = Math.max(contentHeight, minTableHeight);
  let initialHeight = Math.min(maxHeight, DEFAULT_TABLE_HEIGHT);

  if (containerHeight && containerHeight > 0 && isFullscreen) {
    maxHeight = Math.min(maxHeight, containerHeight);
    initialHeight = maxHeight;
  } else if (!isFullscreen) {
    initialHeight = Math.min(maxHeight, DEFAULT_TABLE_HEIGHT);
  }

  let calculatedWidth: number | string;
  let maxWidth: number | string;

  if (isFullscreen && containerWidth > 0) {
    calculatedWidth = Math.max(containerWidth, MIN_TABLE_WIDTH);
    maxWidth = containerWidth;
  } else if (gridWidth !== undefined) {
    calculatedWidth = gridWidth;
    maxWidth = Math.max(
      gridWidth * MAX_WIDTH_MULTIPLIER,
      gridWidth + MAX_WIDTH_OFFSET
    );
  } else if (fullWidth && containerWidth && containerWidth > 0) {
    // Use container width when fullWidth is enabled and we have measured width
    calculatedWidth = Math.max(containerWidth, MIN_TABLE_WIDTH);
    maxWidth = containerWidth;
  } else if (fullWidth) {
    // fallback to 100% when fullWidth is enabled but no container width yet
    calculatedWidth = "100%";
    maxWidth = "100%";
  } else {
    // Default auto-sizing behavior
    calculatedWidth = Math.max(contentWidth, MIN_TABLE_WIDTH);
    maxWidth = Math.max(
      contentWidth * MAX_WIDTH_MULTIPLIER,
      contentWidth + MAX_WIDTH_OFFSET
    );
  }

  const calculatedHeight = isFullscreen
    ? initialHeight
    : Math.min(initialHeight, DEFAULT_TABLE_HEIGHT);

  return {
    width: calculatedWidth,
    height: calculatedHeight,
    minWidth: MIN_TABLE_WIDTH,
    minHeight: minTableHeight,
    maxWidth,
    maxHeight,
    rowHeight,
    headerHeight,
  };
}
