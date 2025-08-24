import {
	CompactSelection,
	GridCellKind,
	type GridColumn,
	type Item,
} from "@glideapps/glide-data-grid";
import React from "react";
import { useFullscreen } from "./contexts/FullscreenContext";
import { GridPortalProvider } from "./contexts/GridPortalContext";
import { InMemoryDataSource } from "./core/data-sources/InMemoryDataSource";
import { useColumnMenu } from "./hooks/useColumnMenu";
import { useColumnOperations } from "./hooks/useColumnOperations";
import { useGridActions } from "./hooks/useGridActions";
import { useGridColumns } from "./hooks/useGridColumns";
import { useGridDataOperations } from "./hooks/useGridDataOperations";
import { useGridEvents } from "./hooks/useGridEvents";
import { useGridLifecycle } from "./hooks/useGridLifecycle";
import { useGridPersistence } from "./hooks/useGridPersistence";
import { useGridState } from "./hooks/useGridState";
import { useGridTheme } from "./hooks/useGridTheme";
import { useGridTooltips } from "./hooks/useGridTooltips";
import { useModularGridData } from "./hooks/useModularGridData";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { ColumnMenu } from "./menus/ColumnMenu";
import Tooltip from "./Tooltip";
import { FullscreenWrapper } from "./ui/FullscreenWrapper";
import { GridDataEditor } from "./ui/GridDataEditor";
import { GridThemeToggle } from "./ui/GridThemeToggle";
import { GridToolbar } from "./ui/GridToolbar";

// Column configuration interface (same as in GridDataEditor)
interface ColumnConfig {
	pinned?: boolean;
	width?: number;
	hidden?: boolean;
}

