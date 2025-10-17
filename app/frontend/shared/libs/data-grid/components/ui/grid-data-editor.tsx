import type {
	GridCell as GDGGridCell,
	GridColumn,
} from "@glideapps/glide-data-grid";
import DataEditor, { type Theme } from "@glideapps/glide-data-grid";
import { useColumnPinning } from "@shared/libs/data-grid/hooks/use-column-pinning";
import { useColumnReordering } from "@shared/libs/data-grid/hooks/use-column-reordering";
import { useGridSizer } from "@shared/libs/data-grid/hooks/use-grid-sizer";
import type { Size as ResizableSize } from "re-resizable";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnConfig, GridDataEditorProps } from "../../types";
import { useFullscreen } from "../contexts/fullscreen-context";
import { createDrawCellWithMissingIndicator } from "../drawing/draw-cell-with-missing-indicator";
import { createRowThemeOverride } from "../drawing/get-row-theme-override";
import { customRenderers } from "../renderers/custom-renderers";
import { createAutosizeHandler, registerAutosize } from "../utils/autosize";
import { getOrderedColumns } from "../utils/columns";
import { logColumnPinningState } from "../utils/debug";
import { createHandleItemHovered } from "../utils/hover";
import { buildContainerStyle, getContainerClasses } from "./grid-styles";
import { ResizableGridContainer } from "./resizable-grid-container";

// customRenderers moved to components/renderers/customRenderers

// Column configuration interface moved to external types

// GridDataEditorProps moved to external types

// useColumnPinning moved to hooks

// useColumnReordering moved to hooks

// useGridSizer extracted to hooks/useGridSizer

/**
 * Calculate the effective container dimensions based on fullscreen state
 */
function getEffectiveDimensions(options: {
	isFullscreen: boolean;
	fullscreenWidth: number;
	fullscreenHeight: number;
	measuredWidth: number | undefined;
	measuredHeight: number | undefined;
}): { width: number; height: number } {
	const {
		isFullscreen,
		fullscreenWidth,
		fullscreenHeight,
		measuredWidth,
		measuredHeight,
	} = options;
	return {
		width: isFullscreen ? fullscreenWidth : (measuredWidth ?? 0),
		height: isFullscreen ? fullscreenHeight : (measuredHeight ?? 0),
	};
}

/**
 * Build options object for useGridSizer hook, handling conditional properties
 */
function buildGridSizerOptions(options: {
	displayColumns: unknown[];
	filteredRowCount: number;
	containerWidth: number;
	containerHeight?: number;
	isFullscreen?: boolean;
	gridWidth?: number;
	fullWidth?: boolean;
	rowHeightOverride?: number;
	headerHeightOverride?: number;
	showAppendRowPlaceholder?: boolean;
}): Record<string, unknown> {
	const result: Record<string, unknown> = {
		displayColumns: options.displayColumns,
		filteredRowCount: options.filteredRowCount,
		containerWidth: options.containerWidth,
	};

	if (options.containerHeight !== undefined) {
		result.containerHeight = options.containerHeight;
	}
	if (options.isFullscreen !== undefined) {
		result.isFullscreen = options.isFullscreen;
	}
	if (options.gridWidth !== undefined) {
		result.gridWidth = options.gridWidth;
	}
	if (options.fullWidth !== undefined) {
		result.fullWidth = options.fullWidth;
	}
	if (options.rowHeightOverride !== undefined) {
		result.rowHeightOverride = options.rowHeightOverride;
	}
	if (options.headerHeightOverride !== undefined) {
		result.headerHeightOverride = options.headerHeightOverride;
	}
	if (options.showAppendRowPlaceholder !== undefined) {
		result.showAppendRowPlaceholder = options.showAppendRowPlaceholder;
	}

	return result;
}

/**
 * Manage internal vs external column configuration
 */
function useEffectiveColumnConfig(
	externalMapping: Map<string, ColumnConfig>,
	onExternal: ((config: Map<string, ColumnConfig>) => void) | undefined,
	internalState: Map<string, ColumnConfig>,
	setInternal: (config: Map<string, ColumnConfig>) => void
): {
	config: Map<string, ColumnConfig>;
	setConfig: (config: Map<string, ColumnConfig>) => void;
} {
	return {
		config: externalMapping.size > 0 ? externalMapping : internalState,
		setConfig: onExternal || setInternal,
	};
}

/**
 * Initialize column configuration and pinning state
 */
