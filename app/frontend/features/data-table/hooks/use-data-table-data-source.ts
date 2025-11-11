import { i18n } from "@shared/libs/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDataTableColumns } from "@/shared/libs/data-grid/components/core/column-presets/data-table-editor.columns";
import { createDataSourceMapper } from "@/shared/libs/data-grid/components/services/DataSourceMapper";
import type { CalendarEvent } from "@/widgets/data-table-editor/types";

const START_OF_DAY_HOUR = 0;
const START_OF_DAY_MINUTE = 0;
const START_OF_DAY_SECOND = 0;
const START_OF_DAY_MILLISECOND = 0;
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;

// Regex patterns for date parsing (top-level for performance)
const TIMEZONE_REGEX = /[+-]\d{2}:\d{2}$/;
const ISO_LOCAL_DATE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?$/;

type DateRange = { start: string; end: string };

/**
 * Parse a date string as local time instead of UTC.
 * When a date string like "2025-01-15T14:00:00" doesn't have timezone info,
 * JavaScript's Date constructor interprets it as UTC. This function parses it as local time.
 */
function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  const dateStr = String(dateInput);

  // If the string already has timezone info (Z or +/-), use standard Date parsing
  if (dateStr.includes("Z") || TIMEZONE_REGEX.test(dateStr)) {
    return new Date(dateStr);
  }

  // Parse as local time by manually extracting date parts
  // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm
  const match = dateStr.match(ISO_LOCAL_DATE_REGEX);
  if (match) {
    const [, year, month, day, hour, minute, second = "0", millisecond = "0"] =
      match;
    if (!(year && month && day && hour && minute)) {
      return new Date(dateStr);
    }
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1, // Month is 0-indexed
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10),
      Number.parseInt(millisecond, 10)
    );
  }

  // Fallback to standard Date parsing
  return new Date(dateStr);
}

type UseDataTableDataSourceParams = {
  events: CalendarEvent[];
  selectedDateRange: DateRange | null;
  slotDurationHours: number;
  freeRoam: boolean;
  open: boolean;
  isLocalized?: boolean;
};

