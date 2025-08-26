import type { GridMouseEventArgs } from "@glideapps/glide-data-grid";
import DataEditor, {
	type DataEditorRef,
	type DrawCellCallback,
	drawTextCell,
	type GetRowThemeCallback,
	GridCellKind,
	type GridColumn,
	type GridSelection,
	type Item,
	type Theme,
} from "@glideapps/glide-data-grid";
import { DropdownCell as DropdownRenderer } from "@glideapps/glide-data-grid-cells";
import { Resizable, type Size as ResizableSize } from "re-resizable";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFullscreen } from "../contexts/FullscreenContext";
import PhoneInputCellRenderer from "../PhoneInputCell";
import TempusDateCellRenderer from "../TempusDominusDateCell";
import TimekeeperCellRenderer from "../TimekeeperCell";
import { drawAttentionIndicator } from "../utils/cellDrawHelpers";
import { messages } from "../utils/i18n";

const customRenderers = [
	DropdownRenderer,
	TempusDateCellRenderer,
	PhoneInputCellRenderer,
	TimekeeperCellRenderer,
];

// Column configuration interface (similar to Streamlit's ColumnConfigProps)
interface ColumnConfig {
	pinned?: boolean;
	width?: number;
	hidden?: boolean;
}

interface GridDataEditorProps {
	displayColumns: GridColumn[];
	filteredRows: number[];
	filteredRowCount: number;
	getCellContent: (cell: Item) => unknown;
	onCellEdited: (cell: Item, newVal: unknown) => void;
	onGridSelectionChange: (selection: GridSelection) => void;
	gridSelection: GridSelection;
	onRowAppended: () => void;
	onItemHovered: (args: { location: [number, number]; item: Item }) => void;
	onHeaderMenuClick: (
		colIdx: number,
		bounds: { x: number; y: number; width: number; height: number },
	) => void;
	searchValue: string;
	onSearchValueChange: (value: string) => void;
	showSearch: boolean;
	onSearchClose: () => void;
	theme: Partial<Theme>;
	darkTheme: Partial<Theme>;
	hoverRow?: number;
	dataEditorRef: React.RefObject<DataEditorRef>;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	gridWidth?: number;
	fullWidth?: boolean;
	containerWidth?: number;
	containerHeight?: number;
	// Column management props - using Streamlit-style configuration
	columnConfigMapping?: Map<string, ColumnConfig>;
	onColumnConfigChange?: (mapping: Map<string, ColumnConfig>) => void;
	clearSelection?: (keepRows?: boolean, keepColumns?: boolean) => void;
	// Column resizing - keep the existing functionality
	onColumnResize?: (column: GridColumn, newSize: number) => void;
	// Autosize functionality like st_DataFrame
	onAutosize?: (columnIndex: number) => void;
}