export default function Grid({
	showThemeToggle = true,
	fullWidth = false,
	theme: externalTheme,
	isDarkMode = false,
	dataSource: externalDataSource,
	onReady,
	onDataProviderReady,
	dataEditorRef: externalDataEditorRef,
}: {
	showThemeToggle?: boolean;
	fullWidth?: boolean;
	theme?: any;
	isDarkMode?: boolean;
	dataSource?: any;
	onReady?: () => void;
	onDataProviderReady?: (provider: any) => void;
	dataEditorRef?: any;
} = {}) {
	// Initialize the data source - use external if provided, otherwise create default
	const dataSource = React.useMemo(() => {
		const result = externalDataSource || new InMemoryDataSource(8, 6);
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

	// Calculate the correct icon color based on actual theme being used
	const actualIconColor = isUsingExternalTheme
		? isDarkMode
			? "#e8e8e8"
			: "#000000" // Use black in light theme, white in dark theme
		: iconColor;

	const { isFullscreen, toggleFullscreen } = useFullscreen();
	const [gridKey, setGridKey] = React.useState(0); // Force re-render after loading state
	const [isStateLoaded, setIsStateLoaded] = React.useState(false);
	const [isInitializing, setIsInitializing] = React.useState(true);
	const [isDataReady, setIsDataReady] = React.useState(false);

	// Container width measurement
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = React.useState<
		number | undefined
	>(undefined);

	// Use ResizeObserver to track container width
	React.useEffect(() => {
		if (!containerRef.current) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const width = entry.contentRect.width;
				if (width > 0) {
					setContainerWidth(width);
				}
			}
		});

		// Initial measurement after a small delay to ensure dialog is rendered
		const initialMeasure = () => {
			if (containerRef.current) {
				// Use offsetWidth which includes border but not margin
				const width = containerRef.current.offsetWidth;
				if (width > 0) {
					setContainerWidth(width);
				}
			}
		};

		// Measure immediately and after multiple delays to ensure we catch dialog rendering
		initialMeasure();
		const timer1 = setTimeout(initialMeasure, 100);
		const timer2 = setTimeout(initialMeasure, 300);
		const timer3 = setTimeout(initialMeasure, 500);

		observer.observe(containerRef.current);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
			clearTimeout(timer3);
			observer.disconnect();
		};
	}, []); // Keep fullWidth dependency for consistency

	// Reset toolbar hover state when fullscreen changes
	React.useEffect(() => {}, []);

	// Force re-render when container width changes in fullWidth mode
	React.useEffect(() => {
		if (fullWidth && containerWidth && containerWidth > 0) {
			// Force a small delay to ensure the grid properly resizes
			const timer = setTimeout(() => {
				setGridKey((prev) => prev + 1);
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [containerWidth, fullWidth]);

	// Sync legacy grid state with new fullscreen context
	React.useEffect(() => {
		gs.setIsFullscreen(isFullscreen);
	}, [isFullscreen, gs.setIsFullscreen]);

	// Extract pinned columns from configuration mapping
	const pinnedColumns = React.useMemo(() => {
		const pinned: number[] = [];
		columnConfigMapping.forEach((config, columnId) => {
			if (config.pinned) {
				// columnId format is "col_${index}"
				const match = columnId.match(/^col_(\d+)$/);
				if (match) {
					const index = parseInt(match[1], 10);
					pinned.push(index);
				}
			}
		});
		return pinned;
	}, [columnConfigMapping]);

	const {
		columns,
		columnsState,
		displayColumns,
		visibleColumnIndices,
		onColumnResize,
		setColumns,
		onColumnMoved,
	} = useGridColumns(gs.hiddenColumns, dataSource, fullWidth, pinnedColumns);

	const columnMenu = useColumnMenu();

	// Use the new modular data system
	const {
		getCellContent: baseGetCellContent,
		onCellEdited: baseOnCellEdited,
		getRawCellContent,
		dataProvider,
	} = useModularGridData(
		dataSource,
		visibleColumnIndices,
		theme,
		darkTheme,
		columnMenu.columnFormats,
	);

	// Call onDataProviderReady when data provider is ready
	React.useEffect(() => {
		if (dataProvider && onDataProviderReady) {
			onDataProviderReady(dataProvider);
		}
	}, [dataProvider, onDataProviderReady]);

	// Get the editing state reference after dataProvider is created
	const editingState = React.useMemo(
		() => dataProvider.getEditingState(),
		[dataProvider],
	);

	// Integrate state persistence using localStorage
	const { saveState, loadState } = useGridPersistence(
		editingState,
		columnsState,
		setColumns,
		gs.hiddenColumns,
		gs.setHiddenColumns,
		isInitializing,
	);

	// Check if there's persisted state - but only use it if no external dataSource is provided
	const hasPersistedState = React.useMemo(() => {
		// Don't use persisted state if we have an external dataSource
		if (externalDataSource) return false;
		return localStorage.getItem("gridState") !== null;
	}, [externalDataSource]);

	// Load persisted state on first render - but only if no external dataSource
	React.useEffect(() => {
		if (!isStateLoaded && columnsState.length > 0) {
			if (hasPersistedState && !externalDataSource) {
				// Load persisted state only if no external dataSource
				loadState();
				// Clear any cached data to ensure fresh load
				dataProvider.refresh().then(() => {
					// Force grid to re-render after loading state
					setGridKey((prev) => prev + 1);
					setIsStateLoaded(true);
					setIsDataReady(true);
					// Allow saving after initial load is complete
					setTimeout(() => setIsInitializing(false), 100);
				});
			} else {
				// No persisted state or external dataSource provided, mark as ready immediately
				setIsStateLoaded(true);
				setIsDataReady(true);
				setIsInitializing(false);
			}
		}
	}, [
		loadState,
		dataProvider,
		isStateLoaded,
		columnsState.length,
		hasPersistedState,
		externalDataSource,
	]);

	// Call onReady callback when grid is fully ready
	React.useEffect(() => {
		if (isDataReady && !isInitializing && onReady) {
			onReady();
		}
	}, [isDataReady, isInitializing, onReady]);

	// Update the grid state to use data source row count
	React.useEffect(() => {
		gs.setNumRows(dataSource.rowCount);
	}, [dataSource.rowCount, gs]);

	const {
		filteredRows,
		filteredRowCount,
		tooltipMatrix,
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

	const dataEditorRef = externalDataEditorRef || React.useRef<any>(null);

	// Callback to refresh specific cells without re-rendering the entire grid
	const refreshCells = React.useCallback(
		(cells: { cell: [number, number] }[]) => {
			dataEditorRef.current?.updateCells(cells);
		},
		[dataEditorRef.current?.updateCells],
	);

	// Track previous formats to detect changes
	const prevFormatsRef = React.useRef<Record<string, string>>({});

	// Refresh cells when formats change
	React.useEffect(() => {
		if (!isInitializing && isDataReady && dataEditorRef.current) {
			const cellsToRefresh: { cell: [number, number] }[] = [];

			// Find columns that had format changes
			displayColumns.forEach((col, idx) => {
				const columnId = (col as any).id;
				const currentFormat = columnMenu.columnFormats[columnId];
				const previousFormat = prevFormatsRef.current[columnId];

				if (currentFormat !== previousFormat) {
					// Refresh all cells in this column
					for (let row = 0; row < filteredRowCount; row++) {
						cellsToRefresh.push({ cell: [idx, row] });
					}
				}
			});

			if (cellsToRefresh.length > 0) {
				refreshCells(cellsToRefresh);
			}

			// Update previous formats reference
			prevFormatsRef.current = { ...columnMenu.columnFormats };
		}
	}, [
		columnMenu.columnFormats,
		isInitializing,
		isDataReady,
		displayColumns,
		filteredRowCount,
		refreshCells,
		dataEditorRef.current,
	]);

	const getCellContent = React.useCallback(
		(cell: Item) => {
			const baseCell = baseGetCellContent(filteredRows)(cell);
			const [col] = cell;
			const column = displayColumns[col] as any;

			if (column?.sticky) {
				if (
					baseCell.kind === GridCellKind.Text &&
					(baseCell as any).style !== "faded"
				) {
					return { ...(baseCell as any), style: "faded" } as any;
				}

				return {
					...(baseCell as any),
					themeOverride: {
						...(baseCell as any).themeOverride,
						textDark: theme === darkTheme ? "#a1a1aa" : "#6b7280",
					},
				} as any;
			}

			if (
				baseCell.kind === GridCellKind.Text &&
				((baseCell as any).style === "faded" || (baseCell as any).themeOverride)
			) {
				const { style: _s, themeOverride: _t, ...rest } = baseCell as any;
				return { ...rest } as any;
			}

			return baseCell;
		},
		[filteredRows, baseGetCellContent, displayColumns, theme, darkTheme],
	);

	const onCellEdited = React.useCallback(
		(cell: Item, newVal: any) => {
			baseOnCellEdited(filteredRows)(cell, newVal);
			// Save state after each edit - but only if no external dataSource
			if (!externalDataSource) {
				saveState();
			}
		},
		[filteredRows, baseOnCellEdited, saveState, externalDataSource],
	);

	const {
		undo,
		redo,
		canUndo,
		canRedo,
		onCellEdited: undoOnCellEdited,
		onGridSelectionChange,
	} = useUndoRedo(dataEditorRef, getCellContent, onCellEdited, gs.setSelection);

	const actions = useGridActions(
		columns,
		gs.setHiddenColumns,
		gs.selection,
		gs.setDeletedRows,
		filteredRows,
		dataSource.rowCount,
		getRawCellContent,
		dataProvider.getDeletedRows(),
		columnsState,
		setColumns,
		gs.hiddenColumns,
	);

	const {
		tooltip,
		clearTooltip,
		onItemHovered: onTooltipHover,
	} = useGridTooltips(getCellContent, displayColumns);

	useGridEvents(gs.setShowSearch);
	useGridLifecycle(isFullscreen, gs.showColumnMenu, gs.setShowColumnMenu);

	const handleHide = React.useCallback(
		(columnId: string) => {
			const idx = columns.findIndex((c) => c.id === columnId);
			if (idx >= 0) gs.setHiddenColumns((prev) => new Set([...prev, idx]));
		},
		[columns, gs],
	);

	const clearSelection = React.useCallback(() => {
		gs.setSelection({
			rows: CompactSelection.empty(),
			columns: CompactSelection.empty(),
		});
		gs.setRowSelection(CompactSelection.empty());
	}, [gs]);

	const deleteRows = React.useCallback(async () => {
		const rowsToDelete = new Set<number>();
		gs.selection.rows.toArray().forEach((r) => {
			const actualRow = filteredRows[r];
			if (actualRow !== undefined) {
				rowsToDelete.add(actualRow);
			}
		});

		for (const row of rowsToDelete) {
			await dataProvider.deleteRow(row);
		}

		clearSelection();
		await dataProvider.refresh();
		// Save state after delete - but only if no external dataSource
		if (!externalDataSource) {
			saveState();
		}
	}, [
		gs.selection.rows,
		filteredRows,
		dataProvider,
		clearSelection,
		saveState,
		externalDataSource,
	]);

	const handleItemHovered = React.useCallback(
		(args: any) => {
			if (args.kind !== "cell") {
				// Clear row hovering state if the event indicates that
				// the mouse is not hovering a cell
				gs.setHoverRow(undefined);
			} else {
				const loc = args.location;
				if (!loc) return;
				const [, r] = loc;
				gs.setHoverRow(r >= 0 ? r : undefined);
			}
			onTooltipHover(args);
		},
		[gs, onTooltipHover],
	);

	const handleHeaderMenuClick = React.useCallback(
		(
			colIdx: number,
			bounds: { x: number; y: number; width: number; height: number },
		) => {
			const column = displayColumns[colIdx] as GridColumn;
			if (column) {
				// The bounds from glide-data-grid are already viewport coordinates when using onHeaderMenuClick
				// Position menu so its right edge aligns with the column header's right edge
				const menuWidth = 220; // Same as MENU_WIDTH in ColumnMenu
				columnMenu.openMenu(
					column as any,
					bounds.x + bounds.width - menuWidth,
					bounds.y + bounds.height,
				);
			}
		},
		[displayColumns, columnMenu],
	);

	const { handleAutosize, handlePin, handleUnpin } = useColumnOperations({
		columns,
		displayColumns,
		visibleColumnIndices,
		filteredRows,
		getRawCellContent,
		getCellContent, // Pass formatted cell content for autosize
		setColumns,
		columnConfigMapping,
		setColumnConfigMapping,
		clearSelection,
		dataEditorRef,
	});

	// Calculate grid width
	const calculatedWidth = displayColumns.reduce(
		(sum, col) => sum + ((col as any).width || 150),
		60,
	);

	// For fullWidth mode:
	// - If we have a measured container width, use it
	// - If container width is not yet available (0 or undefined), return undefined
	// - Otherwise use calculated width
	const gridWidth = React.useMemo(() => {
		if (isFullscreen) {
			// In fullscreen mode, let GridDataEditor handle width calculation
			return undefined;
		}
		if (fullWidth) {
			// If container width is measured and valid, use it
			if (containerWidth && containerWidth > 0) {
				return containerWidth;
			}
			// Return undefined to signal that we don't have a width yet
			return undefined;
		}
		// Not fullWidth mode, use calculated width
		return calculatedWidth;
	}, [fullWidth, containerWidth, calculatedWidth, isFullscreen]);

	// Don't render until data is ready
	if (!isDataReady || columnsState.length === 0) {
		// If onReady is provided, don't show loading spinner - the parent will handle loading state
		if (onReady) {
			return null;
		}

		return (
			<FullscreenWrapper theme={theme} darkTheme={darkTheme}>
				<div
					className={`glide-grid-container ${theme === darkTheme ? "glide-grid-container-dark" : "glide-grid-container-light"}`}
				>
					<div className="flex flex-col items-center gap-4">
						<div
							className={`glide-loading-spinner ${theme === darkTheme ? "glide-loading-spinner-dark" : "glide-loading-spinner-light"}`}
						/>
						<div
							className={`glide-loading-text ${theme === darkTheme ? "glide-loading-text-dark" : "glide-loading-text-light"}`}
						>
							Loading grid...
						</div>
					</div>
				</div>
			</FullscreenWrapper>
		);
	}

	return (
		<FullscreenWrapper theme={theme} darkTheme={darkTheme}>
			<GridPortalProvider>
				<div
					className={`glide-grid-wrapper ${isFullscreen ? "glide-grid-wrapper-fullscreen" : "glide-grid-wrapper-centered"}`}
				>
					{!isFullscreen && showThemeToggle && !isUsingExternalTheme && (
						<GridThemeToggle
							currentTheme={theme}
							lightTheme={lightTheme}
							darkTheme={darkTheme}
							iconColor={actualIconColor}
							filteredRowCount={filteredRowCount}
							onThemeChange={(newTheme) => {
								setTheme(newTheme);
								// Force grid to refetch all cells by toggling search
								const currentSearch = gs.searchValue;
								gs.setSearchValue(`${currentSearch} `);
								requestAnimationFrame(() => {
									gs.setSearchValue(currentSearch);
								});
							}}
						/>
					)}

					<GridToolbar
						isFocused={gs.isFocused || isFullscreen}
						hasSelection={actions.hasSelection}
						canUndo={canUndo}
						canRedo={canRedo}
						hasHiddenColumns={columns.length > displayColumns.length}
						onClearSelection={clearSelection}
						onDeleteRows={deleteRows}
						onUndo={undo}
						onRedo={redo}
						onAddRow={async () => {
							await dataProvider.addRow();
							gs.setNumRows(dataSource.rowCount);
							await dataProvider.refresh();
							// Save state after add row - but only if no external dataSource
							if (!externalDataSource) {
								saveState();
							}
						}}
						onToggleColumnVisibility={actions.handleToggleColumnVisibility}
						onDownloadCsv={actions.handleDownloadCsv}
						onToggleSearch={() => gs.setShowSearch((v) => !v)}
						onToggleFullscreen={toggleFullscreen}
					/>

					<div
						ref={containerRef}
						className={`glide-grid-inner ${fullWidth || isFullscreen ? "glide-grid-inner-full" : "glide-grid-inner-fit"}`}
						data-fullwidth={fullWidth}
						data-container-width={containerWidth}
					>
						<GridDataEditor
							key={gridKey}
							displayColumns={displayColumns}
							filteredRows={filteredRows}
							filteredRowCount={filteredRowCount}
							getCellContent={getCellContent}
							onCellEdited={undoOnCellEdited}
							onGridSelectionChange={onGridSelectionChange}
							gridSelection={gs.selection}
							onRowAppended={() => {
								(async () => {
									await dataProvider.addRow();
									gs.setNumRows(dataSource.rowCount);
									await dataProvider.refresh();
								})();
								return false;
							}}
							onItemHovered={handleItemHovered}
							onHeaderMenuClick={handleHeaderMenuClick}
							searchValue={gs.searchValue}
							onSearchValueChange={gs.setSearchValue}
							showSearch={gs.showSearch}
							onSearchClose={() => {
								gs.setShowSearch(false);
								gs.setSearchValue("");
							}}
							theme={theme}
							darkTheme={darkTheme}
							hoverRow={gs.hoverRow}
							dataEditorRef={dataEditorRef}
							onMouseEnter={() => gs.setIsFocused(true)}
							onMouseLeave={() => gs.setIsFocused(false)}
							gridWidth={gridWidth}
							fullWidth={fullWidth}
							containerWidth={containerWidth}
							containerHeight={undefined} // No height measurement in normal mode
							// Column management props - using Streamlit-style configuration
							columnConfigMapping={columnConfigMapping}
							onColumnConfigChange={setColumnConfigMapping}
							clearSelection={clearSelection}
							// Column resizing - keep existing functionality
							onColumnResize={onColumnResize}
						/>
					</div>
				</div>

				<Tooltip
					content={tooltip?.content || ""}
					x={tooltip?.left || 0}
					y={tooltip?.top || 0}
					visible={!!tooltip}
				/>

				{columnMenu.menuState.isOpen && columnMenu.menuState.column && (
					<ColumnMenu
						column={columnMenu.menuState.column}
						position={columnMenu.menuState.position}
						onClose={columnMenu.closeMenu}
						onSort={handleSort}
						onPin={handlePin}
						onUnpin={handleUnpin}
						onHide={handleHide}
						onAutosize={handleAutosize}
						onChangeFormat={columnMenu.changeFormat}
						isPinned={columnMenu.getPinnedSide(columnMenu.menuState.column.id)}
						sortDirection={
							sortState?.columnId === columnMenu.menuState.column.id
								? sortState.direction
								: null
						}
						isDarkTheme={
							isUsingExternalTheme ? isDarkMode : theme === darkTheme
						}
					/>
				)}
			</GridPortalProvider>
		</FullscreenWrapper>
	);
}
