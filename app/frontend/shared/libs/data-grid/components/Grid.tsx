import type {
  DataEditorRef,
  Item,
  SpriteMap,
} from "@glideapps/glide-data-grid";

import React from "react";
import { DEFAULT_COLS, DEFAULT_ROWS } from "../core/constants/grid";
import { computePinnedColumns } from "../core/selectors/gridSelectors";
import { createOpenColumnMenu } from "../core/services/openColumnMenu";
import type { ColumnConfig, GridProps } from "../core/types/grid";
import { createHeaderSprites } from "./assets/headerSprites";
import { useFullscreen } from "./contexts/FullscreenContext";
import { InMemoryDataSource } from "./core/data-sources/InMemoryDataSource";
import { GridColumnMenu } from "./GridColumnMenu";
import { GridView } from "./GridView";
import { useColumnMenu } from "./hooks/useColumnMenu";
import { useColumnOperations } from "./hooks/useColumnOperations";
import { useContainerWidth } from "./hooks/useContainerWidth";
import { useGridActions } from "./hooks/useGridActions";
import { useGridColumns } from "./hooks/useGridColumns";
import { useGridDataOperations } from "./hooks/useGridDataOperations";
import { useGridEventHandlers } from "./hooks/useGridEventHandlers";
import { useGridEvents } from "./hooks/useGridEvents";
import { useGridInitialization } from "./hooks/useGridInitialization";
import { useGridLifecycle } from "./hooks/useGridLifecycle";
import { useGridPersistence } from "./hooks/useGridPersistence";
import { useGridRefresh } from "./hooks/useGridRefresh";
import { useGridState } from "./hooks/useGridState";
import { useGridTheme } from "./hooks/useGridTheme";
import { useGridTooltips } from "./hooks/useGridTooltips";
import { useGridViewProps } from "./hooks/useGridViewProps";
import { useGridWidth } from "./hooks/useGridWidth";
import { useModularGridData } from "./hooks/useModularGridData";
import { useOverlayPosition } from "./hooks/useOverlayPosition";
import { useUndoRedo } from "./hooks/useUndoRedo";

//

import { createFieldEventHandler } from "../core/adapters/fieldEventMap";
import { createGetBoundsForCell } from "../core/services/bounds";
import { createGetCellContent } from "../core/services/getCellContent";
import { createHandleItemHovered } from "../core/services/hoverHandlers";
import { runEditPipeline } from "../core/services/runEditPipeline";

