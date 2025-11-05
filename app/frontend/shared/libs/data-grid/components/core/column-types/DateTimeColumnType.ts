import {
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type Theme,
} from "@glideapps/glide-data-grid";
import { FormattingService } from "../../services/FormattingService";
import type { TempusDateCell } from "../../TempusDominusDateCell";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import {
  ColumnDataType,
  type IColumnDefinition,
  type IColumnFormatting,
} from "../interfaces/IDataSource";

export class DateTimeColumnType implements IColumnType {
  id = "datetime";
  dataType = ColumnDataType.DATETIME;

  createCell(options: {
    value: unknown;
    column: IColumnDefinition;
    theme: Partial<Theme>;
    isDarkTheme: boolean;
    rowContext?: unknown;
  }): GridCell {
    const {
      value,
      column,
      theme: _theme,
      isDarkTheme,
      rowContext: _rowContext,
    } = options;
    // Parse incoming value; if missing, fall back to column defaultValue
    const parsed = this.parseValue(value, column) as Date | null;
    const fallback = (this.getDefaultValue(column) as Date | null) ?? null;
    const date = (parsed ?? fallback) as Date | null;
    const displayDate = this.formatValue(date, column.formatting);

    const cell = {
      kind: GridCellKind.Custom,
      data: {
        kind: "tempus-date-cell",
        format: "datetime",
        date,
        displayDate,
        isDarkTheme,
        freeRoam: column.metadata?.freeRoam,
      },
      copyData: displayDate,
      allowOverlay: true,
    } as TempusDateCell;

    // Validate and store error details
    const validation = this.validateValue(date, column);
    if (!validation.isValid) {
      (
        cell as { isMissingValue?: boolean; validationError?: string }
      ).isMissingValue = true;
      (
        cell as { isMissingValue?: boolean; validationError?: string }
      ).validationError = validation.error || "";
    }

    return cell;
  }

  getCellValue(cell: GridCell): unknown {
    if (
      cell.kind === GridCellKind.Custom &&
      (cell as { data?: { kind?: string; date?: unknown } }).data?.kind ===
        "tempus-date-cell"
    ) {
      return (cell as { data?: { kind?: string; date?: unknown } }).data?.date;
    }
    return null;
  }

  validateValue(
    value: unknown,
    column: IColumnDefinition
  ): { isValid: boolean; error?: string } {
    if (column.isRequired && !value) {
      return {
        isValid: false,
        error:
          messages?.validation?.required?.(
            column.title || column.name || "Scheduled time"
          ) || "Scheduled time is required",
      };
    }

    if (
      value &&
      !(value instanceof Date) &&
      (typeof value !== "string" || Number.isNaN(Date.parse(String(value))))
    ) {
      return { isValid: false, error: messages.validation.invalidDate?.() };
    }

    return { isValid: true };
  }

  formatValue(value: unknown, formatting?: IColumnFormatting): string {
    if (!value) {
      return "";
    }

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    if (formatting?.type) {
      return FormattingService.formatValue(date, "datetime", formatting.type);
    }

    if (formatting?.pattern) {
      return FormattingService.formatValue(
        date,
        "datetime",
        formatting.pattern
      );
    }

    // Default: dd/MM/yyyy h:mm AM/PM
    const dd = String(date.getDate()).padStart(2, "0");
    const MONTH_OFFSET = 1;
    const HOURS_IN_HALF_DAY = 12;
    const PADDING_LENGTH = 2;
    const mm = String(date.getMonth() + MONTH_OFFSET).padStart(
      PADDING_LENGTH,
      "0"
    );
    const yyyy = date.getFullYear();
    const minutes = String(date.getMinutes()).padStart(PADDING_LENGTH, "0");
    const isPM = date.getHours() >= HOURS_IN_HALF_DAY;
    const MODULO_BASE = 12;
    const DEFAULT_HOUR = 12;
    const hour12 = date.getHours() % MODULO_BASE || DEFAULT_HOUR;
    return `${dd}/${mm}/${yyyy} ${hour12}:${minutes} ${isPM ? "PM" : "AM"}`;
  }

  parseValue(input: unknown, _column: IColumnDefinition): unknown {
    if (!input) {
      return null;
    }
    if (input instanceof Date) {
      return input;
    }

    const parsed = new Date(String(input));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  getDefaultValue(column: IColumnDefinition): unknown {
    if (column.defaultValue === "now") {
      return new Date();
    }
    return column.defaultValue &&
      (typeof column.defaultValue === "string" ||
        typeof column.defaultValue === "number" ||
        column.defaultValue instanceof Date)
      ? new Date(column.defaultValue as string | number | Date)
      : null;
  }

  canEdit(column: IColumnDefinition): boolean {
    return column.isEditable !== false;
  }

  createEditableCell(
    cell: GridCell,
    _column: IColumnDefinition
  ): EditableGridCell {
    return cell as EditableGridCell;
  }
}
