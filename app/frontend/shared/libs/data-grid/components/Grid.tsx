// biome-ignore lint/style/useFilenamingConvention: PascalCase filename kept for public API compatibility
import type {
	DataEditorRef,
	DrawHeaderCallback,
	EditableGridCell,
	GridColumn,
	Item,
	Theme,
} from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import { useCustomerData } from "@shared/libs/data/customer-data-context";
import { headerIcons } from "@shared/libs/data-grid/constants/header-icons";
import { createOnRowAppended } from "@shared/libs/data-grid/handlers/on-row-appended";
import { useContainerMeasurement } from "@shared/libs/data-grid/hooks/use-container-measurement";
import { useDeleteRows } from "@shared/libs/data-grid/hooks/use-delete-rows";
import { useGridCellContent } from "@shared/libs/data-grid/hooks/use-grid-cell-content";
import { useGridOnCellEdited } from "@shared/libs/data-grid/hooks/use-grid-on-cell-edited";
import { useGridRefreshFacade } from "@shared/libs/data-grid/hooks/use-grid-refresh-facade";
import { useGridWidth } from "@shared/libs/data-grid/hooks/use-grid-width";
// DOC_EVENTS imported where needed by hooks
import { useHeaderMenuClick } from "@shared/libs/data-grid/hooks/use-header-menu-click";
import { useOverlayPosition } from "@shared/libs/data-grid/hooks/use-overlay-position";
import { usePersistenceBootstrap } from "@shared/libs/data-grid/hooks/use-persistence-bootstrap";
import { useReadyNotifier } from "@shared/libs/data-grid/hooks/use-ready-notifier";
import { useRowCountSync } from "@shared/libs/data-grid/hooks/use-row-count-sync";
import type { ColumnConfig } from "@shared/libs/data-grid/types/column-config";
import { clearSelection as clearSelectionUtil } from "@shared/libs/data-grid/utils/selection";
import { createGridHoverHandler } from "@shared/libs/data-grid/utils/tooltip/hover-handlers";
import { useDataProviderReady } from "@widgets/documents/hooks/use-data-provider-ready";
import { useDocumentsGridAutofill } from "@widgets/documents/hooks/use-documents-grid-autofill";
import React from "react";
import { useFullscreenSyncLegacy } from "../hooks/use-fullscreen-sync-legacy";
import { getPinnedColumnsFromConfig } from "../utils/columns/pinned-columns";
import { resolveGridTheme } from "../utils/theme-utils";
import { useFullscreen } from "./contexts/fullscreen-context";
import {
	GridPortalProvider,
	useGridPortal,
} from "./contexts/grid-portal-context";
import { InMemoryDataSource } from "./core/data-sources/in-memory-data-source";
import type { IDataSource } from "./core/interfaces/i-data-source";
import { GridView } from "./grid-view";
import { useColumnHide } from "./hooks/use-column-hide";
import { useColumnMenu } from "./hooks/use-column-menu";
import { useColumnOperations } from "./hooks/use-column-operations";
import { useGridActions } from "./hooks/use-grid-actions";
import { useGridColumns } from "./hooks/use-grid-columns";
import { useGridDataOperations } from "./hooks/use-grid-data-operations";
import { useGridEvents } from "./hooks/use-grid-events";
import { useGridLifecycle } from "./hooks/use-grid-lifecycle";
import { useGridPersistence } from "./hooks/use-grid-persistence";
import { useGridState } from "./hooks/use-grid-state";
import { useGridTheme } from "./hooks/use-grid-theme";
import { useGridTooltips } from "./hooks/use-grid-tooltips";
import { useModularGridData } from "./hooks/use-modular-grid-data";
import { useUndoRedo } from "./hooks/use-undo-redo";
import { ColumnMenuAdapter } from "./menus/column-menu-adapter";
import { FullscreenWrapper } from "./ui/fullscreen-wrapper";
import { getGridContainerProps } from "./ui/grid-container";
import { GridDataEditor } from "./ui/grid-data-editor";
import { GridThemeToggle } from "./ui/grid-theme-toggle";
import { GridToolbarPortal } from "./ui/grid-toolbar-portal";
import { GridTooltipFloat } from "./ui/grid-tooltip-float";
import { getSearchProps } from "./utils/search-props";

