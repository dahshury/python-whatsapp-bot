import { i18n } from "@shared/libs/i18n";
import { getSlotTimes } from "@/shared/libs/calendar/calendar-config";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";

export function getDataTableColumns(
  isLocalized: boolean,
  selectedDateRange?: { start: string; end?: string } | null,
  freeRoam?: boolean
): IColumnDefinition[] {
  const t = (key: string) => i18n.getMessage(key, isLocalized);

  const startStr = selectedDateRange?.start;
  const hasTime = !!startStr && startStr.includes("T");
  const defaultDateTimeValue = (() => {
    if (!startStr) {
      return;
    }
    try {
      if (hasTime) {
        return startStr;
      }
      const base = new Date(`${startStr}T00:00:00`);
      if (Number.isNaN(base.getTime())) {
        return;
      }
      const { slotMinTime } = getSlotTimes(base, !!freeRoam, "");
      const DEFAULT_HOUR = 11;
      const [h, m] = String(slotMinTime || "11:00:00")
        .split(":")
        .map((v) => Number.parseInt(v, 10));
      const hh = String(Number.isFinite(h) ? h : DEFAULT_HOUR).padStart(2, "0");
      const mm = String(Number.isFinite(m) ? m : 0).padStart(2, "0");
      return `${startStr}T${hh}:${mm}`;
    } catch {
      return;
    }
  })();

  const columns: IColumnDefinition[] = [
    {
      id: "scheduled_time",
      name: "scheduled_time",
      title: t("field_time_scheduled"),
      dataType: ColumnDataType.DATETIME,
      isEditable: true,
      isRequired: true,
      defaultValue: defaultDateTimeValue,
      width: 170,
      metadata: { freeRoam: !!freeRoam },
    },
    {
      id: "phone",
      name: "phone",
      title: t("field_phone"),
      dataType: ColumnDataType.PHONE,
      isEditable: true,
      isRequired: true,
      defaultValue: "",
      width: 150,
    },
    {
      id: "type",
      name: "type",
      title: t("field_type"),
      dataType: ColumnDataType.DROPDOWN,
      isEditable: true,
      isRequired: true,
      metadata: {
        options: [
          i18n.getMessage("appt_checkup", isLocalized),
          i18n.getMessage("appt_followup", isLocalized),
        ],
      },
      width: 100,
    },
    {
      id: "name",
      name: "name",
      title: t("field_name"),
      dataType: ColumnDataType.TEXT,
      isEditable: true,
      isRequired: true,
      width: 150,
    },
  ];

  return columns;
}

export function getColumnNamesForParsing(): string[] {
  return ["scheduled_time", "phone", "type", "name"];
}

export function getValidationColumns(_isLocalized?: boolean) {
  return [
    { name: "phone", required: true },
    { name: "name", required: true },
    { name: "scheduled_time", required: true },
    { name: "type", required: true },
  ];
}
