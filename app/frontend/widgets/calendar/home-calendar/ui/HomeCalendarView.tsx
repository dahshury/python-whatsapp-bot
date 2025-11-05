"use client";

import dynamic from "next/dynamic";
import { SidebarInset } from "@/shared/ui/sidebar";
import { CalendarContainer, CalendarSkeleton } from "../..";
import type { HomeCalendarControllerResult } from "../controller/useHomeCalendarController";

const DualCalendarComponent = dynamic(
  () =>
    import("@/widgets/calendar/DualCalendar").then((mod) => ({
      default: mod.DualCalendarComponent,
    })),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false,
  }
);

const CalendarMainContent = dynamic(
  () =>
    import("@/widgets/calendar/CalendarMainContent").then(
      (m) => m.CalendarMainContent
    ),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);

const CalendarDataTableEditorWrapper = dynamic(
  () =>
    import(
      "@/widgets/data-table-editor/calendar-data-table-editor-wrapper"
    ).then((m) => m.CalendarDataTableEditorWrapper),
  { ssr: false }
);

type HomeCalendarViewProps = {
  controller: HomeCalendarControllerResult;
};

export function HomeCalendarView({ controller }: HomeCalendarViewProps) {
  const {
    wrapperRef,
    calendarContainerProps,
    shouldRenderContent,
    showDualCalendar,
    dualCalendarConfig,
    singleCalendarProps,
    dataTableEditorProps,
    layout,
  } = controller;

  return (
    <SidebarInset className="overflow-hidden" style={{ height: "100%" }}>
      <div className={layout.contentWrapperClassName} ref={wrapperRef}>
        <CalendarContainer {...calendarContainerProps}>
          {shouldRenderContent && (
            <div className={layout.contentInnerClassName}>
              {showDualCalendar ? (
                <DualCalendarComponent
                  {...dualCalendarConfig.props}
                  ref={dualCalendarConfig.ref}
                />
              ) : (
                <CalendarMainContent {...singleCalendarProps} />
              )}

              <CalendarDataTableEditorWrapper {...dataTableEditorProps} />
            </div>
          )}
        </CalendarContainer>
      </div>
    </SidebarInset>
  );
}