// Declare regex literals at top level for performance
const NON_DIGITS_REGEX = /[^\d]/g;
const LEADING_PLUS_REGEX = /^\+/;

function normalizePhone(value: string | undefined | null): string {
	if (!value) {
		return "";
	}
	const source = String(value).trim();
	if (source.startsWith("+")) {
		const digits = source
			.replace(NON_DIGITS_REGEX, "")
			.replace(LEADING_PLUS_REGEX, "");
		return `+${digits}`;
	}
	return source.replace(NON_DIGITS_REGEX, "");
}

function findCustomerByPhone(
	customers: Array<{ id?: string; phone?: string; name?: string | null }>,
	normalizedPhone: string
) {
	for (const customer of customers) {
		const candidate = normalizePhone(customer.phone || customer.id || "");
		if (!candidate) {
			continue;
		}
		if (
			candidate === normalizedPhone ||
			candidate.endsWith(normalizedPhone) ||
			normalizedPhone.endsWith(candidate)
		) {
			return customer;
		}
	}
	return undefined as unknown as (typeof customers)[number] | undefined;
}

// Constants for default data source dimensions
const DEFAULT_INMEMORY_ROWS = 8;
const DEFAULT_INMEMORY_COLS = 6;

// Column configuration interface moved to shared types

/**
 * Helper: Get optional GridDataEditor props based on current settings
 */
function getOptionalDataEditorPropsForGrid(props: {
	gridWidth?: number;
	containerWidth?: number;
	hideOuterFrame?: boolean;
	hideHeaders?: boolean;
	rowHeight?: number;
	headerHeight?: number;
	rowMarkers?: unknown;
	disableTrailingRow?: boolean;
	readOnly?: boolean;
	documentsDrawHeader?: DrawHeaderCallback;
	hoverRow?: number;
}): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	// Add dimension props
	if (props.gridWidth !== undefined) {
		result.gridWidth = props.gridWidth;
	}
	if (props.containerWidth !== undefined) {
		result.containerWidth = props.containerWidth;
	}

	// Add frame and header props
	if (props.hideOuterFrame) {
		result.hideOuterFrame = true;
	}
	if (props.hideHeaders) {
		result.headerHeight = 0 as unknown as number;
	}

	// Add dimension overrides
	if (typeof props.rowHeight === "number") {
		result.rowHeightOverride = props.rowHeight;
	}
	if (typeof props.headerHeight === "number") {
		result.headerHeightOverride = props.headerHeight;
	}

	// Add row and render props
	if (props.rowMarkers) {
		result.rowMarkers = props.rowMarkers;
	}
	if (props.disableTrailingRow) {
		result.disableTrailingRow = true;
	}
	if (typeof props.readOnly === "boolean") {
		result.readOnly = props.readOnly;
	}

	// Add header renderer
	if (props.documentsDrawHeader) {
		result.drawHeader = props.documentsDrawHeader;
	}

	// Add hover state
	if (props.hoverRow !== undefined) {
		result.hoverRow = props.hoverRow;
	}

	return result;
}

/**
 * Helper: Get cell editor onItemHovered handler
 */
