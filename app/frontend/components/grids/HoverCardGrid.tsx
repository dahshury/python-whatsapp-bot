"use client";
import type { DataEditorRef, Theme } from "@glideapps/glide-data-grid";
import type { IDataSource } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import Grid from "@/components/glide_custom_cells/components/Grid";

interface HoverCardGridProps {
	dataSource: IDataSource;
	dataEditorRef?: React.RefObject<DataEditorRef | null>;
	loading?: boolean;
	validationErrors?: Array<{
		row: number;
		col: number;
		message: string;
		fieldName?: string;
	}>;
	theme?: Partial<Theme>;
	isDarkMode?: boolean;
	className?: string;
	rowHeight?: number;
	headerHeight?: number;
	// passthrough hooks if needed
	onReady?: () => void;
	onDataProviderReady?: (provider: unknown) => void;
}

// Minimal Grid variant for use inside hover cards: no toolbar, no row markers
export default function HoverCardGrid({
	dataSource,
	dataEditorRef,
	loading,
	validationErrors,
	theme,
	isDarkMode,
	className,
	rowHeight = 24,
	headerHeight = 22,
	onReady,
	onDataProviderReady,
}: HoverCardGridProps) {
	return (
		<Grid
			showThemeToggle={false}
			fullWidth={true}
			{...(theme ? { theme } : {})}
			{...(typeof isDarkMode === "boolean" ? { isDarkMode } : {})}
			dataSource={dataSource}
			{...(dataEditorRef ? { dataEditorRef } : {})}
			{...(typeof loading !== "undefined" ? { loading } : {})}
			{...(validationErrors ? { validationErrors } : {})}
			{...(className ? { className } : {})}
			{...(onReady ? { onReady } : {})}
			{...(onDataProviderReady ? { onDataProviderReady } : {})}
			hideToolbar={true}
			hideAppendRowPlaceholder={true}
			rowMarkers="none"
			disableTrailingRow={true}
			{...(typeof rowHeight === "number" ? { rowHeight } : {})}
			{...(typeof headerHeight === "number" ? { headerHeight } : {})}
		/>
	);
}