export function useDataTableDataSource({
  events,
  selectedDateRange,
  slotDurationHours,
  freeRoam,
  open,
  isLocalized,
}: UseDataTableDataSourceParams) {
  const gridRowToEventMapRef = useRef<Map<number, CalendarEvent>>(new Map());
  const mapper = useMemo(() => createDataSourceMapper<CalendarEvent>(), []);

  const localized = isLocalized ?? false;

  const previousEventsRef = useRef<CalendarEvent[]>([]);
  const previousConfigRef = useRef<string>("");

  const buildDataSource = useCallback(
    (
      currentEvents: CalendarEvent[],
      currentSelectedDateRange: { start: string; end: string } | null
    ) => {
      const columns = getDataTableColumns(
        localized,
        currentSelectedDateRange,
        freeRoam
      );

      if (!currentSelectedDateRange || currentEvents.length === 0) {
        return mapper.mapToDataSource(
          [],
          columns,
          { getValue: () => null },
          { minRows: 1, createDefaultsForEmpty: true }
        );
      }

      const mappingConfig = {
        filter: (event: CalendarEvent) => {
          if (event.type === "conversation") {
            return false;
          }
          if (event.extendedProps?.cancelled && !freeRoam) {
            return false;
          }
          const eventStart = parseLocalDate(event.start);
          if (currentSelectedDateRange.start.includes("T")) {
            const rangeStart = parseLocalDate(currentSelectedDateRange.start);
            const rangeEnd = parseLocalDate(
              currentSelectedDateRange.end || currentSelectedDateRange.start
            );
            if (rangeStart.getTime() === rangeEnd.getTime()) {
              rangeEnd.setHours(rangeEnd.getHours() + slotDurationHours);
            }
            return eventStart >= rangeStart && eventStart < rangeEnd;
          }
          const rangeStartDay = parseLocalDate(currentSelectedDateRange.start);
          rangeStartDay.setHours(
            START_OF_DAY_HOUR,
            START_OF_DAY_MINUTE,
            START_OF_DAY_SECOND,
            START_OF_DAY_MILLISECOND
          );
          let rangeEndDay: Date;
          if (
            currentSelectedDateRange.end &&
            currentSelectedDateRange.end !== currentSelectedDateRange.start
          ) {
            rangeEndDay = parseLocalDate(currentSelectedDateRange.end);
          } else {
            rangeEndDay = new Date(rangeStartDay.getTime());
          }
          rangeEndDay.setHours(
            END_OF_DAY_HOUR,
            END_OF_DAY_MINUTE,
            END_OF_DAY_SECOND,
            END_OF_DAY_MILLISECOND
          );
          return eventStart >= rangeStartDay && eventStart <= rangeEndDay;
        },
        sort: (a: CalendarEvent, b: CalendarEvent) => {
          const dateA = parseLocalDate(a.start);
          const dateB = parseLocalDate(b.start);
          return dateA.getTime() - dateB.getTime();
        },
        getValue: (event: CalendarEvent, columnId: string) => {
          const eventDate = parseLocalDate(event.start);
          const getPhoneFromExtendedProps = (
            extendedProps: unknown
          ): string => {
            if (!extendedProps || typeof extendedProps !== "object") {
              return "";
            }
            const obj = extendedProps as Record<string, unknown>;
            const val = obj.phone ?? obj.waId ?? obj.wa_id;
            return typeof val === "string" ? val : "";
          };
          let phoneNumber: string = getPhoneFromExtendedProps(
            event.extendedProps
          );
          if (
            phoneNumber &&
            typeof phoneNumber === "string" &&
            !phoneNumber.startsWith("+")
          ) {
            phoneNumber = `+${phoneNumber}`;
          }
          switch (columnId) {
            case "scheduled_time":
              return eventDate;
            case "phone":
              return phoneNumber;
            case "type": {
              const type = event.extendedProps?.type || 0;
              return type === 0
                ? i18n.getMessage("appt_checkup", localized)
                : i18n.getMessage("appt_followup", localized);
            }
            case "name":
              return event.title || event.extendedProps?.customerName || "";
            default:
              return null;
          }
        },
      };

      const newDataSource = mapper.mapToDataSource(
        currentEvents,
        columns,
        mappingConfig,
        {
          minRows: 1,
          createDefaultsForEmpty: true,
        }
      );

      const filteredEvents = currentEvents
        .filter(mappingConfig.filter)
        .sort(mappingConfig.sort);
      const newEventMap = new Map<number, CalendarEvent>();
      filteredEvents.forEach((ev, idx) => {
        newEventMap.set(idx, ev);
      });
      gridRowToEventMapRef.current = newEventMap;

      return newDataSource;
    },
    [mapper, localized, freeRoam, slotDurationHours]
  );

  const [dataSource, setDataSource] = useState<
    ReturnType<typeof mapper.mapToDataSource>
  >(() => buildDataSource(events, selectedDateRange));

  useEffect(() => {
    const configHash = JSON.stringify({
      selectedDateRange,
      slotDurationHours,
      freeRoam,
      isLocalized: localized,
      eventsLength: events.length,
    });

    const eventsChanged = !areEventsEqual(previousEventsRef.current, events);
    const configChanged = previousConfigRef.current !== configHash;

    if ((eventsChanged || configChanged) && open) {
      const ds = buildDataSource(events, selectedDateRange);
      setDataSource(ds);
      previousEventsRef.current = [...events];
      previousConfigRef.current = configHash;
    }
  }, [
    events,
    selectedDateRange,
    slotDurationHours,
    freeRoam,
    localized,
    open,
    buildDataSource,
  ]);

  useEffect(() => {
    if (!open) {
      previousEventsRef.current = [];
      previousConfigRef.current = "";
    }
  }, [open]);

  return {
    dataSource,
    gridRowToEventMapRef,
  };
}

// Deep comparison function for events to detect actual changes
function areEventsEqual(
  prev: CalendarEvent[],
  current: CalendarEvent[]
): boolean {
  if (prev.length !== current.length) {
    return false;
  }

  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = current[i];

    if (!(a && b)) {
      return false;
    }

    // Compare key properties that affect grid display
    if (
      a.id !== b.id ||
      a.title !== b.title ||
      a.start !== b.start ||
      a.end !== b.end ||
      a.type !== b.type
    ) {
      return false;
    }

    // Compare extended props that affect grid display
    const aExt = a.extendedProps || {};
    const bExt = b.extendedProps || {};

    if (
      aExt.customerName !== bExt.customerName ||
      aExt.phone !== bExt.phone ||
      aExt.waId !== bExt.waId ||
      aExt.type !== bExt.type ||
      aExt.cancelled !== bExt.cancelled ||
      aExt.reservationId !== bExt.reservationId
    ) {
      return false;
    }
  }

  return true;
}
