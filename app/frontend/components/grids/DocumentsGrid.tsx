"use client";
import type { DataEditorRef, Theme } from "@glideapps/glide-data-grid";
import type { IDataSource } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import Grid from "@/components/glide_custom_cells/components/Grid";

interface DocumentsGridProps {
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
	showThemeToggle?: boolean;
	fullWidth?: boolean;
	hideToolbar?: boolean;
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
	// passthrough lifecycle hooks
	onReady?: () => void;
	onDataProviderReady?: (provider: unknown) => void;
	// allow override for row add behavior (used in documents minimal customer grid)
	onAddRowOverride?: () => void;
}

export default function DocumentsGrid({
	dataSource,
	dataEditorRef,
	loading,
	validationErrors,
	theme,
	isDarkMode,
	className,
	rowHeight,
	headerHeight,
	showThemeToggle,
	fullWidth,
	hideToolbar,
	hideAppendRowPlaceholder,
	rowMarkers,
	disableTrailingRow,
	onReady,
	onDataProviderReady,
	onAddRowOverride,
}: DocumentsGridProps) {
	return (
		<Grid
			{...(typeof showThemeToggle === "boolean"
				? { showThemeToggle }
				: { showThemeToggle: false })}
			{...(typeof fullWidth === "boolean"
				? { fullWidth }
				: { fullWidth: true })}
			{...(theme ? { theme } : {})}
			{...(typeof isDarkMode === "boolean" ? { isDarkMode } : {})}
			dataSource={dataSource}
			{...(dataEditorRef ? { dataEditorRef } : {})}
			{...(typeof loading !== "undefined" ? { loading } : {})}
			{...(validationErrors ? { validationErrors } : {})}
			{...(className ? { className } : {})}
			{...(onReady ? { onReady } : {})}
			{...(onDataProviderReady ? { onDataProviderReady } : {})}
			{...(onAddRowOverride ? { onAddRowOverride } : {})}
			{...(typeof hideToolbar === "boolean"
				? { hideToolbar }
				: { hideToolbar: false })}
			{...(typeof hideAppendRowPlaceholder === "boolean"
				? { hideAppendRowPlaceholder }
				: { hideAppendRowPlaceholder: true })}
			{...(rowMarkers ? { rowMarkers } : { rowMarkers: "none" as const })}
			{...(typeof disableTrailingRow === "boolean"
				? { disableTrailingRow }
				: { disableTrailingRow: true })}
			{...(typeof rowHeight === "number" ? { rowHeight } : {})}
			{...(typeof headerHeight === "number" ? { headerHeight } : {})}
		/>
	);
}