function useColumnManagement(options: {
	displayColumns: GridColumn[];
	containerWidth: number;
	columnConfigMapping: Map<string, ColumnConfig>;
	onColumnConfigChange:
		| ((config: Map<string, ColumnConfig>) => void)
		| undefined;
	clearSelection: () => void;
}): {
	effectiveColumnConfig: Map<string, ColumnConfig>;
	setEffectiveColumnConfig: (config: Map<string, ColumnConfig>) => void;
	freezeColumns: number;
	isPinnedColumnsWidthTooLarge: boolean;
	onColumnMoved: (fromIndex: number, toIndex: number) => void;
	pinColumn: (columnIndex: number) => void;
	unpinColumn: (columnIndex: number) => void;
} {
	const [internalColumnConfig, setInternalColumnConfig] = useState<
		Map<string, ColumnConfig>
	>(new Map());

	const { config: effectiveColumnConfig, setConfig: setEffectiveColumnConfig } =
		useEffectiveColumnConfig(
			options.columnConfigMapping,
			options.onColumnConfigChange,
			internalColumnConfig,
			setInternalColumnConfig
		);

	const {
		freezeColumns,
		pinColumn,
		unpinColumn,
		isPinnedColumnsWidthTooLarge,
	} = useColumnPinning({
		columns: options.displayColumns,
		containerWidth: options.containerWidth,
		minColumnWidth: 50,
		clearSelection: options.clearSelection,
		columnConfigMapping: effectiveColumnConfig,
		setColumnConfigMapping: setEffectiveColumnConfig,
	});

	const { onColumnMoved } = useColumnReordering({
		columns: options.displayColumns,
		freezeColumns,
		pinColumn,
		unpinColumn,
		columnConfigMapping: effectiveColumnConfig,
	});

	return {
		effectiveColumnConfig,
		setEffectiveColumnConfig,
		freezeColumns,
		isPinnedColumnsWidthTooLarge,
		onColumnMoved,
		pinColumn,
		unpinColumn,
	};
}

