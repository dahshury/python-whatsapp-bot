import { i18n } from "@/shared/libs/i18n";

/**
 * Helper function to translate day names
 */
export function translateDayName(
  dayName: string,
  isLocalized: boolean,
  isShort = false
) {
  const dayMap = {
    Monday: isShort ? "day_mon" : "day_monday",
    Tuesday: isShort ? "day_tue" : "day_tuesday",
    Wednesday: isShort ? "day_wed" : "day_wednesday",
    Thursday: isShort ? "day_thu" : "day_thursday",
    Friday: isShort ? "day_fri" : "day_friday",
    Saturday: isShort ? "day_sat" : "day_saturday",
    Sunday: isShort ? "day_sun" : "day_sunday",
    Mon: "day_mon",
    Tue: "day_tue",
    Wed: "day_wed",
    Thu: "day_thu",
    Fri: "day_fri",
    Sat: "day_sat",
    Sun: "day_sun",
  };

  const key = dayMap[dayName as keyof typeof dayMap];
  return key ? i18n.getMessage(key, isLocalized) : dayName;
}

/**
 * Get translated label for slot type
 */
export function getSlotTypeLabel(slotType: string, isLocalized: boolean) {
  switch (slotType) {
    case "regular":
      return i18n.getMessage("slot_regular", isLocalized);
    case "saturday":
      return i18n.getMessage("slot_saturday", isLocalized);
    case "ramadan":
      return i18n.getMessage("slot_ramadan", isLocalized);
    default:
      return i18n.getMessage("slot_unknown", isLocalized);
  }
}

/**
 * Translate funnel stage name
 */
export function translateFunnelStage(
  stage: string,
  isLocalized: boolean
): string {
  switch (stage.toLowerCase()) {
    case "conversations":
      return i18n.getMessage("funnel_conversations", isLocalized);
    case "made reservation":
      return i18n.getMessage("funnel_made_reservation", isLocalized);
    case "returned for another":
      return i18n.getMessage("funnel_returned_for_another", isLocalized);
    case "cancelled":
      return i18n.getMessage("funnel_cancelled", isLocalized);
    default:
      return stage;
  }
}

/**
 * Translate customer segment name
 */
export function translateCustomerSegment(
  segment: string,
  isLocalized: boolean
): string {
  switch (segment.toLowerCase()) {
    case "new (1 visit)":
      return i18n.getMessage("segment_new_1_visit", isLocalized);
    case "returning (2-5 visits)":
      return i18n.getMessage("segment_returning_2_5_visits", isLocalized);
    case "loyal (6+ visits)":
      return i18n.getMessage("segment_loyal_6_plus_visits", isLocalized);
    case "new customers":
      return i18n.getMessage("segment_new_customers", isLocalized);
    case "regular customers":
      return i18n.getMessage("segment_regular_customers", isLocalized);
    case "vip customers":
      return i18n.getMessage("segment_vip_customers", isLocalized);
    case "inactive customers":
      return i18n.getMessage("segment_inactive_customers", isLocalized);
    default:
      return segment;
  }
}
