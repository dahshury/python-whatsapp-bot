import {
  type GridCell,
  GridCellKind,
  type Theme,
} from "@glideapps/glide-data-grid";
import type { GridColumnConfig } from "../../types/grid-data";

export type SampleDataProvider = (
  row: number,
  col: number,
  column: GridColumnConfig
) => unknown;

export class CellFactory {
  private readonly theme: Partial<Theme>;
  private readonly darkTheme: Partial<Theme>;
  private readonly sampleDataProvider: SampleDataProvider | undefined;

  constructor(args: {
    theme: Partial<Theme>;
    darkTheme: Partial<Theme>;
    sampleDataProvider?: SampleDataProvider | undefined;
  }) {
    this.theme = args.theme;
    this.darkTheme = args.darkTheme;
    this.sampleDataProvider = args.sampleDataProvider;
  }

  createInitialCell(
    row: number,
    col: number,
    column: GridColumnConfig
  ): GridCell {
    const data = this.sampleDataProvider
      ? this.sampleDataProvider(row, col, column)
      : undefined;

    switch (column.kind) {
      case "text": {
        const text = String(data ?? "");
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text,
          allowOverlay: true,
        };
      }
      case "dropdown": {
        const value = String(data ?? "");
        return {
          kind: GridCellKind.Custom,
          data: {
            kind: "dropdown-cell",
            allowedValues: column.allowedValues || [],
            value,
          },
          copyData: value,
          allowOverlay: true,
        } as unknown as GridCell;
      }
      case "number": {
        const num = Number(data ?? 0);
        const display =
          typeof num === "number" && !Number.isNaN(num)
            ? num.toLocaleString()
            : "";
        return {
          kind: GridCellKind.Number,
          data: num,
          displayData: display,
          allowOverlay: true,
        };
      }
      case "date": {
        const date = data instanceof Date ? data : new Date();
        const display = date.toLocaleDateString("en-GB");
        return {
          kind: GridCellKind.Custom,
          data: {
            kind: "tempus-date-cell",
            format: "date",
            date,
            displayDate: display,
            isDarkTheme: this.theme === this.darkTheme,
          },
          copyData: display,
          allowOverlay: true,
        } as unknown as GridCell;
      }
      case "time": {
        const time = data instanceof Date ? data : new Date();
        const display = time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          kind: GridCellKind.Custom,
          data: {
            kind: "timekeeper-cell",
            time,
            displayTime: display,
            isDarkTheme: this.theme === this.darkTheme,
            use24Hour: false,
          },
          copyData: display,
          allowOverlay: true,
        } as unknown as GridCell;
      }
      default: {
        const text = String(data ?? "");
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text,
          allowOverlay: true,
        };
      }
    }
  }
}
