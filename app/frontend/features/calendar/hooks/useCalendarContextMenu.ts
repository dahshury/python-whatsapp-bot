import { useCallback, useState } from "react";
import type { CalendarEvent } from "@/entities/event";

type ContextMenuPosition = {
  x: number;
  y: number;
};

export function useCalendarContextMenu() {
  const [contextMenuEvent, setContextMenuEvent] =
    useState<CalendarEvent | null>(null);
  const [contextMenuPosition, setContextMenuPosition] =
    useState<ContextMenuPosition | null>(null);

  const handleContextMenu = useCallback(
    (event: CalendarEvent, position: ContextMenuPosition) => {
      setContextMenuEvent(event);
      setContextMenuPosition(position);
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuEvent(null);
    setContextMenuPosition(null);
  }, []);

  return {
    contextMenuEvent,
    contextMenuPosition,
    handleContextMenu,
    handleCloseContextMenu,
  };
}
