import type {
  DataEditorRef,
  GridCell,
  GridColumn,
  GridSelection,
  Item,
  SpriteMap,
  Theme,
} from "@glideapps/glide-data-grid";
import type React from "react";
import ReactDOM from "react-dom";
import {
  GridPortalProvider,
  useGridPortal,
} from "./contexts/GridPortalContext";
import TooltipFloat from "./Tooltip";
import { FullscreenWrapper } from "./ui/FullscreenWrapper";
import { GridDataEditor } from "./ui/GridDataEditor";
import { GridThemeToggle } from "./ui/GridThemeToggle";
import { GridToolbar } from "./ui/GridToolbar";

type ColumnConfig = {
  pinned?: boolean;
  width?: number;
  hidden?: boolean;
};

type Bounds = { x: number; y: number; width: number; height: number };

export type GridViewProps = {
  // Theming / layout
  theme: Partial<Theme>;
  darkTheme: Partial<Theme>;
  lightTheme: Partial<Theme>;
  showThemeToggle: boolean;
  isUsingExternalTheme: boolean;
  actualIconColor: string;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  hideToolbar?: boolean;
  className?: string;

  // Toolbar / header state
  filteredRowCount: number;
  setTheme: (t: Partial<Theme>) => void;
  searchValue: string;
  setSearchValue: (v: string) => void;
  showSearch: boolean;
  setShowSearch: (updater: (prev: boolean) => boolean) => void;

  // Toolbar actions
  canRedo: boolean;
  canUndo: boolean;
  hasHiddenColumns: boolean;
  hasSelection: boolean;
  isFocused: boolean;
  onAddRow: () => Promise<void> | void;
  onClearSelection: () => void;
  onDeleteRows: () => Promise<void> | void;
  onDownloadCsv: () => void;
  onRedo: () => void;
  onToggleColumnVisibility: () => void;
  onUndo: () => void;
  overlayPosition: { top: number; left: number } | null;

  // Container sizing
  fullWidth: boolean;
  containerWidth?: number;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Editor props
  displayColumns: GridColumn[];
  filteredRows: readonly number[];
  getCellContent: (cell: Item) => GridCell;
  gridSelection: unknown;
  gridKey: number;
  onCellEdited: (cell: Item, newVal: unknown) => void;
  onGridSelectionChange: (sel: unknown) => void;
  onRowAppended?: () => boolean;
  onHeaderMenuClick: (column: GridColumn, bounds: Bounds) => void;
  onItemHovered: (args: {
    location: [number, number];
    item: Item;
    bounds?: Bounds;
  }) => void;
  onSearchClose: () => void;
  onSearchValueChange: (v: string) => void;
  dataEditorRef: React.RefObject<DataEditorRef | null>;
  setIsFocused: (v: boolean) => void;
  gridWidth?: number;
  headerIcons: SpriteMap;
  hideHeaders?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  hideAppendRowPlaceholder?: boolean;
  rowMarkers?:
    | "checkbox"
    | "number"
    | "clickable-number"
    | "checkbox-visible"
    | "both"
    | "none"
    | "selection"
    | {
        kind:
          | "checkbox"
          | "number"
          | "clickable-number"
          | "checkbox-visible"
          | "both"
          | "none"
          | "selection";
        checkboxStyle?: "circle" | "square";
        startIndex?: number;
        width?: number;
        theme?: Partial<Theme>;
      };
  disableTrailingRow?: boolean;
  readOnly?: boolean;
  hideOuterFrame?: boolean;

  // Column config & resizing
  clearSelection: () => void;
  columnConfigMapping: Map<string, ColumnConfig>;
  setColumnConfigMapping: (m: Map<string, ColumnConfig>) => void;
  onColumnResize: (col: number, width: number) => void;

  // Tooltip
  tooltip:
    | ((null | {
        content?: string;
        left?: number;
        top?: number;
        fieldLabel?: string;
        message?: string;
      }) & { content?: string })
    | null;

  // Column menu
  columnMenuOpen: boolean;
  columnMenuColumn: { id: string } | null;
  columnMenuPosition: { x: number; y: number } | null;
  isMenuDark: boolean;
  isMenuPinned: "left" | false;
  onAutosize: () => void;
  onChangeFormat: (id: string, fmt: string) => void;
  onCloseMenu: () => void;
  onHideColumn: (columnId: string) => void;
  onPinColumn: (columnId: string) => void;
  onUnpinColumn: (columnId: string) => void;
  onSortColumn: (columnId: string, dir: "asc" | "desc" | null) => void;
  sortDirection: "asc" | "desc" | null;
};

