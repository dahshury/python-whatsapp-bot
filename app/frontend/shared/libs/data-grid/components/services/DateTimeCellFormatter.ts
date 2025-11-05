import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";
import { FormattingService } from "./FormattingService";

const TWO_DIGITS = 2;
const TWELVE_HOURS = 12;

type TempusData = {
  kind?: string;
  format?: "date" | "time" | "datetime" | string;
  date?: Date;
  displayDate?: string;
  isDarkTheme?: boolean;
};

type TimekeeperData = {
  kind?: string;
  time?: Date;
  displayTime?: string;
  isDarkTheme?: boolean;
  use24Hour?: boolean;
};

export function normalizeTempusDateCell(
  cell: GridCell,
  columnId?: string,
  columnFormats?: Record<string, string>
): GridCell {
  if (cell.kind !== GridCellKind.Custom) {
    return cell;
  }

  const data = (cell as GridCell & { data?: TempusData }).data;
  if (!data || data.kind !== "tempus-date-cell") {
    return cell;
  }

  const date = data.date;
  if (!(date instanceof Date)) {
    return cell;
  }

  let format: string | undefined;
  let columnType: "date" | "time" | "datetime";

  if (data.format === "date") {
    format = columnFormats?.[columnId || "date"] || columnFormats?.date;
    columnType = "date";
  } else if (data.format === "time") {
    format = columnFormats?.[columnId || "time"] || columnFormats?.time;
    columnType = "time";
  } else {
    format = columnFormats?.[columnId || "datetime"] || columnFormats?.datetime;
    columnType = "datetime";
  }

  let display = "";
  if (format) {
    display = FormattingService.formatValue(date, columnType, format);
  } else if (columnType === "date") {
    display = date.toLocaleDateString("en-GB");
  } else if (columnType === "time") {
    display = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    display = date.toLocaleString();
  }

  const newData: TempusData = {
    ...(data as object as TempusData),
    displayDate: display,
  };
  return { ...cell, data: newData, copyData: display } as unknown as GridCell;
}

export function normalizeTimekeeperCell(
  cell: GridCell,
  columnId?: string,
  columnFormats?: Record<string, string>
): GridCell {
  if (cell.kind !== GridCellKind.Custom) {
    return cell;
  }

  const data = (cell as GridCell & { data?: TimekeeperData }).data;
  if (!data || data.kind !== "timekeeper-cell") {
    return cell;
  }

  const time = data.time;
  if (!(time instanceof Date)) {
    return cell;
  }

  const format = columnFormats?.[columnId || "time"] || columnFormats?.time;

  let display = "";
  if (format) {
    display = FormattingService.formatValue(time, "time", format);
  } else {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const minutesStr = minutes.toString().padStart(TWO_DIGITS, "0");

    if (data.use24Hour) {
      display = `${hours.toString().padStart(TWO_DIGITS, "0")}:${minutesStr}`;
    } else {
      const isPM = hours >= TWELVE_HOURS;
      let displayHours = hours;
      if (hours === 0) {
        displayHours = TWELVE_HOURS;
      } else if (hours > TWELVE_HOURS) {
        displayHours = hours - TWELVE_HOURS;
      }
      display = `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
    }
  }

  const newData: TimekeeperData = {
    ...(data as object as TimekeeperData),
    displayTime: display,
  };
  return { ...cell, data: newData, copyData: display } as unknown as GridCell;
}
