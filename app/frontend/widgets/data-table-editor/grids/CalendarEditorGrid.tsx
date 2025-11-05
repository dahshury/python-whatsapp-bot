"use client";
import type { DataEditorRef, Theme } from "@glideapps/glide-data-grid";
import type { IDataSource } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import Grid from "@/shared/libs/data-grid/components/Grid";
import type { EditInterceptor } from "@/shared/libs/data-grid/core/services/runEditPipeline";

type CalendarEditorGridProps = {
  // Required inputs for the calendar editor use-case
  dataSource: IDataSource;
  dataEditorRef?: React.RefObject<DataEditorRef | null>;
  loading?: boolean;
  validationErrors?: Array<{
    row: number;
    col: number;
    message: string;
    fieldName?: string;
  }>;
  // Theme control (forwarded to base Grid)
  theme?: Partial<Theme>;
  isDarkMode?: boolean;
  // UI controls (forwarded)
  showThemeToggle?: boolean;
  fullWidth?: boolean;
  // Lifecyle hooks (forwarded)
  onReady?: () => void;
  onDataProviderReady?: (provider: unknown) => void;
  // Behavior customizations specific to calendar editor
  onAddRowOverride?: () => void;
  rowHeight?: number;
  headerHeight?: number;
  editInterceptors?: EditInterceptor[];
};

export default function CalendarEditorGrid(props: CalendarEditorGridProps) {
  const {
    dataSource,
    dataEditorRef,
    loading,
    validationErrors,
    theme,
    isDarkMode,
    showThemeToggle,
    fullWidth,
    onReady,
    onDataProviderReady,
    onAddRowOverride,
    rowHeight,
    headerHeight,
    editInterceptors,
  } = props;

  return (
    <Grid
      fullWidth={fullWidth ?? true}
      hideOuterFrame={true}
      showThemeToggle={showThemeToggle ?? false}
      {...(theme ? { theme } : {})}
      {...(typeof isDarkMode === "boolean" ? { isDarkMode } : {})}
      dataSource={dataSource}
      {...(dataEditorRef ? { dataEditorRef } : {})}
      {...(typeof loading !== "undefined" ? { loading } : {})}
      {...(validationErrors ? { validationErrors } : {})}
      {...(onReady ? { onReady } : {})}
      {...(onDataProviderReady ? { onDataProviderReady } : {})}
      {...(editInterceptors ? { editInterceptors } : {})}
      // Calendar editor requirements
      hideToolbar={false as unknown as boolean}
      rowMarkers="both"
      {...(onAddRowOverride ? { onAddRowOverride } : {})}
      {...(typeof rowHeight === "number" ? { rowHeight } : {})}
      {...(typeof headerHeight === "number" ? { headerHeight } : {})}
      disableTrailingRow={false}
      // Keep trailing row enabled for quick-add
      hideAppendRowPlaceholder={false as unknown as boolean}
    />
  );
}
