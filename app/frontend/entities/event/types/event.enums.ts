import type { CalendarEvent } from "./event.types";

export const EVENT_TYPE = {
  CheckUp: 0,
  FollowUp: 1,
  Conversation: 2,
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

export function isConversation(event: CalendarEvent | undefined): boolean {
  return (
    (event?.extendedProps?.type as number | undefined) ===
    EVENT_TYPE.Conversation
  );
}

export function isReservation(event: CalendarEvent | undefined): boolean {
  const t = event?.extendedProps?.type as number | undefined;
  return t !== EVENT_TYPE.Conversation;
}