function getItemHoveredHandlerForGrid(
	disableTooltips: boolean,
	handleItemHovered: (args: {
		kind: "header" | "cell";
		location?: [number, number];
		bounds?: { x: number; y: number; width: number; height: number };
	}) => void
): (args: {
	location: [number, number];
	item: Item;
	bounds?: { x: number; y: number; width: number; height: number };
}) => void {
	if (disableTooltips) {
		return () => {
			// Tooltips disabled - no-op
		};
	}
	return (args: {
		location: [number, number];
		item: Item;
		bounds?: { x: number; y: number; width: number; height: number };
	}) =>
		handleItemHovered({
			kind: "cell" as const,
			location: args.location,
			...(args.bounds && { bounds: args.bounds }),
		});
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
	// New: when true, hide outer frame around grid (no border/background)
	hideOuterFrame,
	// Documents page specific tweaks (scoped behavior)
	documentsGrid,
}: {
	showThemeToggle?: boolean;
	fullWidth?: boolean;
	theme?: Partial<Theme>;
	isDarkMode?: boolean;
	dataSource?: IDataSource;
	onReady?: () => void;
	onDataProviderReady?: (provider: unknown) => void;
	dataEditorRef?: React.RefObject<DataEditorRef | null>;
	validationErrors?: Array<{
		row: number;
		col: number;
		message: string;
		fieldName?: string;
	}>;
	onAppendRow?: () => void;
	hideToolbar?: boolean;
	hideHeaders?: boolean;
	className?: string;
	loading?: boolean;
	rowHeight?: number;
	headerHeight?: number;
	hideAppendRowPlaceholder?: boolean;
	rowMarkers?:
		| "none"
		| "both"
		| "number"
		| "checkbox"
		| "checkbox-visible"
		| "clickable-number"
		| "selection";
	disableTrailingRow?: boolean;
	onAddRowOverride?: () => void;
	readOnly?: boolean;
	disableTooltips?: boolean;
	// New: when true, hide outer frame around grid (no border/background)
	hideOuterFrame?: boolean;
	/** Enable scoped behavior for the documents page grid only */
	documentsGrid?: boolean;
} = {}) {
	// Ensure boolean values have defaults
	const shouldDisableTooltips: boolean = disableTooltips === true;

	// Initialize the data source - use external if provided, otherwise create default
	const dataSource = React.useMemo(() => {
		const result =
			externalDataSource ||
			new InMemoryDataSource(DEFAULT_INMEMORY_ROWS, DEFAULT_INMEMORY_COLS);
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

	// Resolve theme and icon color using utility
	const { theme, isUsingExternalTheme, actualIconColor } = resolveGridTheme(
		externalTheme as Partial<Theme> | undefined,
		isDarkMode,
		(internalTheme || {}) as Theme,
		iconColor
	);

	const { isFullscreen, toggleFullscreen } = useFullscreen();
	const { customers } = useCustomerData();
	const [gridKey, setGridKey] = React.useState(0); // Force re-render after loading state
	const [isStateLoaded, setIsStateLoaded] = React.useState(false);
	const [isInitializing, setIsInitializing] = React.useState(true);
	const [isDataReady, setIsDataReady] = React.useState(false);

	// Container width measurement (throttled, non-remounting)
	const { containerRef, containerWidth } = useContainerMeasurement({
		throttleMs: 50,
		minDelta: 2,
	});

	// measurement handled by hook

	// Reset toolbar hover state when fullscreen changes
	React.useEffect(() => {
		// Intentionally empty - this effect is for side effect tracking only
	}, []);

	// Avoid remounting on width changes; DataEditor handles resize smoothly
	React.useEffect(() => {
		// no-op
	}, []);

	// Sync legacy grid state with new fullscreen context
	useFullscreenSyncLegacy({
		isFullscreen,
		setIsFullscreen: gs.setIsFullscreen,
	});

	// Extract pinned columns from configuration mapping (legacy numeric keys only)
	const pinnedColumns = React.useMemo(
		() => getPinnedColumnsFromConfig(columnConfigMapping),
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
	} = useGridColumns(gs.hiddenColumns, dataSource, fullWidth, pinnedColumns);

	const columnMenu = useColumnMenu();

	// Use the new modular data system
	const gridDataConfig = {
		dataSource,
		visibleColumnIndices,
		theme,
		darkTheme,
		columnFormats: columnMenu.columnFormats,
	};
	const {
		getCellContent: modularGetCellContent,
		onCellEdited: baseOnCellEdited,
		getRawCellContent,
		dataProvider,
	} = useModularGridData(
		gridDataConfig as Parameters<typeof useModularGridData>[0]
	);

	// Documents grid autofill handler (domain-specific). Instantiate after filteredRows is defined.

	// Call onDataProviderReady when data provider is ready
	useDataProviderReady(dataProvider, onDataProviderReady);

	// Get the editing state reference after dataProvider is created
	const editingState = React.useMemo(
		() => dataProvider.getEditingState(),
		[dataProvider]
	);

	// Integrate state persistence using localStorage
	const persistenceConfig = {
		editingState,
		columnsState,
		setColumns,
		hiddenColumns: gs.hiddenColumns,
		setHiddenColumns: gs.setHiddenColumns,
		isInitializing,
	};
	const { saveState, loadState } = useGridPersistence(
		persistenceConfig as Parameters<typeof useGridPersistence>[0]
	);

	// Check if there's persisted state - but only use it if no external dataSource is provided
	const hasPersistedState = React.useMemo(() => {
		// Don't use persisted state if we have an external dataSource
		if (externalDataSource) {
			return false;
		}
		return localStorage.getItem("gridState") !== null;
	}, [externalDataSource]);

	// Persistence bootstrap
	const __persist = usePersistenceBootstrap({
		columnsStateLength: columnsState.length,
		hasPersistedState,
		externalDataSource,
		loadState,
		dataProvider,
	});
	React.useEffect(() => {
		if (__persist.gridKey !== gridKey) {
			setGridKey(__persist.gridKey);
		}
		if (__persist.isStateLoaded !== isStateLoaded) {
			setIsStateLoaded(__persist.isStateLoaded);
		}
		if (__persist.isInitializing !== isInitializing) {
			setIsInitializing(__persist.isInitializing);
		}
		if (__persist.isDataReady !== isDataReady) {
			setIsDataReady(__persist.isDataReady);
		}
	}, [__persist, gridKey, isStateLoaded, isInitializing, isDataReady]);

	// Call onReady callback when grid is fully ready
	useReadyNotifier(isDataReady, isInitializing, onReady);

	// Update the grid state to use data source row count
	useRowCountSync(gs.setNumRows, dataSource.rowCount);

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

	// Documents grid autofill handler (domain-specific)
	const defaultDocAuto = useDocumentsGridAutofill();
	const docAuto = {
		...defaultDocAuto,
		handlePhoneEdited: ({
			displayRow,
			phoneValue,
			customers: customerList,
		}: {
			displayRow: number;
			phoneValue: string;
			customers: Array<{ id?: string; phone?: string; name?: string | null }>;
		}) => {
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.("[Grid] docAuto.handlePhoneEdited", {
				displayRow,
				phoneValue,
				customersCount: Array.isArray(customerList) ? customerList.length : 0,
				filteredRows,
				displayColumns: (displayColumns || []).map(
					(c) => (c as { id?: string }).id
				),
			});
			// Map display row to base row using current filters
			const baseRow = filteredRows?.[displayRow] ?? displayRow;

			// Resolve column index for name by id
			const nameColIndex = displayColumns.findIndex(
				(c) => (c as { id?: string }).id === "name"
			);
			if (nameColIndex < 0) {
				return;
			}

			const normalizedInput = normalizePhone(phoneValue);
			if (!normalizedInput) {
				return;
			}

			// Find best match customer by phone (supports customer.id fallback)
			const matched = findCustomerByPhone(customerList, normalizedInput);
			if (!matched) {
				// biome-ignore lint/suspicious/noConsole: DEBUG
				globalThis.console?.log?.(
					"[Grid] docAuto.handlePhoneEdited: no customer match",
					{ normalizedInput }
				);
				return;
			}

			const nextName = (matched.name || "").trim();
			if (!nextName) {
				return;
			}

			// Build a Text cell for name column
			const nextCell: EditableGridCell = {
				kind: GridCellKind.Text,
				data: nextName,
				displayData: nextName,
				allowOverlay: true,
			} as unknown as EditableGridCell;

			// Apply the edit through the same editing pipeline used by the grid
			(undoOnCellEdited as unknown as (cell: Item, newVal: unknown) => void)(
				[nameColIndex, displayRow] as unknown as Item,
				nextCell
			);

			// Also set the underlying data provider to reflect base row change immediately
			dataProvider.setCell(nameColIndex, baseRow, {
				kind: GridCellKind.Text,
				data: nextName,
				displayData: nextName,
				allowOverlay: true,
			} as unknown as EditableGridCell);
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.(
				"[Grid] docAuto.handlePhoneEdited: applied name cell",
				{
					baseRow,
					displayRow,
					nameColIndex,
					nextName,
				}
			);
		},
	};

	const internalDataEditorRef = React.useRef<DataEditorRef>(null);
	const dataEditorRef = externalDataEditorRef || internalDataEditorRef;

	// Provide refresh facade that wires geometry and format-change redraws
	useGridRefreshFacade({
		displayColumns: displayColumns as unknown as unknown[],
		filteredRowCount,
		isDataReady,
		isInitializing,
		dataEditorRef,
		columnFormats: columnMenu.columnFormats as unknown as Record<
			string,
			string | undefined
		>,
	});

	// Track absolute top-right position for toolbar overlay using viewport coords
	const overlayPosition = useOverlayPosition({ containerRef, isFullscreen });

	// Redraw behavior handled by useGridRefreshFacade

	const getCellContent = useGridCellContent({
		loading: Boolean(loading),
		isDataReady,
		columnsStateLength: columnsState.length,
		displayColumns: displayColumns as unknown as Array<{
			width?: number;
			sticky?: boolean;
			id?: string;
		}>,
		theme,
		darkTheme,
		baseGetCellContent: modularGetCellContent,
		filteredRows,
		// Center all cell content for Documents Grid
		...(documentsGrid ? { contentAlign: "center" as const } : {}),
	});

	const onCellEdited = useGridOnCellEdited({
		filteredRows,
		displayColumns: displayColumns as unknown as GridColumn[],
		baseOnCellEdited: baseOnCellEdited as unknown as (
			rowsMapping: number[]
		) => (cell: [number, number], newVal: EditableGridCell) => void,
		saveState,
		externalDataSource,
		documentsGrid: Boolean(documentsGrid),
		docAuto,
		customers,
	});

	const {
		undo,
		redo,
		canUndo,
		canRedo,
		onCellEdited: undoOnCellEdited,
		onGridSelectionChange,
	} = useUndoRedo(dataEditorRef, getCellContent, onCellEdited, gs.setSelection);

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

	const getBoundsForCell = React.useCallback(
		(col: number, row: number) => {
			if (!dataEditorRef.current) {
				return;
			}
			const api = dataEditorRef.current as unknown as {
				getBounds?: (
					c: number,
					r: number
				) => { x: number; y: number; width: number; height: number };
			};
			return api.getBounds ? api.getBounds(col, row) : undefined;
		},
		[dataEditorRef]
	);

	const {
		tooltip,
		clearTooltip: _clearTooltip,
		onItemHovered: onTooltipHover,
	} = useGridTooltips(
		(cell) => getCellContent(cell) as unknown,
		displayColumns.map((dc) => {
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
		validationErrors,
		getBoundsForCell
	);

	useGridEvents(gs.setShowSearch);
	useGridLifecycle(isFullscreen, gs.showColumnMenu, gs.setShowColumnMenu);

	const handleHide = useColumnHide(
		columns as Array<{ id: string }>,
		gs.setHiddenColumns
	);

	const clearSelection = React.useCallback(() => clearSelectionUtil(gs), [gs]);

	const deleteRows = useDeleteRows({
		gs,
		filteredRows,
		dataProvider,
		externalDataSource,
		saveState,
		clearSelection,
	});

	const handleItemHovered = React.useMemo(
		() =>
			createGridHoverHandler(
				gs,
				onTooltipHover,
				dataEditorRef as unknown as React.RefObject<{
					getBounds?: (
						c: number,
						r: number
					) =>
						| { x: number; y: number; width: number; height: number }
						| undefined;
				} | null>
			),
		[gs, onTooltipHover, dataEditorRef]
	);

	const handleHeaderMenuClick = useHeaderMenuClick({ columnMenu });

	const { handleAutosize, handlePin, handleUnpin } = useColumnOperations({
		columns,
		displayColumns,
		visibleColumnIndices,
		filteredRows,
		getRawCellContent,
		getCellContent, // Pass formatted cell content for autosize
		setColumns,
		columnConfigMapping: columnConfigMapping as unknown as Map<string, unknown>,
		setColumnConfigMapping: (m: Map<string, unknown>) =>
			setColumnConfigMapping(m as unknown as Map<string, ColumnConfig>),
		clearSelection,
		dataEditorRef,
	});

	const gridWidth = useGridWidth({
		isFullscreen,
		fullWidth: Boolean(fullWidth),
		...(containerWidth !== undefined ? { containerWidth } : {}),
		displayColumns: displayColumns as unknown as Array<{ width?: number }>,
	});

	// Header icons come from shared constants

	// Always call hooks before any conditional logic
	const globalPortalContainer = useGridPortal();

	// Always render the grid; cells will render as LoadingCell while not ready

	// Documents grid: center header titles via custom drawHeader
	const documentsDrawHeader: DrawHeaderCallback | undefined = documentsGrid
		? ({ ctx, theme: hdrTheme, rect, column }) => {
				const { x, y, width, height } = rect;
				ctx.save();
				try {
					ctx.fillStyle = String((hdrTheme as Theme).textHeader);
					const headerFontFull = `${(hdrTheme as Theme).headerFontStyle} ${(hdrTheme as Theme).fontFamily}`;
					ctx.font = headerFontFull;
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(
						(column as { title?: string }).title || "",
						x + width / 2,
						y + height / 2
					);
				} finally {
					ctx.restore();
				}
				return true;
			}
		: undefined;

	const getWillChangeStyle = (): "width" | "auto" | undefined => {
		if (!fullWidth) {
			return;
		}
		return containerWidth ? "width" : "auto";
	};

	const { wrapperClass } = getGridContainerProps(
		isFullscreen,
		Boolean(fullWidth),
		className
	);

	// Helper: Render theme toggle if conditions are met
	const renderThemeToggle = () => {
		if (
			hideToolbar ||
			isFullscreen ||
			!showThemeToggle ||
			isUsingExternalTheme
		) {
			return null;
		}
		return (
			<GridThemeToggle
				currentTheme={theme}
				darkTheme={darkTheme}
				filteredRowCount={filteredRowCount}
				iconColor={actualIconColor}
				lightTheme={lightTheme}
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
		);
	};

	// Helper: Render toolbar portal if conditions are met
	const renderToolbarPortal = () => {
		if (hideToolbar || !globalPortalContainer) {
			return null;
		}
		return (
			<GridToolbarPortal
				canRedo={canRedo}
				canUndo={canUndo}
				container={globalPortalContainer}
				hasHiddenColumns={columns.length > displayColumns.length}
				hasSelection={actions.hasSelection}
				isFocused={gs.isFocused || isFullscreen}
				onAddRow={
					onAddRowOverride ||
					createOnRowAppended({
						...(typeof onAppendRow === "function" ? { onAppendRow } : {}),
						dataProvider: {
							addRow: async () => {
								await dataProvider.addRow();
							},
							deleteRow: async (row: number) => {
								await dataProvider.deleteRow(row);
							},
							getColumnCount: () => dataProvider.getColumnCount(),
						},
						dataSource,
						gs,
						getRawCellContent,
						saveState,
						externalDataSource,
					})
				}
				onClearSelection={clearSelection}
				onDeleteRows={deleteRows}
				onDownloadCsv={actions.handleDownloadCsv}
				onRedo={redo}
				onToggleColumnVisibility={actions.handleToggleColumnVisibility}
				onToggleFullscreen={toggleFullscreen}
				onToggleSearch={() => gs.setShowSearch((v) => !v)}
				onUndo={undo}
				overlay={true}
				overlayPosition={overlayPosition}
			/>
		);
	};

	// Helper: Get onRowAppended handler or undefined
	const getOnRowAppendedHandler = (): (() => void) | undefined => {
		if (disableTrailingRow) {
			return;
		}
		const handler = createOnRowAppended({
			...(typeof onAppendRow === "function" ? { onAppendRow } : {}),
			dataProvider: {
				addRow: async () => {
					await dataProvider.addRow();
				},
				deleteRow: async (row: number) => {
					await dataProvider.deleteRow(row);
				},
				getColumnCount: () => dataProvider.getColumnCount(),
			},
			dataSource,
			gs,
			getRawCellContent,
			saveState,
			externalDataSource,
		});
		// Return as void function (ignoring the boolean return)
		return (() => {
			handler();
		}) as () => void;
	};

	return (
		<FullscreenWrapper darkTheme={darkTheme} theme={theme}>
			<GridPortalProvider>
				<GridView wrapperClass={wrapperClass}>
					{/* Theme Toggle */}
					{renderThemeToggle()}

					{/* Toolbar Portal */}
					{renderToolbarPortal()}

					{/* Data Editor */}
					<div
						className={`glide-grid-inner ${fullWidth || isFullscreen ? "glide-grid-inner-full" : "glide-grid-inner-fit"}`}
						data-container-width={containerWidth}
						data-fullwidth={fullWidth}
						ref={containerRef}
						style={{
							willChange: getWillChangeStyle(),
							margin: 0,
							padding: 0,
						}}
					>
						{/* Build editor props separately to avoid type issues with exactOptionalPropertyTypes */}
						{(() => {
							const onRowAppendedHandler = getOnRowAppendedHandler();
							const editorProps: Parameters<typeof GridDataEditor>[0] = {
								displayColumns,
								filteredRowCount,
								filteredRows,
								getCellContent,
								gridSelection: gs.selection,
								onCellEdited: (editorCell: Item, editorNewVal: unknown) =>
									(
										undoOnCellEdited as unknown as (
											cell: Item,
											newVal: unknown
										) => void
									)(editorCell, editorNewVal),
								onGridSelectionChange,
								onHeaderMenuClick: handleHeaderMenuClick,
								onItemHovered: getItemHoveredHandlerForGrid(
									shouldDisableTooltips,
									handleItemHovered
								),
								...(onRowAppendedHandler && {
									onRowAppended: onRowAppendedHandler,
								}),
								...getSearchProps(gs),
								clearSelection,
								columnConfigMapping,
								darkTheme,
								dataEditorRef,
								fullWidth,
								headerIcons,
								onColumnConfigChange: (mapping: Map<string, ColumnConfig>) => {
									setColumnConfigMapping(mapping);
								},
								onColumnResize,
								onMouseEnter: () => gs.setIsFocused(true),
								onMouseLeave: () => gs.setIsFocused(false),
								showAppendRowPlaceholder: !hideAppendRowPlaceholder,
								theme,
								...((getOptionalDataEditorPropsForGrid({
									...(gridWidth !== undefined && { gridWidth }),
									...(containerWidth !== undefined && { containerWidth }),
									...(hideOuterFrame !== undefined && { hideOuterFrame }),
									...(hideHeaders !== undefined && { hideHeaders }),
									...(rowHeight !== undefined && { rowHeight }),
									...(headerHeight !== undefined && { headerHeight }),
									...(rowMarkers !== undefined && { rowMarkers }),
									...(disableTrailingRow !== undefined && {
										disableTrailingRow,
									}),
									...(readOnly !== undefined && { readOnly }),
									...(documentsDrawHeader !== undefined && {
										documentsDrawHeader,
									}),
									...(gs.hoverRow !== undefined && { hoverRow: gs.hoverRow }),
								} as Parameters<typeof getOptionalDataEditorPropsForGrid>[0]) ??
									{}) as unknown as Record<string, unknown>),
							};
							return <GridDataEditor key={gridKey} {...editorProps} />;
						})()}
					</div>
				</GridView>

				{/* Floating tooltip above grid with Shadcn look (2s delayed by hook) */}
				{!shouldDisableTooltips && tooltip?.content && (
					<GridTooltipFloat
						content={tooltip?.content}
						visible={true}
						x={tooltip?.left || 0}
						y={tooltip?.top || 0}
						{...(tooltip?.fieldLabel && { fieldLabel: tooltip.fieldLabel })}
						{...(tooltip?.message && { message: tooltip.message })}
					/>
				)}

				{/* Column Menu */}
				{columnMenu.menuState.isOpen && columnMenu.menuState.column && (
					<ColumnMenuAdapter
						columnConfigMapping={columnConfigMapping}
						displayColumns={displayColumns as unknown as Array<{ id: string }>}
						isDarkTheme={
							isUsingExternalTheme ? isDarkMode : theme === darkTheme
						}
						menuState={columnMenu.menuState}
						onAutosize={handleAutosize}
						onChangeFormat={columnMenu.changeFormat}
						onClose={columnMenu.closeMenu}
						onHide={handleHide}
						onPin={handlePin}
						onSort={handleSort}
						onUnpin={handleUnpin}
						sortState={
							sortState as unknown as {
								columnId?: string;
								direction?: "asc" | "desc" | null;
							} | null
						}
					/>
				)}
			</GridPortalProvider>
		</FullscreenWrapper>
	);
}
