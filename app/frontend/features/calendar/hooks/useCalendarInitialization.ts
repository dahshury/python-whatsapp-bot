import { useCallback, useEffect, useState } from "react";
import type { CalendarCoreRef } from "@/features/calendar";

type UseCalendarInitializationProps = {
  calculateHeight: () => number | "auto";
  sidebarOpen?: boolean;
  refreshData: () => Promise<void>;
  calendarRef?: React.RefObject<CalendarCoreRef | null>;
};

const DEFAULT_CALENDAR_HEIGHT = 800;
const BLUR_ANIMATION_DELAY_MS = 300;
const SIZE_UPDATE_DELAY_MS = 50;

export function useCalendarInitialization({
  calculateHeight,
  sidebarOpen: _sidebarOpen,
  refreshData,
}: UseCalendarInitializationProps) {
  const [calendarHeight, setCalendarHeight] = useState<number | "auto">(
    DEFAULT_CALENDAR_HEIGHT
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Wrapper for refreshData that shows blur animation
  const handleRefreshWithBlur = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsRefreshing(false), BLUR_ANIMATION_DELAY_MS);
    }
  }, [refreshData]);

  // Vacation events are now managed through the main events array

  // Note: Conversations are already fetched by WebSocketDataProvider on mount
  // No need to fetch them again here

  // Set initial height and update on resize
  useEffect(() => {
    try {
      setCalendarHeight(calculateHeight());
    } catch {
      // Fallback to default height if calculation fails
      setCalendarHeight(DEFAULT_CALENDAR_HEIGHT);
    }
  }, [calculateHeight]);

  // Smooth updateSize handler called on container resize frames
  const handleUpdateSize = useCallback(
    (calendarRef: React.RefObject<CalendarCoreRef | null>) => {
      try {
        calendarRef.current?.updateSize();
      } catch {
        // Silently ignore if calendar API is not ready
      }
    },
    []
  );

  // Update calendar size when sidebar state changes
  useEffect(() => {
    // Small delay to allow CSS transition to start
    const timer = setTimeout(() => {
      try {
        setCalendarHeight(calculateHeight());
      } catch {
        // Fallback to default height if calculation fails
        setCalendarHeight(DEFAULT_CALENDAR_HEIGHT);
      }
    }, SIZE_UPDATE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [calculateHeight]);

  return {
    calendarHeight,
    isRefreshing,
    handleRefreshWithBlur,
    handleUpdateSize,
    setCalendarHeight,
  };
}
