'use client'

import type {
	GridCell as GDGGridCell,
	GridMouseCellEventArgs as GDGGridMouseCellEventArgs,
	GridMouseEventArgs,
} from '@glideapps/glide-data-grid'
import DataEditor, {
	type DrawCellCallback,
	type GetRowThemeCallback,
	type Theme,
} from '@glideapps/glide-data-grid'
import { DropdownCell as DropdownRenderer } from '@glideapps/glide-data-grid-cells'
import { Resizable, type Size as ResizableSize } from 're-resizable'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MIN_COLUMN_WIDTH } from '../../core/constants/grid'
import AgeWheelCellRenderer from '../AgeWheelCell'
import { useFullscreen } from '../contexts/FullscreenContext'
import { useColumnPinningStreamlit } from '../hooks/useColumnPinningStreamlit'
import { useColumnRemeasure } from '../hooks/useColumnRemeasure'
import { useColumnReorderingStreamlit } from '../hooks/useColumnReorderingStreamlit'
import { useGridSizer } from '../hooks/useGridSizer'
import PhoneCellRenderer from '../PhoneCellRenderer'
import TempusDateCellRenderer from '../TempusDominusDateCell'
import TimekeeperCellRenderer from '../TimekeeperCell'
import type { ColumnConfig } from '../types/column-config-streamlit.types'
import type { GridDataEditorProps } from '../types/grid-data-editor.types'
import { createDrawCellCallback } from '../utils/cellDrawing'
import { orderColumnsByPinning } from '../utils/columnOrdering'
import {
	getGridContainerClasses,
	getGridContainerStyles,
} from '../utils/gridContainerStyles'
import { createGetRowThemeOverride } from '../utils/rowTheme'

