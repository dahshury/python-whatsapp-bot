import type {
  DashboardConversationMessage,
  DashboardReservation,
} from "@/features/dashboard/types";
import { parseISO } from "@/shared/libs/date/parse";

export function getReservationDate(
  reservation: DashboardReservation
): Date | null {
  const iso = parseISO(reservation?.start);
  if (iso) {
    return iso;
  }
  const date = (reservation as DashboardReservation & { date?: string })?.date;
  const time =
    (
      reservation as DashboardReservation & {
        time_slot?: string;
        time?: string;
      }
    )?.time_slot ||
    (
      reservation as DashboardReservation & {
        time_slot?: string;
        time?: string;
      }
    )?.time;
  if (date && time) {
    return parseISO(`${date}T${time}`);
  }
  if (date) {
    return parseISO(`${date}T00:00:00`);
  }
  return null;
}

export function getMessageDate(
  message: DashboardConversationMessage
): Date | null {
  const iso = parseISO(
    message?.ts ||
      (message as DashboardConversationMessage & { datetime?: string })
        ?.datetime
  );
  if (iso) {
    return iso;
  }
  const date = (message as DashboardConversationMessage & { date?: string })
    ?.date;
  const time = (message as DashboardConversationMessage & { time?: string })
    ?.time;
  if (date && time) {
    return parseISO(`${date}T${time}`);
  }
  if (date) {
    return parseISO(`${date}T00:00:00`);
  }
  return null;
}

export function getMessageRole(message: DashboardConversationMessage): string {
  return (
    (message as DashboardConversationMessage & { role?: string }).role ||
    (message as DashboardConversationMessage & { sender?: string }).sender ||
    (message as DashboardConversationMessage & { author?: string }).author ||
    "user"
  ).toString();
}