// Hook for managing column pinning (similar to Streamlit's useColumnPinning)
const useColumnPinning = (
	columns: GridColumn[],
	containerWidth: number,
	minColumnWidth: number,
	clearSelection: (keepRows?: boolean, keepColumns?: boolean) => void,
	columnConfigMapping: Map<string, ColumnConfig>,
	setColumnConfigMapping: (mapping: Map<string, ColumnConfig>) => void,
) => {
	// Calculate if pinned columns width is too large (similar to Streamlit's logic)
	const isPinnedColumnsWidthTooLarge = useMemo(() => {
		const pinnedColumnsWidth = columns
			.filter((_col, idx) => {
				const columnId = `col_${idx}`;
				return columnConfigMapping.get(columnId)?.pinned === true;
			})
			.reduce(
				(acc, col) =>
					acc + ((col as { width?: number }).width || minColumnWidth * 2),
				0,
			);

		return pinnedColumnsWidth > containerWidth * 0.6;
	}, [columns, containerWidth, minColumnWidth, columnConfigMapping]);

	// Calculate freeze columns count
	const freezeColumns = useMemo(() => {
		if (isPinnedColumnsWidthTooLarge) return 0;

		return columns.filter((_col, idx) => {
			const columnId = `col_${idx}`;
			return columnConfigMapping.get(columnId)?.pinned === true;
		}).length;
	}, [columns, columnConfigMapping, isPinnedColumnsWidthTooLarge]);

	const pinColumn = useCallback(
		(columnIndex: number) => {
			const columnId = `col_${columnIndex}`;
			const newMapping = new Map(columnConfigMapping);
			newMapping.set(columnId, {
				...newMapping.get(columnId),
				pinned: true,
			});
			setColumnConfigMapping(newMapping);
			clearSelection(true, false);
		},
		[columnConfigMapping, setColumnConfigMapping, clearSelection],
	);

	const unpinColumn = useCallback(
		(columnIndex: number) => {
			const columnId = `col_${columnIndex}`;
			const newMapping = new Map(columnConfigMapping);
			newMapping.set(columnId, {
				...newMapping.get(columnId),
				pinned: false,
			});
			setColumnConfigMapping(newMapping);
			clearSelection(true, false);
		},
		[columnConfigMapping, setColumnConfigMapping, clearSelection],
	);

	return {
		freezeColumns,
		pinColumn,
		unpinColumn,
		isPinnedColumnsWidthTooLarge,
	};
};

// Hook for managing column reordering (similar to Streamlit's useColumnReordering)
const useColumnReordering = (
	_columns: GridColumn[],
	freezeColumns: number,
	pinColumn: (columnIndex: number) => void,
	unpinColumn: (columnIndex: number) => void,
	_columnConfigMapping: Map<string, ColumnConfig>,
) => {
	const onColumnMoved = useCallback(
		(startIndex: number, endIndex: number) => {
			// Don't allow moving columns if it would break pinning logic
			if (startIndex === endIndex) return;

			const isStartPinned = startIndex < freezeColumns;
			const isEndPinned = endIndex < freezeColumns;

			// If moving from pinned to unpinned area, unpin the column
			if (isStartPinned && !isEndPinned) {
				unpinColumn(startIndex);
			}
			// If moving from unpinned to pinned area, pin the column
			else if (!isStartPinned && isEndPinned) {
				pinColumn(startIndex);
			}
		},
		[freezeColumns, pinColumn, unpinColumn],
	);

	return {
		onColumnMoved,
	};
};