const Grid = function GridComponent({
  showThemeToggle = true,
  fullWidth = false,
  theme: externalTheme,
  isDarkMode = false,
  dataSource: externalDataSource,
  onReady,
  onDataProviderReady,
  dataEditorRef: externalDataEditorRef,
  validationErrors,
  onAppendRow,
  hideToolbar,
  hideHeaders,
  className,
  loading,
  rowHeight,
  headerHeight,
  hideAppendRowPlaceholder,
  rowMarkers,
  disableTrailingRow,
  onAddRowOverride,
  readOnly,
  disableTooltips,
  hideOuterFrame,
  // New pluggable editing behavior and callbacks
  editInterceptors,
  onFieldPersist,
  onNotify,
  documentsGrid,
  toolbarAnchor = "overlay",
  toolbarAlwaysVisible = false,
  toolbarHiddenActions = [],
}: GridProps) {
  const dataSource = React.useMemo(() => {
    const result =
      externalDataSource || new InMemoryDataSource(DEFAULT_ROWS, DEFAULT_COLS);
    return result;
  }, [externalDataSource]);
  const gs = useGridState();

  // Column configuration mapping state (Streamlit-style)
  const [columnConfigMapping, setColumnConfigMapping] = React.useState<
    Map<string, ColumnConfig>
  >(new Map());

  const {
    theme: internalTheme,
    setTheme,
    darkTheme,
    lightTheme,
    iconColor,
  } = useGridTheme(Boolean(externalTheme));

  // Use external theme if provided, otherwise use internal
  const theme = externalTheme || internalTheme;
  const isUsingExternalTheme = Boolean(externalTheme);
  const actualIconColor = React.useMemo(() => {
    if (isUsingExternalTheme) {
      return isDarkMode ? "#e8e8e8" : "#000000";
    }
    return iconColor;
  }, [isUsingExternalTheme, isDarkMode, iconColor]);

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [gridKey, setGridKey] = React.useState(0);

  // Container width measurement
  const [measureContainerRef, containerWidth] =
    useContainerWidth<HTMLDivElement>({
      minDeltaPx: 2,
      throttleMs: 0,
    });
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const setContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;

      const maybeCallback = measureContainerRef as unknown;
      if (typeof maybeCallback === "function") {
        (maybeCallback as (el: HTMLDivElement | null) => void)(node);
      } else if (maybeCallback && typeof maybeCallback === "object") {
        (
          maybeCallback as React.MutableRefObject<HTMLDivElement | null>
        ).current = node;
      }
    },
    [measureContainerRef]
  );

  // Sync fullscreen state
  React.useEffect(() => {
    gs.setIsFullscreen(isFullscreen);
  }, [isFullscreen, gs.setIsFullscreen]);

  // Extract pinned columns from configuration mapping
  const pinnedColumns = React.useMemo(
    () => computePinnedColumns(columnConfigMapping),
    [columnConfigMapping]
  );

  const {
    columns,
    columnsState,
    displayColumns,
    visibleColumnIndices,
    onColumnResize,
    setColumns,
    onColumnMoved: _onColumnMoved,
  } = useGridColumns({
    hiddenColumns: gs.hiddenColumns,
    dataSource,
    fullWidth,
    pinnedColumns,
    ...(documentsGrid !== undefined && { documentsGrid }),
  });

  const columnMenu = useColumnMenu();

  // Modular data system
  const {
    getCellContent: baseGetCellContent,
    onCellEdited: baseOnCellEdited,
    getRawCellContent,
    dataProvider,
  } = useModularGridData({
    dataSource,
    visibleColumnIndices,
    theme,
    darkTheme,
    columnFormats: columnMenu.columnFormats,
  });

  const editingState = React.useMemo(
    () => dataProvider.getEditingState(),
    [dataProvider]
  );

  // Initialize state flags (will be managed by useGridInitialization)
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isDataReady, setIsDataReady] = React.useState(false);

  // State persistence
  const { saveState, loadState } = useGridPersistence({
    editingState,
    columnsState,
    setColumns,
    hiddenColumns: gs.hiddenColumns,
    setHiddenColumns: gs.setHiddenColumns,
    isInitializing,
    options: { disableSave: Boolean(externalDataSource) },
  });

  // Grid initialization
  useGridInitialization({
    ...(externalDataSource && { externalDataSource }),
    ...(onDataProviderReady && { onDataProviderReady }),
    dataProvider,
    columnsState,
    loadState,
    dataSource,
    setGridKey,
    gs,
    setIsInitializing,
    setIsDataReady,
  });

  // onReady callback
  React.useEffect(() => {
    if (isDataReady && !isInitializing && onReady) {
      onReady();
    }
  }, [isDataReady, isInitializing, onReady]);

  const {
    filteredRows,
    filteredRowCount,
    tooltipMatrix: _tooltipMatrix,
    sortState,
    handleSort,
  } = useGridDataOperations({
    searchValue: gs.searchValue,
    deletedRows: dataProvider.getDeletedRows(),
    numRows: dataSource.rowCount,
    displayColumns,
    visibleColumnIndices,
    getRawCellContent,
  });

  const internalDataEditorRef = React.useRef<DataEditorRef>(null);
  const dataEditorRef = externalDataEditorRef || internalDataEditorRef;

  // Overlay position for toolbar
  const overlayPosition = useOverlayPosition(containerRef, {
    reanchorKey: isFullscreen,
  });

  // Consolidated refresh logic
  useGridRefresh({
    isInitializing,
    isDataReady,
    displayColumnsLength: displayColumns.length,
    filteredRowCount,
    dataEditorRef,
    columnFormats: columnMenu.columnFormats as Record<string, string>,
    geometryKey: containerWidth,
  });

  // Cell content (adds sticky treatment + loading state)
  const getCellContent = React.useMemo(
    () =>
      createGetCellContent({
        loading: Boolean(loading),
        isDataReady,
        columnsStateLength: columnsState.length,
        displayColumns: displayColumns as unknown as Array<{
          width?: number;
          sticky?: boolean;
        }>,
        filteredRows,
        baseGetCellContent,
        theme,
        darkTheme,
        ...(documentsGrid !== undefined ? { documentsGrid } : {}),
      }),
    [
      loading,
      isDataReady,
      columnsState.length,
      displayColumns,
      filteredRows,
      baseGetCellContent,
      theme,
      darkTheme,
      documentsGrid,
    ]
  );

  // Minimal onCellEdited + interceptors + callbacks
  const interceptors = React.useMemo(
    () => editInterceptors || [],
    [editInterceptors]
  );

  const onFieldEvent = React.useMemo(
    () =>
      createFieldEventHandler({
        ...(onFieldPersist ? { onFieldPersist } : {}),
        ...(onNotify ? { onNotify } : {}),
      }),
    [onFieldPersist, onNotify]
  );

  const onCellEdited = React.useMemo(
    () =>
      runEditPipeline({
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
      }),
    [
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
    ]
  );

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    onCellEdited: undoOnCellEdited,
    onGridSelectionChange,
  } = useUndoRedo({
    gridRef: dataEditorRef,
    getCellContent,
    onCellEdited,
    onGridSelectionChange: gs.setSelection,
  });

  const actions = useGridActions({
    columns,
    setHiddenColumns: gs.setHiddenColumns,
    selection: gs.selection,
    setDeletedRows: gs.setDeletedRows,
    visibleRows: filteredRows,
    numRows: dataSource.rowCount,
    getCellContent: getRawCellContent,
    deletedRows: dataProvider.getDeletedRows(),
    columnsState,
    setColumns,
    hiddenColumns: gs.hiddenColumns,
  });

  const getBoundsForCell = React.useMemo(
    () => createGetBoundsForCell(dataEditorRef),
    [dataEditorRef]
  );

  const { tooltip, onItemHovered: onTooltipHover } = useGridTooltips({
    getCellContent: (cell) => getCellContent(cell) as unknown,
    columns: displayColumns.map((dc) => {
      const typedDc = dc as {
        isRequired?: boolean;
        isEditable?: boolean;
        help?: string;
      };
      return {
        ...(typedDc.isRequired !== undefined && {
          isRequired: typedDc.isRequired,
        }),
        ...(typedDc.isEditable !== undefined && {
          isEditable: typedDc.isEditable,
        }),
        ...(typedDc.help !== undefined && { help: typedDc.help }),
      };
    }),
    ...(validationErrors !== undefined && { validationErrors }),
    ...(getBoundsForCell !== undefined && { getBoundsForCell }),
  });

  useGridEvents(gs.setShowSearch);
  useGridLifecycle(isFullscreen, gs.showColumnMenu, gs.setShowColumnMenu);

  // Grid event handlers
  const { handleHide, clearSelection, deleteRows, onRowAppendedHandler } =
    useGridEventHandlers({
      columns,
      gs,
      filteredRows,
      dataProvider,
      dataSource,
      getRawCellContent,
      saveState,
      ...(externalDataSource && { externalDataSource }),
      ...(onAppendRow && { onAppendRow }),
    });

  const handleItemHovered = React.useMemo(
    () =>
      createHandleItemHovered({
        setHoverRow: gs.setHoverRow,
        dataEditorRef,
        onTooltipHover,
      }),
    [gs.setHoverRow, dataEditorRef, onTooltipHover]
  );

  const handleHeaderMenuClick = React.useMemo(
    () =>
      createOpenColumnMenu(
        columnMenu as unknown as {
          openMenu: (column: unknown, x: number, y: number) => void;
        }
      ),
    [columnMenu]
  );

  const { handleAutosize, handlePin, handleUnpin } = useColumnOperations({
    columns,
    displayColumns,
    visibleColumnIndices,
    filteredRows,
    getRawCellContent,
    getCellContent,
    setColumns,
    columnConfigMapping: columnConfigMapping as unknown as Map<string, unknown>,
    setColumnConfigMapping: (m: Map<string, unknown>) =>
      setColumnConfigMapping(m as unknown as Map<string, ColumnConfig>),
    clearSelection,
    dataEditorRef,
  });

  // Grid width
  const { calculatedWidth, gridWidth } = useGridWidth({
    displayColumns,
    fullWidth,
    containerWidth,
    isFullscreen,
  });

  // Header icons
  const headerIcons = React.useMemo<SpriteMap>(() => createHeaderSprites(), []);

  // Prepare GridView props
  const gridViewProps = useGridViewProps({
    actualIconColor,
    canRedo,
    canUndo,
    className: className ?? "",
    containerRef: setContainerRef,
    containerWidth,
    darkTheme,
    displayColumns,
    filteredRowCount,
    filteredRows,
    fullWidth,
    getCellContent,
    gridKey,
    gridSelection: gs.selection,
    hasHiddenColumns: columns.length > displayColumns.length,
    hasSelection: actions.hasSelection,
    toolbarAnchor,
    toolbarAlwaysVisible,
    toolbarHiddenActions,
    ...(hideToolbar !== undefined && { hideToolbar }),
    isFocused: gs.isFocused,
    isFullscreen,
    isUsingExternalTheme,
    lightTheme,
    onAddRow:
      onAddRowOverride ||
      (async () => {
        await dataProvider.addRow();
        gs.setNumRows(dataSource.rowCount);
        if (!externalDataSource) {
          saveState();
        }
      }),
    onCellEdited: (editedCell: Item, editedValue: unknown) =>
      (undoOnCellEdited as unknown as (cell: Item, newVal: unknown) => void)(
        editedCell,
        editedValue
      ),
    onClearSelection: clearSelection,
    onDeleteRows: deleteRows,
    onDownloadCsv: actions.handleDownloadCsv,
    onGridSelectionChange: onGridSelectionChange as unknown as (
      s: unknown
    ) => void,
    onRedo: redo,
    onToggleColumnVisibility: actions.handleToggleColumnVisibility,
    onUndo: undo,
    overlayPosition,
    searchValue: gs.searchValue,
    setSearchValue: gs.setSearchValue,
    setShowSearch: gs.setShowSearch,
    setTheme,
    showSearch: gs.showSearch,
    showThemeToggle,
    theme,
    toggleFullscreen,
    onRowAppendedHandler,
    dataEditorRef,
    ...(gridWidth !== undefined && { gridWidth }),
    calculatedWidth,
    headerIcons,
    hideHeaders,
    onHeaderMenuClick: documentsGrid
      ? () => {
          // No-op for documents grid
        }
      : handleHeaderMenuClick,
    onItemHovered: (args: {
      location: [number, number];
      item: Item;
      bounds?: { x: number; y: number; width: number; height: number };
    }) =>
      handleItemHovered({
        kind: "cell",
        location: args.location,
        ...(args.bounds && { bounds: args.bounds }),
      }),
    onSearchClose: () => {
      gs.setShowSearch(false);
      gs.setSearchValue("");
    },
    onSearchValueChange: gs.setSearchValue,
    setIsFocused: gs.setIsFocused,
    rowHeight,
    headerHeight,
    columnConfigMapping,
    columnMenu,
    displayColumnsForPinning: displayColumns,
    onColumnResize,
    handleAutosize,
    handleHide,
    handlePin,
    handleSort,
    handleUnpin,
    sortState,
    isDarkMode,
    disableTrailingRow,
    hideAppendRowPlaceholder,
    hideOuterFrame,
    readOnly,
    rowMarkers,
    setColumnConfigMapping,
    tooltip: tooltip ?? null,
    disableTooltips,
  });

  // Render
  return (
    <>
      <GridView {...gridViewProps} />

      <GridColumnMenu
        columnConfigMapping={columnConfigMapping}
        columnMenu={columnMenu}
        darkTheme={darkTheme}
        displayColumns={displayColumns}
        handleAutosize={handleAutosize}
        handleHide={handleHide}
        handlePin={handlePin}
        handleSort={handleSort}
        handleUnpin={handleUnpin}
        isDarkMode={isDarkMode}
        isUsingExternalTheme={isUsingExternalTheme}
        sortState={sortState}
        theme={theme}
      />
    </>
  );
};

export default Grid;