export const GridDataEditor: React.FC<GridDataEditorProps> = ({
	displayColumns,
	filteredRows: _filteredRows,
	filteredRowCount,
	getCellContent,
	onCellEdited,
	onGridSelectionChange,
	gridSelection,
	onRowAppended,
	onItemHovered,
	onHeaderMenuClick,
	searchValue,
	onSearchValueChange,
	showSearch,
	onSearchClose,
	theme,
	darkTheme: _darkTheme,
	hoverRow,
	dataEditorRef,
	onMouseEnter,
	onMouseLeave,
	gridWidth,
	fullWidth,
	containerWidth: measuredContainerWidth,
	containerHeight: measuredContainerHeight,
	columnConfigMapping = new Map(),
	onColumnConfigChange,
	clearSelection = () => {
		// Default no-op handler for clearing selection
	},
	onColumnResize,
	onAutosize,
	headerIcons,
	drawHeader,
	rowHeightOverride,
	headerHeightOverride,
	showAppendRowPlaceholder = true,
	rowMarkers,
	disableTrailingRow,
	readOnly,
	hideOuterFrame,
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex grid component with multiple hooks and initialization logic
}) => {
	const {
		isFullscreen,
		width: fullscreenWidth,
		height: fullscreenHeight,
	} = useFullscreen();
	const borderWidth = hideOuterFrame ? 0 : 2;

	// Use fullscreen dimensions in fullscreen mode, otherwise use measured dimensions
	const { width: containerWidth, height: containerHeight } =
		getEffectiveDimensions({
			isFullscreen,
			fullscreenWidth,
			fullscreenHeight,
			measuredWidth: measuredContainerWidth,
			measuredHeight: measuredContainerHeight,
		});

	// Create wrapper function to adapt onItemHovered interface
	const handleItemHovered = createHandleItemHovered(onItemHovered);

	const {
		width,
		height,
		minWidth,
		minHeight,
		maxWidth,
		maxHeight,
		rowHeight,
		headerHeight,
	} = useGridSizer(
		buildGridSizerOptions({
			displayColumns,
			filteredRowCount,
			containerWidth,
			...(containerHeight !== undefined && { containerHeight }),
			...(isFullscreen !== undefined && { isFullscreen }),
			...(gridWidth !== undefined && { gridWidth }),
			...(fullWidth !== undefined && { fullWidth }),
			...(rowHeightOverride !== undefined && { rowHeightOverride }),
			...(headerHeightOverride !== undefined && { headerHeightOverride }),
			...(showAppendRowPlaceholder !== undefined && {
				showAppendRowPlaceholder,
			}),
		}) as Parameters<typeof useGridSizer>[0]
	);

	const {
		effectiveColumnConfig,
		freezeColumns,
		isPinnedColumnsWidthTooLarge,
		onColumnMoved,
	} = useColumnManagement({
		displayColumns,
		containerWidth,
		columnConfigMapping,
		onColumnConfigChange,
		clearSelection,
	});

	// Autosize functionality extracted to utilities
	const handleAutosize = createAutosizeHandler(dataEditorRef);
	useEffect(
		() => registerAutosize(onAutosize, handleAutosize),
		[onAutosize, handleAutosize]
	);

	// Reorder columns to put pinned columns first (similar to Streamlit's logic)
	const orderedColumns = useMemo(
		() => getOrderedColumns(displayColumns, effectiveColumnConfig),
		[displayColumns, effectiveColumnConfig]
	);

	// Resizable size state
	const [resizableSize, setResizableSize] = useState<ResizableSize>({
		width: typeof width === "number" ? width : "100%",
		height,
	});

	// Update resizable size when dimensions change
	useEffect(() => {
		setResizableSize({
			width: typeof width === "number" ? width : "100%",
			height,
		});
	}, [width, height]);

	// Debug logging
	useEffect(() => {
		logColumnPinningState({
			freezeColumns,
			isPinnedColumnsWidthTooLarge,
			pinnedCount: orderedColumns.slice(0, freezeColumns).length,
			totalColumns: orderedColumns.length,
			configSize: effectiveColumnConfig.size,
		});
	}, [
		freezeColumns,
		isPinnedColumnsWidthTooLarge,
		orderedColumns,
		effectiveColumnConfig,
	]);

	const drawCell = useMemo(
		() => createDrawCellWithMissingIndicator(orderedColumns, theme as Theme),
		[orderedColumns, theme]
	);

	const getRowThemeOverride = useMemo(
		() => createRowThemeOverride(hoverRow, theme as Theme, filteredRowCount),
		[hoverRow, theme, filteredRowCount]
	);

	const containerStyle = buildContainerStyle(isFullscreen, fullWidth);
	const { containerClass, fullscreenClass } = getContainerClasses(
		isFullscreen,
		fullWidth
	);

	return (
		<div
			aria-hidden="true"
			className={`${containerClass} ${fullscreenClass}`}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			role="presentation"
			style={containerStyle}
		>
			<ResizableGridContainer
				borderWidth={borderWidth}
				hideOuterFrame={!!hideOuterFrame}
				isFullscreen={isFullscreen}
				maxHeight={maxHeight}
				maxWidth={maxWidth}
				minHeight={minHeight}
				minWidth={minWidth}
				onResizeStop={setResizableSize}
				size={resizableSize}
				theme={theme as Theme}
			>
				<DataEditor
					columns={orderedColumns}
					getCellContent={(cell) =>
						getCellContent(cell) as unknown as GDGGridCell
					} // Use reordered columns with pinned columns first
					headerIcons={headerIcons}
					maxColumnAutoWidth={400}
					maxColumnWidth={2000}
					minColumnWidth={50}
					rows={filteredRowCount}
					scaleToRem
					theme={theme as Theme}
					{...(drawHeader ? { drawHeader } : {})}
					customRenderers={customRenderers}
					drawCell={drawCell}
					experimental={{
						disableMinimumCellWidth: true,
					}}
					getRowThemeOverride={getRowThemeOverride}
					gridSelection={gridSelection}
					{...(readOnly ? {} : { onGridSelectionChange })}
					freezeColumns={freezeColumns} // Use calculated freeze columns count
					{...(onRowAppended ? { onRowAppended } : {})}
					onColumnMoved={onColumnMoved} // Use Streamlit-style column reordering
					{...(readOnly ? {} : { onCellEdited })}
					onItemHovered={handleItemHovered}
					{...(rowMarkers !== undefined
						? {
								rowMarkers:
									rowMarkers === "selection"
										? "checkbox"
										: (rowMarkers as
												| "checkbox"
												| "number"
												| "clickable-number"
												| "checkbox-visible"
												| "both"
												| "none"
												| {
														kind:
															| "checkbox"
															| "number"
															| "clickable-number"
															| "checkbox-visible"
															| "both"
															| "none";
														checkboxStyle?: "circle" | "square";
														startIndex?: number;
														width?: number;
														theme?: Partial<Theme>;
												  }),
							}
						: {})}
					columnSelect="none"
					fillHandle={!readOnly}
					getCellsForSelection={true}
					headerHeight={headerHeight}
					onHeaderMenuClick={(colIdx, bounds) => {
						const col = orderedColumns[colIdx];
						if (col) {
							onHeaderMenuClick?.(col, bounds);
						}
					}}
					onSearchClose={onSearchClose}
					onSearchValueChange={onSearchValueChange}
					ref={dataEditorRef}
					rowHeight={rowHeight}
					rowSelect={readOnly ? "none" : "multi"}
					rowSelectionMode={readOnly ? "auto" : "multi"}
					searchValue={searchValue}
					showSearch={showSearch}
					{...(disableTrailingRow
						? {}
						: { trailingRowOptions: { sticky: false, tint: true } })}
					{...(onColumnResize && { onColumnResize })}
					editOnType={false}
					keybindings={{
						downFill: true,
						clear: true,
						selectColumn: true,
						selectRow: true,
						search: true,
						pageUp: true,
						pageDown: true,
						first: true,
						last: true,
					}}
				/>
			</ResizableGridContainer>
		</div>
	);
};