// Hook for calculating grid dimensions (inspired by Streamlit's useTableSizer)
const useGridSizer = (
	displayColumns: GridColumn[],
	filteredRowCount: number,
	containerWidth: number,
	containerHeight?: number,
	isFullscreen?: boolean,
	gridWidth?: number,
	fullWidth?: boolean,
) => {
	const rowHeight = 33;
	const headerHeight = 35;
	const borderWidth = 2;
	const minTableWidth = 300;
	const minTableHeight = headerHeight + rowHeight + 2 * borderWidth;
	const defaultTableHeight = 400;

	const contentWidth = displayColumns.reduce(
		(sum, col) => sum + ((col as { width?: number }).width || 150),
		60,
	);
	const totalRows = filteredRowCount + 1;
	const contentHeight = headerHeight + totalRows * rowHeight + 2 * borderWidth;

	let maxHeight = Math.max(contentHeight, minTableHeight);
	let initialHeight = Math.min(maxHeight, defaultTableHeight);

	if (containerHeight && containerHeight > 0 && isFullscreen) {
		maxHeight = Math.min(maxHeight, containerHeight);
		initialHeight = maxHeight;
	} else if (!isFullscreen) {
		initialHeight = Math.min(maxHeight, defaultTableHeight);
	}

	let calculatedWidth: number | string;
	let maxWidth: number | string;

	if (isFullscreen && containerWidth > 0) {
		calculatedWidth = Math.max(containerWidth, minTableWidth);
		maxWidth = containerWidth;
	} else if (gridWidth !== undefined) {
		calculatedWidth = gridWidth;
		maxWidth = Math.max(gridWidth * 1.2, gridWidth + 200);
	} else if (fullWidth && containerWidth && containerWidth > 0) {
		// Use container width when fullWidth is enabled and we have measured width
		calculatedWidth = Math.max(containerWidth, minTableWidth);
		maxWidth = containerWidth;
	} else if (fullWidth) {
		// fallback to 100% when fullWidth is enabled but no container width yet
		calculatedWidth = "100%";
		maxWidth = "100%";
	} else {
		// Default auto-sizing behavior
		calculatedWidth = Math.max(contentWidth, minTableWidth);
		maxWidth = Math.max(contentWidth * 1.2, contentWidth + 200);
	}

	const calculatedHeight = isFullscreen
		? initialHeight
		: Math.min(initialHeight, defaultTableHeight);

	return {
		width: calculatedWidth,
		height: calculatedHeight,
		minWidth: minTableWidth,
		minHeight: minTableHeight,
		maxWidth,
		maxHeight,
		rowHeight,
		headerHeight,
	};
};

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
	clearSelection = () => {},
	onColumnResize,
	onAutosize,
}) => {
	const {
		isFullscreen,
		width: fullscreenWidth,
		height: fullscreenHeight,
	} = useFullscreen();
	const borderWidth = 2;

	// Use fullscreen dimensions in fullscreen mode, otherwise use measured dimensions
	const containerWidth = isFullscreen
		? fullscreenWidth
		: measuredContainerWidth || 0;
	const containerHeight = isFullscreen
		? fullscreenHeight
		: measuredContainerHeight || 0;

	// Create wrapper function to adapt onItemHovered interface
	const handleItemHovered = useCallback(
		(args: GridMouseEventArgs) => {
			if (onItemHovered && (args as { kind: string }).kind === "cell") {
				const g =
					args as unknown as import("@glideapps/glide-data-grid").GridMouseCellEventArgs;
				onItemHovered({
					location: g.location as [number, number],
					item: g.location,
				});
			}
		},
		[onItemHovered],
	);

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
		displayColumns,
		filteredRowCount,
		containerWidth,
		containerHeight,
		isFullscreen,
		gridWidth,
		fullWidth,
	);

	// Internal column config state (if not provided externally)
	const [internalColumnConfig, setInternalColumnConfig] = useState<
		Map<string, ColumnConfig>
	>(new Map());

	const effectiveColumnConfig =
		columnConfigMapping.size > 0 ? columnConfigMapping : internalColumnConfig;
	const setEffectiveColumnConfig =
		onColumnConfigChange || setInternalColumnConfig;

	// Column pinning management
	const {
		freezeColumns,
		pinColumn,
		unpinColumn,
		isPinnedColumnsWidthTooLarge,
	} = useColumnPinning(
		displayColumns,
		containerWidth,
		50, // minColumnWidth
		clearSelection,
		effectiveColumnConfig,
		setEffectiveColumnConfig,
	);

	// Column reordering management
	const { onColumnMoved } = useColumnReordering(
		displayColumns,
		freezeColumns,
		pinColumn,
		unpinColumn,
		effectiveColumnConfig,
	);

	// Autosize functionality using glide-data-grid's built-in remeasureColumns (like st_DataFrame)
	const handleAutosize = useCallback(
		(columnIndex: number) => {
			if (dataEditorRef?.current) {
				// Use CompactSelection for single column like st_DataFrame does
				import("@glideapps/glide-data-grid").then(({ CompactSelection }) => {
					dataEditorRef.current?.remeasureColumns(
						CompactSelection.fromSingleSelection(columnIndex),
					);
				});
			}
		},
		[dataEditorRef],
	);

	// Expose autosize to parent if provided
	useEffect(() => {
		if (onAutosize) {
			// Replace the parent's autosize with our implementation
			(window as Window & { gridAutosize?: () => void }).gridAutosize = () =>
				handleAutosize(0);
		}
		return () => {
			if ((window as Window & { gridAutosize?: () => void }).gridAutosize) {
				delete (window as Window & { gridAutosize?: () => void }).gridAutosize;
			}
		};
	}, [onAutosize, handleAutosize]);

	// Reorder columns to put pinned columns first (similar to Streamlit's logic)
	const orderedColumns = useMemo(() => {
		const pinnedColumns: GridColumn[] = [];
		const unpinnedColumns: GridColumn[] = [];

		displayColumns.forEach((column, index) => {
			const columnId = `col_${index}`;
			const isPinned = effectiveColumnConfig.get(columnId)?.pinned === true;

			if (isPinned) {
				pinnedColumns.push(column);
			} else {
				unpinnedColumns.push(column);
			}
		});

		return [...pinnedColumns, ...unpinnedColumns];
	}, [displayColumns, effectiveColumnConfig]);

	// Resizable size state
	const [resizableSize, setResizableSize] = useState<ResizableSize>({
		width: typeof width === "number" ? width : "100%",
		height: height,
	});

	// Update resizable size when dimensions change
	useEffect(() => {
		setResizableSize({
			width: typeof width === "number" ? width : "100%",
			height: height,
		});
	}, [width, height]);

	// Debug logging
	useEffect(() => {
		console.log("GridDataEditor column pinning state:", {
			freezeColumns,
			isPinnedColumnsWidthTooLarge,
			pinnedColumnCount: orderedColumns.slice(0, freezeColumns).length,
			totalColumns: orderedColumns.length,
			columnConfigSize: effectiveColumnConfig.size,
		});
	}, [
		freezeColumns,
		isPinnedColumnsWidthTooLarge,
		orderedColumns,
		effectiveColumnConfig,
	]);

	const drawCell: DrawCellCallback = useCallback(
		(args, draw) => {
			const { cell, col, ctx, rect } = args;
			const column = orderedColumns[col]; // Use ordered columns

			if ((cell as { isMissingValue?: boolean }).isMissingValue) {
				ctx.save();

				const hasContent = (() => {
					if (cell.kind === GridCellKind.Custom) {
						const data = (cell as { data?: unknown }).data as
							| {
									kind?: string;
									phone?: string;
									date?: Date;
									time?: Date;
									value?: unknown;
							  }
							| undefined;
						if (data?.kind === "phone-input-cell") return !!data.phone;
						if (data?.kind === "tempus-date-cell") return !!data.date;
						if (data?.kind === "timekeeper-cell")
							return !!(data as { time?: Date }).time;
						if (data?.kind === "dropdown-cell") return !!data.value;
						return false;
					}

					if (cell.kind === GridCellKind.Text)
						return !!(cell as { data?: unknown }).data;
					if (cell.kind === GridCellKind.Number)
						return (
							(cell as { data?: unknown }).data !== null &&
							(cell as { data?: unknown }).data !== undefined
						);

					return false;
				})();

				if (
					(column as { isRequired?: boolean; isEditable?: boolean })
						?.isRequired &&
					(column as { isRequired?: boolean; isEditable?: boolean })?.isEditable
				) {
					drawAttentionIndicator(ctx, rect, theme as Theme);
				}

				draw();

				if (!hasContent) {
					drawTextCell(
						{
							...args,
							theme: {
								...(theme as Theme),
								textDark: (theme as Theme).textLight,
							},
						} as unknown as Parameters<typeof drawTextCell>[0],
						messages.grid.none(),
						cell.contentAlign,
					);
				}

				ctx.restore();
				return;
			}
			draw();
		},
		[orderedColumns, theme], // Use ordered columns
	);

	const getRowThemeOverride: GetRowThemeCallback = useCallback(
		(row) => {
			if (row === hoverRow) {
				return {
					bgCell: (theme as Theme & { bgHeaderHovered?: string })
						.bgHeaderHovered,
					bgCellMedium: (theme as Theme & { bgHeaderHovered?: string })
						.bgHeaderHovered,
				};
			}

			if (row === filteredRowCount) {
				return {
					bgCell:
						(theme as Theme & { bgHeader?: string }).bgHeader ??
						(theme as Theme).bgCell,
					bgCellMedium:
						(theme as Theme & { bgHeader?: string }).bgHeader ??
						(theme as Theme).bgCellMedium,
					textDark: (theme as Theme & { textHeader?: string }).textHeader,
				};
			}

			return {
				bgCell: (theme as Theme).bgCell,
				bgCellMedium: (theme as Theme).bgCellMedium,
				textDark: (theme as Theme).textDark,
				textLight: (theme as Theme).textLight,
			};
		},
		[hoverRow, theme, filteredRowCount],
	);

	const containerStyle: React.CSSProperties = {
		width: isFullscreen || fullWidth ? "100%" : "fit-content",
		maxWidth: "100%",
		height: "auto",
		position: "relative",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "flex-start",
		margin: "0 auto",
	};

	const containerClass = fullWidth
		? "glide-grid-fullwidth glide-grid-inner-full"
		: "";
	const fullscreenClass = isFullscreen ? "glide-grid-fullscreen-editor" : "";

	return (
		<div
			role="presentation"
			aria-hidden="true"
			style={containerStyle}
			className={`${containerClass} ${fullscreenClass}`}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<Resizable
				size={resizableSize}
				minHeight={minHeight}
				maxHeight={maxHeight}
				minWidth={minWidth}
				maxWidth={maxWidth}
				style={{
					border: `${borderWidth}px solid ${String((theme as Theme & { borderColor?: string }).borderColor)}`,
					borderRadius: isFullscreen
						? "calc(var(--radius) + 4px)"
						: "var(--radius)",
					overflow: "hidden",
					backgroundColor: (theme as Theme).bgCell,
				}}
				enable={{
					top: false,
					right: false,
					bottom: false,
					left: false,
					topRight: false,
					bottomRight: !isFullscreen,
					bottomLeft: false,
					topLeft: false,
				}}
				onResizeStop={(_event, _direction, _ref, _delta) => {
					if (_ref) {
						setResizableSize({
							width: _ref.offsetWidth,
							height: _ref.offsetHeight,
						});
					}
				}}
			>
				<DataEditor
					getCellContent={(cell) =>
						getCellContent(
							cell,
						) as unknown as import("@glideapps/glide-data-grid").GridCell
					}
					columns={orderedColumns} // Use reordered columns with pinned columns first
					rows={filteredRowCount}
					maxColumnAutoWidth={400}
					maxColumnWidth={2000}
					minColumnWidth={50}
					scaleToRem
					theme={theme as Theme}
					experimental={{
						disableMinimumCellWidth: true,
					}}
					customRenderers={customRenderers}
					drawCell={drawCell}
					getRowThemeOverride={getRowThemeOverride}
					gridSelection={gridSelection}
					onGridSelectionChange={onGridSelectionChange}
					freezeColumns={freezeColumns} // Use calculated freeze columns count
					onRowAppended={onRowAppended}
					onColumnMoved={onColumnMoved} // Use Streamlit-style column reordering
					onCellEdited={onCellEdited}
					onItemHovered={handleItemHovered}
					rowMarkers="both"
					rowSelect="multi"
					rowSelectionMode="multi"
					columnSelect="none"
					searchValue={searchValue}
					onSearchValueChange={onSearchValueChange}
					showSearch={showSearch}
					onSearchClose={onSearchClose}
					onHeaderMenuClick={onHeaderMenuClick}
					ref={dataEditorRef}
					rowHeight={rowHeight}
					headerHeight={headerHeight}
					getCellsForSelection={true}
					fillHandle={true}
					trailingRowOptions={{
						sticky: false,
						tint: true,
					}}
					onColumnResize={onColumnResize}
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
			</Resizable>
		</div>
	);
};
