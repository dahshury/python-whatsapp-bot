export interface GridDimensions {
	width: number;
	height: number;
}

export interface GridPosition {
	col: number;
	row: number;
}

export interface GridSelection {
	rows: number[];
	columns: string[];
}

export interface GridState {
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
}

export interface GridThemeConfig {
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
}

export interface ColumnConfig {
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
}

export interface BaseColumnProps {
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
}

export interface TooltipData {
	content: string;
	position: { x: number; y: number };
	visible: boolean;
}

export interface BrowserCapabilities {
	isTouchDevice: boolean;
	hasCustomScrollbars: boolean;
	supportsFileSystemAPI: boolean;
	supportsResizeObserver: boolean;
}

export const LARGE_TABLE_ROWS_THRESHOLD = 150000;
export const DEBOUNCE_TIME_MS = 150;
export const WEBKIT_SCROLLBAR_SIZE = 6;

export enum PerformanceMode {
	NORMAL = "normal",
	OPTIMIZED = "optimized",
	HIGH_PERFORMANCE = "high_performance",
}