export function GridView(props: GridViewProps) {
  const portalContainer = useGridPortal();
  const {
    theme,
    darkTheme,
    lightTheme,
    showThemeToggle,
    isUsingExternalTheme,
    actualIconColor,
    isFullscreen,
    toggleFullscreen,
    hideToolbar,
    className,
    filteredRowCount,
    setTheme,
    searchValue,
    setSearchValue,
    showSearch,
    setShowSearch,
    canRedo,
    canUndo,
    hasHiddenColumns,
    hasSelection,
    isFocused,
    onAddRow,
    onClearSelection,
    onDeleteRows,
    onDownloadCsv,
    onRedo,
    onToggleColumnVisibility,
    onUndo,
    overlayPosition,
    fullWidth,
    containerWidth,
    containerRef,
    displayColumns,
    filteredRows,
    getCellContent,
    gridSelection,
    gridKey,
    onCellEdited,
    onGridSelectionChange,
    onRowAppended,
    onHeaderMenuClick,
    onItemHovered,
    onSearchClose,
    onSearchValueChange,
    dataEditorRef,
    setIsFocused,
    gridWidth,
    headerIcons,
    hideHeaders,
    rowHeight,
    headerHeight,
    hideAppendRowPlaceholder,
    rowMarkers,
    disableTrailingRow,
    readOnly,
    hideOuterFrame,
    clearSelection,
    columnConfigMapping,
    setColumnConfigMapping,
    onColumnResize,
    tooltip,
    columnMenuOpen: _columnMenuOpen,
    columnMenuColumn: _columnMenuColumn,
    // unused column menu props omitted to satisfy noUnusedLocals
  } = props;

  return (
    <FullscreenWrapper darkTheme={darkTheme} theme={theme}>
      <GridPortalProvider>
        <div
          className={`glide-grid-wrapper ${isFullscreen ? "glide-grid-wrapper-fullscreen" : "glide-grid-wrapper-centered"} ${className || ""}`}
        >
          {!(hideToolbar || isFullscreen) &&
            showThemeToggle &&
            !isUsingExternalTheme && (
              <GridThemeToggle
                currentTheme={theme}
                darkTheme={darkTheme}
                filteredRowCount={filteredRowCount}
                iconColor={actualIconColor}
                lightTheme={lightTheme}
                onThemeChange={(newTheme) => {
                  setTheme(newTheme);
                  const currentSearch = searchValue;
                  setSearchValue(`${currentSearch} `);
                  requestAnimationFrame(() => {
                    setSearchValue(currentSearch);
                  });
                }}
              />
            )}

          {!hideToolbar &&
            portalContainer &&
            ReactDOM.createPortal(
              <GridToolbar
                canRedo={canRedo}
                canUndo={canUndo}
                hasHiddenColumns={hasHiddenColumns}
                hasSelection={hasSelection}
                isFocused={isFocused || isFullscreen}
                onAddRow={onAddRow}
                onClearSelection={onClearSelection}
                onDeleteRows={onDeleteRows}
                onDownloadCsv={onDownloadCsv}
                onRedo={onRedo}
                onToggleColumnVisibility={onToggleColumnVisibility}
                onToggleFullscreen={toggleFullscreen}
                onToggleSearch={() => setShowSearch((v) => !v)}
                onUndo={onUndo}
                overlay={true}
                overlayPosition={overlayPosition}
              />,
              portalContainer
            )}

          <div
            className={`glide-grid-inner ${fullWidth || isFullscreen ? "glide-grid-inner-full" : "glide-grid-inner-fit"}`}
            data-container-width={containerWidth}
            data-fullwidth={fullWidth}
            ref={containerRef}
            style={{
              willChange: (() => {
                if (fullWidth) {
                  return containerWidth ? "width" : "auto";
                }
                return;
              })(),
              margin: 0,
              padding: 0,
            }}
          >
            <GridDataEditor
              displayColumns={displayColumns}
              filteredRowCount={filteredRowCount}
              filteredRows={Array.from(filteredRows)}
              getCellContent={getCellContent}
              gridSelection={gridSelection as GridSelection}
              key={gridKey}
              onCellEdited={onCellEdited}
              onGridSelectionChange={
                onGridSelectionChange as (s: GridSelection) => void
              }
              {...(disableTrailingRow
                ? {}
                : {
                    onRowAppended,
                  })}
              darkTheme={darkTheme}
              onHeaderMenuClick={onHeaderMenuClick}
              onItemHovered={(args: {
                location: [number, number];
                item: Item;
                bounds?: Bounds;
              }) =>
                onItemHovered({
                  location: args.location,
                  item: args.item,
                  ...(args.bounds && { bounds: args.bounds }),
                })
              }
              onSearchClose={onSearchClose}
              onSearchValueChange={onSearchValueChange}
              searchValue={searchValue}
              showSearch={showSearch}
              theme={theme}
              {...((gridSelection as { hoverRow?: number } | undefined)
                ?.hoverRow !== undefined && {
                hoverRow: (gridSelection as { hoverRow?: number })
                  .hoverRow as number,
              })}
              dataEditorRef={dataEditorRef}
              onMouseEnter={() => setIsFocused(true)}
              onMouseLeave={() => setIsFocused(false)}
              {...(gridWidth !== undefined && { gridWidth })}
              fullWidth={fullWidth}
              {...(containerWidth !== undefined && { containerWidth })}
              {...(hideOuterFrame ? { hideOuterFrame: true } : {})}
              headerIcons={headerIcons}
              {...(hideHeaders ? { headerHeight: 0 as unknown as number } : {})}
              {...(typeof rowHeight === "number"
                ? { rowHeightOverride: rowHeight }
                : {})}
              {...(typeof headerHeight === "number"
                ? { headerHeightOverride: headerHeight }
                : {})}
              showAppendRowPlaceholder={!hideAppendRowPlaceholder}
              {...(rowMarkers ? { rowMarkers } : {})}
              {...(disableTrailingRow ? { disableTrailingRow: true } : {})}
              {...(typeof readOnly === "boolean" ? { readOnly } : {})}
              clearSelection={clearSelection}
              columnConfigMapping={columnConfigMapping}
              onColumnConfigChange={(mapping) =>
                setColumnConfigMapping(mapping)
              }
              onColumnResize={(column: GridColumn, newSize: number) => {
                try {
                  const idx = displayColumns.findIndex(
                    (c) => c.id === column.id
                  );
                  onColumnResize(idx, newSize);
                } catch {
                  onColumnResize(-1, newSize);
                }
              }}
            />
          </div>
        </div>

        {!hideToolbar && tooltip?.content && (
          <TooltipFloat
            content={tooltip.content}
            visible={true}
            x={tooltip.left || 0}
            y={tooltip.top || 0}
            {...(tooltip &&
              (tooltip as { fieldLabel?: string }).fieldLabel && {
                fieldLabel: (tooltip as { fieldLabel?: string }).fieldLabel,
              })}
            {...(tooltip &&
              (tooltip as { message?: string }).message && {
                message: (tooltip as { message?: string }).message,
              })}
          />
        )}
      </GridPortalProvider>
    </FullscreenWrapper>
  );
}
