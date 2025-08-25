import type { IColumnDefinition } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";

export function getDataTableColumns(
  isRTL: boolean,
  selectedDateRange?: { start: string; end?: string } | null,
  freeRoam?: boolean,
): IColumnDefinition[] {
  const t = (en: string, ar: string) => (isRTL ? ar : en);

  // Derive defaults from the opened calendar slot/range
  const startStr = selectedDateRange?.start;
  const hasTime = !!startStr && startStr.includes("T");
  const defaultDateValue = startStr
    ? (hasTime ? startStr.split("T")[0] : startStr)
    : undefined;
  const defaultTimeValue = hasTime
    ? (() => {
        try {
          const d = new Date(startStr!);
          if (Number.isNaN(d.getTime())) return undefined;
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          return `${hh}:${mm}`;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const columns: IColumnDefinition[] = [
    {
      id: "date",
      name: "date",
      title: t("Date", "التاريخ"),
      dataType: ColumnDataType.DATE,
      isEditable: true,
      isRequired: true,
      // Default to the opened slot's day when available
      defaultValue: defaultDateValue,
      formatting: { pattern: "YYYY-MM-DD" },
      width: 130,
      metadata: { freeRoam: !!freeRoam },
    },
    {
      id: "time",
      name: "time",
      title: t("Time", "الوقت"),
      dataType: ColumnDataType.TIME,
      isEditable: true,
      isRequired: true,
      // In time grid views, default to the clicked slot time; otherwise empty
      defaultValue: defaultTimeValue,
      width: 110,
    },
    {
      id: "phone",
      name: "phone",
      title: t("Phone", "الهاتف"),
      dataType: ColumnDataType.PHONE,
      isEditable: true,
      isRequired: true,
      width: 140,
    },
    {
      id: "type",
      name: "type",
      title: t("Type", "النوع"),
      dataType: ColumnDataType.DROPDOWN,
      isEditable: true,
      isRequired: true,
      metadata: {
        options: isRTL ? ["كشف", "مراجعة"] : ["Check-up", "Follow-up"],
      },
      width: 140,
    },
    {
      id: "name",
      name: "name",
      title: t("Name", "الاسم"),
      dataType: ColumnDataType.TEXT,
      isEditable: true,
      isRequired: true,
      width: 220,
    },
  ];

  return columns;
}

export function getColumnNamesForParsing(): string[] {
  return ["date", "time", "phone", "type", "name"]; 
}

export function getValidationColumns(_isRTL?: boolean) {
  return [
    { name: "phone", required: true },
    { name: "name", required: true },
    { name: "date", required: true },
    { name: "time", required: true },
    { name: "type", required: true },
  ];
}


