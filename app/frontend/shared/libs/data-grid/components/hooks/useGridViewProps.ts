import type {
  GridColumn,
  GridSelection,
  Item,
  SpriteMap,
  Theme,
} from "@glideapps/glide-data-grid";
import React from "react";
import type { ColumnConfig } from "../../core/types/grid";
import type { GridViewProps } from "../GridView";
import { useColumnMenuPinning } from "./useColumnMenuPinning";

type UseGridViewPropsOptions = {
  // Theme props
  actualIconColor: string;
  canRedo: boolean;
  canUndo: boolean;
  className?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerWidth?: number | undefined;
  darkTheme: Partial<Theme>;
  displayColumns: GridColumn[];
  filteredRowCount: number;
  filteredRows: readonly number[];
  fullWidth: boolean;
  getCellContent: (cell: Item) => unknown;
  gridKey: number;
  gridSelection: GridSelection;
  hasHiddenColumns: boolean;
  hasSelection: boolean;
  hideToolbar?: boolean | undefined;
  isFocused: boolean;
  isFullscreen: boolean;
  isUsingExternalTheme: boolean;
  lightTheme: Partial<Theme>;
  theme: Partial<Theme>;
  showThemeToggle: boolean;
  toggleFullscreen: () => void;
  // Toolbar actions
  onAddRow: () => Promise<void> | void;
  onClearSelection: () => void;
  onDeleteRows: () => Promise<void> | void;
  onDownloadCsv: () => void;
  onRedo: () => void;
  onToggleColumnVisibility: () => void;
  onUndo: () => void;
  overlayPosition: { top: number; left: number } | null;
  // Editor props
  onCellEdited: (cell: Item, newVal: unknown) => void;
  onGridSelectionChange: (sel: unknown) => void;
  onRowAppendedHandler?: () => boolean;
  onHeaderMenuClick: (
    column: GridColumn,
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => void;
  onItemHovered: (args: {
    location: [number, number];
    item: Item;
    bounds?: { x: number; y: number; width: number; height: number };
  }) => void;
  onSearchClose: () => void;
  onSearchValueChange: (v: string) => void;
  setIsFocused: (v: boolean) => void;
  setTheme: (t: Partial<Theme>) => void;
  setSearchValue: (v: string) => void;
  setShowSearch: (updater: (prev: boolean) => boolean) => void;
  searchValue: string;
  showSearch: boolean;
  // Column menu props
  columnConfigMapping: Map<string, ColumnConfig>;
  columnMenu: {
    menuState: {
      column: { id: string } | null;
      isOpen: boolean;
      position: { x: number; y: number } | null;
    };
    changeFormat: (columnId: string, format: string) => void;
    closeMenu: () => void;
  };
  displayColumnsForPinning: GridColumn[];
  onColumnResize: (col: GridColumn, width: number) => void;
  handleAutosize: (columnId: string) => void;
  handleHide: (columnId: string) => void;
  handlePin: (columnId: string, side: "left" | "right") => void;
  handleSort: (columnId: string, dir: "asc" | "desc") => void;
  handleUnpin: (columnId: string) => void;
  sortState: {
    columnId: string;
    direction: "asc" | "desc";
  } | null;
  // Other props
  dataEditorRef: React.RefObject<unknown>;
  gridWidth?: number | undefined;
  calculatedWidth: number;
  headerIcons: SpriteMap;
  hideHeaders?: boolean | undefined;
  rowHeight?: number | undefined;
  headerHeight?: number | undefined;
  disableTrailingRow?: boolean | undefined;
  hideAppendRowPlaceholder?: boolean | undefined;
  hideOuterFrame?: boolean | undefined;
  isDarkMode: boolean;
  readOnly?: boolean | undefined;
  rowMarkers?:
    | "none"
    | "both"
    | "number"
    | "checkbox"
    | "checkbox-visible"
    | "clickable-number"
    | "selection"
    | undefined;
  setColumnConfigMapping: (m: Map<string, ColumnConfig>) => void;
  tooltip: Record<string, unknown> | null;
  disableTooltips?: boolean | undefined;
};

export function useGridViewProps(
  options: UseGridViewPropsOptions
): GridViewProps {
  const {
    columnConfigMapping,
    columnMenu,
    displayColumnsForPinning,
    handleAutosize,
    handleHide,
    handlePin,
    handleSort,
    handleUnpin,
    sortState,
    isDarkMode,
    theme,
    darkTheme,
    isUsingExternalTheme,
    ...restOptions
  } = options;

  const isMenuPinned = useColumnMenuPinning({
    columnId: columnMenu.menuState.column?.id,
    columnConfigMapping,
    displayColumns: displayColumnsForPinning,
  });

  const isMenuDark = React.useMemo(
    () => (isUsingExternalTheme ? isDarkMode : theme === darkTheme),
    [isUsingExternalTheme, isDarkMode, theme, darkTheme]
  );

  const sortDirection = React.useMemo(() => {
    if (
      sortState?.columnId === columnMenu.menuState.column?.id &&
      sortState?.direction
    ) {
      return sortState.direction as "asc" | "desc";
    }
    return null;
  }, [sortState, columnMenu.menuState.column?.id]);

  return {
    ...restOptions,
    actualIconColor: options.actualIconColor,
    canRedo: options.canRedo,
    canUndo: options.canUndo,
    className: options.className ?? "",
    containerRef: options.containerRef,
    containerWidth: options.containerWidth ?? 0,
    darkTheme: options.darkTheme,
    displayColumns: options.displayColumns as unknown as GridColumn[],
    filteredRowCount: options.filteredRowCount,
    filteredRows: options.filteredRows,
    fullWidth: options.fullWidth,
    getCellContent: options.getCellContent as (cell: Item) => unknown,
    gridKey: options.gridKey,
    gridSelection: options.gridSelection as unknown as GridSelection,
    hasHiddenColumns: options.hasHiddenColumns,
    hasSelection: options.hasSelection,
    hideToolbar: Boolean(options.hideToolbar),
    isFocused: options.isFocused,
    isFullscreen: options.isFullscreen,
    isUsingExternalTheme: options.isUsingExternalTheme,
    lightTheme: options.lightTheme,
    onAddRow: options.onAddRow,
    onCellEdited: options.onCellEdited,
    onClearSelection: options.onClearSelection,
    onDeleteRows: options.onDeleteRows,
    onDownloadCsv: options.onDownloadCsv,
    onGridSelectionChange: options.onGridSelectionChange,
    onRedo: options.onRedo,
    onToggleColumnVisibility: options.onToggleColumnVisibility,
    onUndo: options.onUndo,
    overlayPosition: options.overlayPosition,
    searchValue: options.searchValue,
    setSearchValue: options.setSearchValue,
    setShowSearch: options.setShowSearch,
    setTheme: options.setTheme,
    showSearch: options.showSearch,
    showThemeToggle: options.showThemeToggle,
    theme: options.theme,
    toggleFullscreen: options.toggleFullscreen,
    ...(options.disableTrailingRow
      ? {}
      : { onRowAppended: options.onRowAppendedHandler }),
    dataEditorRef: options.dataEditorRef as React.RefObject<unknown>,
    gridWidth: options.gridWidth ?? options.calculatedWidth,
    headerIcons: options.headerIcons,
    hideHeaders: Boolean(options.hideHeaders),
    onHeaderMenuClick: options.onHeaderMenuClick,
    onItemHovered: options.onItemHovered,
    onSearchClose: options.onSearchClose,
    onSearchValueChange: options.onSearchValueChange,
    setIsFocused: options.setIsFocused,
    ...(typeof options.rowHeight === "number"
      ? { rowHeight: options.rowHeight }
      : {}),
    ...(typeof options.headerHeight === "number"
      ? { headerHeight: options.headerHeight }
      : {}),
    clearSelection: options.onClearSelection,
    columnConfigMapping: options.columnConfigMapping,
    columnMenuColumn: columnMenu.menuState.column as unknown as {
      id: string;
    } | null,
    columnMenuOpen: columnMenu.menuState.isOpen,
    columnMenuPosition: columnMenu.menuState.position as unknown as {
      x: number;
      y: number;
    } | null,
    disableTrailingRow: Boolean(options.disableTrailingRow),
    hideAppendRowPlaceholder: Boolean(options.hideAppendRowPlaceholder),
    hideOuterFrame: Boolean(options.hideOuterFrame),
    isMenuDark,
    isMenuPinned,
    onAutosize: () => {
      const col = columnMenu.menuState.column?.id;
      if (col) {
        handleAutosize(col);
      }
    },
    onChangeFormat: columnMenu.changeFormat,
    onCloseMenu: columnMenu.closeMenu,
    onColumnResize: (col: number, width: number) => {
      try {
        const resizedColumn = options.displayColumns[col] as GridColumn;
        (
          options.onColumnResize as unknown as (
            c: GridColumn,
            w: number
          ) => void
        )(resizedColumn, width);
      } catch {
        /* ignore column resize error */
      }
    },
    onHideColumn: (id: string) => handleHide(id),
    onPinColumn: (id: string) => handlePin(id, "left"),
    onSortColumn: (id: string, dir: "asc" | "desc" | null) => {
      if (dir) {
        handleSort(id, dir);
      }
    },
    onUnpinColumn: (id: string) => handleUnpin(id),
    readOnly: Boolean(options.readOnly),
    ...(options.rowMarkers !== undefined
      ? { rowMarkers: options.rowMarkers }
      : {}),
    setColumnConfigMapping: (m: Map<string, ColumnConfig>) =>
      options.setColumnConfigMapping(m),
    sortDirection,
    tooltip: options.disableTooltips
      ? null
      : (options.tooltip as unknown as Record<string, unknown>),
  } as GridViewProps;
}
