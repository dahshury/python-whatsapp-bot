"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useMemo } from "react";
import type { CalendarEvent } from "@/entities/event";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  filterEventsForDataTable,
  transformEventsForDataTable,
} from "@/features/calendar";
import { GridLoadingState } from "@/shared/libs/data-grid/components/ui/GridLoadingState";
import type { CalendarEvent as DataTableCalendarEvent } from "@/widgets/data-table-editor/types";

// Lazy load DataTableEditor to improve initial performance
const LazyDataTableEditor = dynamic(
  () =>
    import("@/widgets/data-table-editor/DataTableEditor").then((mod) => ({
      default: mod.DataTableEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <GridLoadingState
        height={180}
        loadingText="Loading editor..."
        showSkeleton={false}
      />
    ),
  }
);

const EXIT_ANIMATION_BUFFER_MS = 260;
const noopEventHandler = (_event: DataTableCalendarEvent): void => {
  // No-op: consumers can override to intercept calendar events.
};

export type CalendarDataTableEditorWrapperProps = {
  editorOpen: boolean;
  shouldLoadEditor: boolean;
  selectedDateRange: { start: string; end: string } | null;
  events: CalendarEvent[];
  freeRoam: boolean;
  calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
  isLocalized?: boolean;
  slotDurationHours: number;
  onOpenChange: (open: boolean) => void;
  onEventAdded: (event: DataTableCalendarEvent) => void;
  onEventModified: (eventId: string, event: DataTableCalendarEvent) => void;
  onEventCancelled: (eventId: string) => void;
  onSave: () => Promise<void>;
  closeEditor: () => void;
  setShouldLoadEditor: (load: boolean) => void;
};

export function CalendarDataTableEditorWrapper({
  editorOpen,
  shouldLoadEditor,
  selectedDateRange,
  events,
  freeRoam,
  calendarRef,
  isLocalized,
  slotDurationHours,
  onOpenChange,
  onEventAdded,
  onEventModified,
  onEventCancelled,
  onSave,
  closeEditor,
  setShouldLoadEditor,
}: CalendarDataTableEditorWrapperProps) {
  // Keep mounted briefly after close to allow exit animation
  const keepMounted = React.useRef(false);
  const [renderOpen, setRenderOpen] = React.useState(editorOpen);

  React.useEffect(() => {
    if (editorOpen) {
      keepMounted.current = true;
      setRenderOpen(true);
      return;
    }
    if (keepMounted.current) {
      // Delay unmount to let framer-motion exit run
      const t = setTimeout(() => {
        setRenderOpen(false);
        keepMounted.current = false;
      }, EXIT_ANIMATION_BUFFER_MS); // match DataTableEditor motion exit duration (~250ms)
      return () => clearTimeout(t);
    }
    setRenderOpen(false);
    return;
  }, [editorOpen]);
  // Always compute mapped events so the grid has data immediately on open
  const mappedEvents = useMemo(
    () =>
      transformEventsForDataTable(
        filterEventsForDataTable(events, "data-table", freeRoam)
      ),
    [events, freeRoam]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      // Ignore redundant updates to avoid render loops
      if (open === editorOpen) {
        return;
      }
      onOpenChange(open);
      if (!open) {
        setShouldLoadEditor(false);
      }
    },
    [editorOpen, onOpenChange, setShouldLoadEditor]
  );

  const handleSave = useCallback(async () => {
    await onSave();
    closeEditor();
  }, [onSave, closeEditor]);

  // Avoid mounting the heavy editor when completely unused
  if (!(renderOpen || shouldLoadEditor)) {
    return null;
  }

  return (
    <LazyDataTableEditor
      calendarRef={calendarRef || null}
      data={[]}
      events={mappedEvents}
      freeRoam={freeRoam}
      isLocalized={isLocalized ?? false}
      onEventAdded={onEventAdded}
      onEventCancelled={onEventCancelled}
      onEventClick={noopEventHandler}
      onEventModified={onEventModified}
      onOpenChange={handleOpenChange}
      onSave={handleSave}
      open={editorOpen}
      selectedDateRange={selectedDateRange}
      slotDurationHours={slotDurationHours}
    />
  );
}