const customRenderers = [
	DropdownRenderer,
	TempusDateCellRenderer,
	TimekeeperCellRenderer,
	PhoneCellRenderer,
	AgeWheelCellRenderer,
]

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
	clearSelection,
	onColumnResize,
	onAutosize,
	headerIcons,
	rowHeightOverride,
	headerHeightOverride,
	showAppendRowPlaceholder = true,
	rowMarkers,
	disableTrailingRow,
	readOnly,
	hideOuterFrame,
	documentsGrid,
}) => {
	const {
		isFullscreen,
		width: fullscreenWidth,
		height: fullscreenHeight,
	} = useFullscreen()
	const borderWidth = hideOuterFrame ? 0 : 2

	// Use fullscreen dimensions in fullscreen mode, otherwise use measured dimensions
	const containerWidth = isFullscreen
		? fullscreenWidth
		: measuredContainerWidth || 0
	const containerHeight = isFullscreen
		? fullscreenHeight
		: measuredContainerHeight || 0

	// Create wrapper function to adapt onItemHovered interface
	const handleItemHovered = useCallback(
		(args: GridMouseEventArgs) => {
			if (onItemHovered && (args as { kind: string }).kind === 'cell') {
				const g = args as unknown as GDGGridMouseCellEventArgs
				const bounds = (
					g as unknown as {
						bounds?: { x: number; y: number; width: number; height: number }
					}
				).bounds

				onItemHovered({
					location: g.location as [number, number],
					item: g.location,
					...(bounds && { bounds }),
				})
			}
		},
		[onItemHovered]
	)

	const {
		width,
		height,
		minWidth,
		minHeight,
		maxWidth,
		maxHeight,
		rowHeight,
		headerHeight,
	} = useGridSizer({
		displayColumns,
		filteredRowCount,
		containerWidth,
		containerHeight,
		isFullscreen,
		...(gridWidth !== undefined && { gridWidth }),
		...(fullWidth !== undefined && { fullWidth }),
		...(rowHeightOverride !== undefined && { rowHeightOverride }),
		...(headerHeightOverride !== undefined && { headerHeightOverride }),
		showAppendRowPlaceholder,
		...(hideOuterFrame !== undefined && { hideOuterFrame }),
	})

	// Internal column config state (if not provided externally)
	const [internalColumnConfig, setInternalColumnConfig] = useState<
		Map<string, ColumnConfig>
	>(new Map())

	const effectiveColumnConfig =
		columnConfigMapping.size > 0 ? columnConfigMapping : internalColumnConfig
	const setEffectiveColumnConfig =
		onColumnConfigChange || setInternalColumnConfig

	// Column pinning management
	const noOpClearSelection = useCallback(() => {
		// No-op function for when clearSelection is not provided
	}, [])
	const { freezeColumns, pinColumn, unpinColumn } = useColumnPinningStreamlit({
		columns: displayColumns,
		containerWidth,
		minColumnWidth: MIN_COLUMN_WIDTH,
		clearSelection: clearSelection ?? noOpClearSelection,
		columnConfigMapping: effectiveColumnConfig,
		setColumnConfigMapping: setEffectiveColumnConfig,
	})

	// Column reordering management
	const { onColumnMoved } = useColumnReorderingStreamlit({
		columns: displayColumns,
		freezeColumns,
		pinColumn,
		unpinColumn,
		columnConfigMapping: effectiveColumnConfig,
	})

	// Autosize functionality using glide-data-grid's built-in remeasureColumns (like st_DataFrame)
	useColumnRemeasure(dataEditorRef, onAutosize)

	// Reorder columns to put pinned columns first (similar to Streamlit's logic)
	const orderedColumns = useMemo(
		() => orderColumnsByPinning(displayColumns, effectiveColumnConfig),
		[displayColumns, effectiveColumnConfig]
	)

	// Resizable size state
	const [resizableSize, setResizableSize] = useState<ResizableSize>({
		width: typeof width === 'number' ? width : '100%',
		height,
	})

	// Track previous dimensions to prevent unnecessary updates
	const prevDimensionsRef = useRef<{ width: number | string; height: number }>({
		width: typeof width === 'number' ? width : '100%',
		height,
	})

	// Update resizable size when dimensions change (only if values actually changed)
	useEffect(() => {
		const newWidth = typeof width === 'number' ? width : '100%'
		const newHeight = height

		// Only update if values have actually changed to prevent infinite loops
		if (
			prevDimensionsRef.current.width !== newWidth ||
			prevDimensionsRef.current.height !== newHeight
		) {
			prevDimensionsRef.current = { width: newWidth, height: newHeight }
			setResizableSize({
				width: newWidth,
				height: newHeight,
			})
		}
	}, [width, height])

	const drawCell: DrawCellCallback = useMemo(
		() => createDrawCellCallback(orderedColumns, theme),
		[orderedColumns, theme]
	)

	const getRowThemeOverride: GetRowThemeCallback = useMemo(
		() => createGetRowThemeOverride(hoverRow, theme, filteredRowCount),
		[hoverRow, theme, filteredRowCount]
	)

	// Custom drawHeader for documents grid to center text and icons
	const drawHeader = useMemo(() => {
		if (!documentsGrid) {
			return null
		}

		return (args: {
			ctx: CanvasRenderingContext2D
			column: { title: string; icon?: string }
			columnIndex: number
			theme: { headerFontStyle?: string; textHeader?: string; textDark: string }
			rect: { x: number; y: number; width: number; height: number }
			hoverAmount: number
			isSelected: boolean
			isHovered: boolean
			hasSelectedCell: boolean
			spriteManager: unknown
			menuBounds: { x: number; y: number; width: number; height: number }
		}) => {
			const { ctx, column, rect, theme: headerTheme } = args

			ctx.save()

			// Calculate center point
			const centerX = rect.x + rect.width / 2
			const centerY = rect.y + rect.height / 2

			// Set up font and style
			ctx.font = headerTheme.headerFontStyle ?? 'bold 13px sans-serif'
			ctx.fillStyle = headerTheme.textHeader ?? headerTheme.textDark
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'

			// For now, just draw centered text (icons could be added later if needed)
			ctx.fillText(column.title, centerX, centerY)

			ctx.restore()

			// Don't call drawContent() to avoid default left-aligned rendering
		}
	}, [documentsGrid])

	const containerStyle = getGridContainerStyles(
		isFullscreen,
		fullWidth ?? false
	)
	const containerClass = getGridContainerClasses(
		fullWidth ?? false,
		isFullscreen
	)

	// Calculate border radius based on hideOuterFrame and isFullscreen
	const borderRadius = useMemo(() => {
		if (hideOuterFrame) {
			return 0
		}
		if (isFullscreen) {
			return 'calc(var(--radius) + 4px)'
		}
		return 'var(--radius)'
	}, [hideOuterFrame, isFullscreen])

	return (
		<div
			aria-hidden="true"
			className={containerClass}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			role="presentation"
			style={containerStyle}
		>
			<Resizable
				enable={{
					top: false,
					right: false,
					bottom: false,
					left: false,
					topRight: false,
					bottomRight: hideOuterFrame ? false : !isFullscreen,
					bottomLeft: false,
					topLeft: false,
				}}
				maxHeight={maxHeight}
				maxWidth={maxWidth}
				minHeight={minHeight}
				minWidth={minWidth}
				onResizeStop={(_event, _direction, _ref, _delta) => {
					if (_ref) {
						setResizableSize({
							width: _ref.offsetWidth,
							height: _ref.offsetHeight,
						})
					}
				}}
				size={resizableSize}
				style={{
					border: borderWidth
						? `${borderWidth}px solid ${String((theme as Theme & { borderColor?: string }).borderColor)}`
						: 'none',
					borderRadius,
					overflow: 'hidden',
					backgroundColor: hideOuterFrame
						? 'transparent'
						: (theme as Theme).bgCell,
				}}
			>
				<DataEditor
					columns={orderedColumns}
					customRenderers={customRenderers} // Use reordered columns with pinned columns first
					drawCell={drawCell}
					{...(drawHeader ? { drawHeader } : {})}
					experimental={{
						disableMinimumCellWidth: true,
					}}
					getCellContent={(cell) =>
						getCellContent(cell) as unknown as GDGGridCell
					}
					getRowThemeOverride={getRowThemeOverride}
					gridSelection={gridSelection}
					headerIcons={headerIcons}
					maxColumnAutoWidth={400}
					maxColumnWidth={2000}
					minColumnWidth={50}
					rows={filteredRowCount}
					scaleToRem
					theme={theme as Theme}
					{...(readOnly ? {} : { onGridSelectionChange })}
					freezeColumns={freezeColumns} // Use calculated freeze columns count
					{...(onRowAppended ? { onRowAppended } : {})}
					onColumnMoved={onColumnMoved} // Use Streamlit-style column reordering
					{...(readOnly ? {} : { onCellEdited })}
					onItemHovered={handleItemHovered}
					{...(rowMarkers !== undefined
						? {
								rowMarkers:
									rowMarkers === 'selection'
										? 'checkbox'
										: (rowMarkers as
												| 'checkbox'
												| 'number'
												| 'clickable-number'
												| 'checkbox-visible'
												| 'both'
												| 'none'
												| {
														kind:
															| 'checkbox'
															| 'number'
															| 'clickable-number'
															| 'checkbox-visible'
															| 'both'
															| 'none'
														checkboxStyle?: 'circle' | 'square'
														startIndex?: number
														width?: number
														theme?: Partial<Theme>
												  }),
							}
						: {})}
					columnSelect="none"
					fillHandle={!readOnly}
					getCellsForSelection={true}
					headerHeight={headerHeight}
					onHeaderMenuClick={(colIdx, bounds) => {
						const col = orderedColumns[colIdx]
						if (col) {
							onHeaderMenuClick?.(col, bounds)
						}
					}}
					onSearchClose={onSearchClose}
					onSearchValueChange={onSearchValueChange}
					ref={dataEditorRef}
					rowHeight={rowHeight}
					rowSelect={readOnly ? 'none' : 'multi'}
					rowSelectionMode={readOnly ? 'auto' : 'multi'}
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
			</Resizable>
		</div>
	)
}
