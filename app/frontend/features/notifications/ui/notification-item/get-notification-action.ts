import { i18n } from "@shared/libs/i18n";
import type { NotificationType } from "@/entities/notification/types";

export function getNotificationAction(
  type: NotificationType | string | undefined,
  isLocalized: boolean
): string {
  if (type === "conversation_new_message") {
    return i18n.getMessage("notification_sent_message", isLocalized);
  }
  if (type === "reservation_created") {
    return i18n.getMessage("notification_created_reservation", isLocalized);
  }
  if (type === "reservation_updated" || type === "reservation_reinstated") {
    return i18n.getMessage("notification_updated_reservation", isLocalized);
  }
  if (type === "reservation_cancelled") {
    return i18n.getMessage("notification_cancelled_reservation", isLocalized);
  }
  if (type === "vacation_period_updated") {
    return i18n.getMessage("notification_system_update", isLocalized);
  }
  return String(type || "");
}
