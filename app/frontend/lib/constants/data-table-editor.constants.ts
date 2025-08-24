import type { IColumnDefinition } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";

export function getDataTableColumns(
  isRTL: boolean,
  _selectedDateRange?: { start: string; end?: string } | null,
  _freeRoam?: boolean,
): IColumnDefinition[] {
  const t = (en: string, ar: string) => (isRTL ? ar : en);

  const columns: IColumnDefinition[] = [
    {
      id: "date",
      name: "date",
      title: t("Date", "التاريخ"),
      dataType: ColumnDataType.DATE,
      isEditable: true,
      isRequired: true,
      formatting: { pattern: "YYYY-MM-DD" },
      width: 130,
    },
    {
      id: "time",
      name: "time",
      title: t("Time", "الوقت"),
      dataType: ColumnDataType.TIME,
      isEditable: true,
      isRequired: true,
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
  ];
}


