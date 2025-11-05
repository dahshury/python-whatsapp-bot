export type GridDimensions = {
  width: number;
  height: number;
};

export type GridPosition = {
  col: number;
  row: number;
};

export type GridSelection = {
  rows: number[];
  columns: string[];
};

export type GridState = {
  isFullscreen: boolean;
  showSearch: boolean;
  showColumnMenu: boolean;
  searchValue: string;
  selection: GridSelection;
  deletedRows: Set<number>;
  hiddenColumns: Set<string>;
  hoverRow: number | undefined;
  numRows: number;
  initialNumRows: number;
};

export type GridThemeConfig = {
  accentColor: string;
  accentFg: string;
  bgBubble: string;
  bgBubbleSelected: string;
  bgCell: string;
  bgCellMedium: string;
  bgHeader: string;
  bgHeaderHasFocus: string;
  bgHeaderHovered: string;
  bgSearchResult: string;
  borderColor: string;
  drilldownBorder: string;
  fgIconHeader: string;
  fontFamily: string;
  headerFontStyle: string;
  linkColor: string;
  textBubble: string;
  textDark: string;
  textGroupHeader: string;
  textHeader: string;
  textHeaderSelected: string;
  textLight: string;
  textMedium: string;
};

export type ColumnConfig = {
  label?: string;
  width?: "small" | "medium" | "large" | number;
  help?: string;
  hidden?: boolean;
  disabled?: boolean;
  required?: boolean;
  default?: number | string | boolean;
  alignment?: "left" | "center" | "right";
  pinned?: boolean;
  typeConfig?: Record<string, unknown>;
};

// Public API exposed on window for targeted cell updates
// Helps avoid using `unknown` casts in consumers
export type GridPublicApi = {
  updateCells?: (cells: { cell: [number, number] }[]) => void;
};

// Extended data provider capabilities used by Grid container code paths
// Keeps Grid decoupled from the concrete DataProvider class while enabling typing
export type IGridDataProviderExtended = {
  getCell(
    col: number,
    row: number
  ): import("@glideapps/glide-data-grid").GridCell;
  setCell(
    col: number,
    row: number,
    value: import("@glideapps/glide-data-grid").GridCell
  ): void;
  getRowCount(): number;
  getColumnCount(): number;
  refresh(): Promise<void>;
  addRow(): Promise<number>;
  deleteRow(row: number): Promise<boolean>;
  getDeletedRows(): Set<number>;
  getEditingState(): unknown;
  setOnCellDataLoaded?: (cb: (col: number, row: number) => void) => void;
};

export type BaseColumnProps = {
  id: string;
  name: string;
  title: string;
  width: number;
  isEditable: boolean;
  isHidden: boolean;
  isPinned: boolean;
  isRequired: boolean;
  isIndex: boolean;
  indexNumber: number;
  contentAlignment?: "left" | "center" | "right";
  defaultValue?: unknown;
  columnTypeOptions?: Record<string, unknown>;
};

export type TooltipData = {
  content: string;
  position: { x: number; y: number };
  visible: boolean;
};

export type BrowserCapabilities = {
  isTouchDevice: boolean;
  hasCustomScrollbars: boolean;
  supportsFileSystemAPI: boolean;
  supportsResizeObserver: boolean;
};

export const LARGE_TABLE_ROWS_THRESHOLD = 150_000;
export const DEBOUNCE_TIME_MS = 150;
export const WEBKIT_SCROLLBAR_SIZE = 6;

export const PerformanceMode = {
  NORMAL: "normal",
  OPTIMIZED: "optimized",
  HIGH_PERFORMANCE: "high_performance",
} as const;

export type PerformanceMode =
  (typeof PerformanceMode)[keyof typeof PerformanceMode];
