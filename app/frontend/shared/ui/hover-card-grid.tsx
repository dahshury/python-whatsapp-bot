"use client";
import type { DataEditorRef, Theme } from "@glideapps/glide-data-grid";
import type { IDataSource } from "@/shared/libs/data-grid";
import { Grid } from "@/shared/libs/data-grid";

type HoverCardGridProps = {
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
};

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
			fullWidth={true}
			showThemeToggle={false}
			{...(theme ? { theme } : {})}
			{...(typeof isDarkMode === "boolean" ? { isDarkMode } : {})}
			dataSource={dataSource}
			{...(dataEditorRef ? { dataEditorRef } : {})}
			{...(typeof loading !== "undefined" ? { loading } : {})}
			{...(validationErrors ? { validationErrors } : {})}
			{...(className ? { className } : {})}
			{...(onReady ? { onReady } : {})}
			{...(onDataProviderReady ? { onDataProviderReady } : {})}
			disableTrailingRow={true}
			hideAppendRowPlaceholder={true as unknown as boolean}
			hideToolbar={true as unknown as boolean}
			rowMarkers="none"
			{...(typeof rowHeight === "number" ? { rowHeight } : {})}
			{...(typeof headerHeight === "number" ? { headerHeight } : {})}
		/>
	);
}
