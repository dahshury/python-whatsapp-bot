import {
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type Theme,
} from "@glideapps/glide-data-grid";
import type { IColumnType } from "../interfaces/IColumnType";
import {
  ColumnDataType,
  type IColumnDefinition,
  type IColumnFormatting,
} from "../interfaces/IDataSource";

// Regex patterns for email validation
const MAILTO_PREFIX_REGEX = /^mailto:/;
const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailColumnType implements IColumnType {
  id = "email";
  dataType = ColumnDataType.EMAIL;

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
      isDarkTheme: _isDarkTheme,
      rowContext: _rowContext,
    } = options;
    const email = this.formatValue(value, column.formatting);

    const cell: GridCell = {
      kind: GridCellKind.Uri,
      data: email ? `mailto:${email}` : "",
      displayData: email,
      allowOverlay: true,
      hoverEffect: true,
    };

    if (column.isRequired && !email) {
      (
        cell as {
          isMissingValue?: boolean;
          themeOverride?: { linkColor: string };
        }
      ).isMissingValue = true;
      (
        cell as {
          isMissingValue?: boolean;
          themeOverride?: { linkColor: string };
        }
      ).themeOverride = { linkColor: "#ef4444" };
    }

    return cell;
  }

  getCellValue(cell: GridCell): unknown {
    if (cell.kind === GridCellKind.Uri) {
      const data = (cell as { displayData?: string }).displayData || "";
      return data.replace(MAILTO_PREFIX_REGEX, "");
    }
    return "";
  }

  validateValue(
    value: unknown,
    column: IColumnDefinition
  ): { isValid: boolean; error?: string } {
    const email = String(value || "").trim();

    if (column.isRequired && !email) {
      return { isValid: false, error: "Email is required" };
    }

    if (email) {
      // Basic email validation regex
      if (!EMAIL_VALIDATION_REGEX.test(email)) {
        return { isValid: false, error: "Invalid email format" };
      }

      // Additional validation rules
      if (column.validationRules) {
        for (const rule of column.validationRules) {
          if (rule.type === "pattern" && rule.value) {
            const regex = new RegExp(String(rule.value));
            if (!regex.test(email)) {
              return {
                isValid: false,
                error: rule.message || "Invalid email format",
              };
            }
          }
        }
      }
    }

    return { isValid: true };
  }

  formatValue(value: unknown, _formatting?: IColumnFormatting): string {
    if (!value) {
      return "";
    }

    let email = String(value).trim().toLowerCase();

    // Remove mailto: prefix if present
    email = email.replace(MAILTO_PREFIX_REGEX, "");

    return email;
  }

  parseValue(input: string, _column: IColumnDefinition): unknown {
    return input.trim().toLowerCase();
  }

  getDefaultValue(column: IColumnDefinition): unknown {
    return column.defaultValue || "";
  }

  canEdit(column: IColumnDefinition): boolean {
    return column.isEditable !== false;
  }

  createEditableCell(
    cell: GridCell,
    _column: IColumnDefinition
  ): EditableGridCell {
    // Convert URI cell to text cell for editing
    if (cell.kind === GridCellKind.Uri) {
      const email = this.getCellValue(cell);
      return {
        kind: GridCellKind.Text,
        data: email,
        displayData: email,
        allowOverlay: true,
      } as EditableGridCell;
    }
    return cell as EditableGridCell;
  }
}
