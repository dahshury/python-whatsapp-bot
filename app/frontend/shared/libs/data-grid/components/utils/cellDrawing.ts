import type { DrawCellCallback } from "@glideapps/glide-data-grid";
import {
  drawTextCell,
  GridCellKind,
  type GridColumn,
  type Theme,
} from "@glideapps/glide-data-grid";
import { drawAttentionIndicator } from "./cellDrawHelpers";
import { messages } from "./i18n";

export function createDrawCellCallback(
  orderedColumns: GridColumn[],
  theme: Partial<Theme>
): DrawCellCallback {
  return (args, draw) => {
    const { cell, col, ctx, rect } = args;
    const column = orderedColumns[col]; // Use ordered columns

    if ((cell as { isMissingValue?: boolean }).isMissingValue) {
      ctx.save();

      const hasContent = (() => {
        if (cell.kind === GridCellKind.Custom) {
          const data = (cell as { data?: unknown }).data as
            | {
                kind?: string;
                date?: Date;
                time?: Date;
                value?: unknown;
              }
            | undefined;
          if (data?.kind === "tempus-date-cell") {
            return !!(
              data.date || (data as { displayDate?: string }).displayDate
            );
          }
          if (data?.kind === "timekeeper-cell") {
            return !!(data as { time?: Date }).time;
          }
          if (data?.kind === "dropdown-cell") {
            return !!data.value;
          }
          if (data?.kind === "phone-cell") {
            return !!data.value;
          }
          if (data?.kind === "age-wheel-cell") {
            return !!data.value;
          }
          return false;
        }

        if (cell.kind === GridCellKind.Text) {
          return !!(cell as { data?: unknown }).data;
        }
        if (cell.kind === GridCellKind.Number) {
          return (
            (cell as { data?: unknown }).data !== null &&
            (cell as { data?: unknown }).data !== undefined
          );
        }

        return false;
      })();

      if (
        (column as { isRequired?: boolean; isEditable?: boolean })
          ?.isRequired &&
        (column as { isRequired?: boolean; isEditable?: boolean })?.isEditable
      ) {
        drawAttentionIndicator(ctx, rect, theme as Theme);
      }

      draw();

      if (!hasContent) {
        drawTextCell(
          {
            ...args,
            theme: {
              ...(theme as Theme),
              textDark: (theme as Theme).textLight,
            },
          } as unknown as Parameters<typeof drawTextCell>[0],
          messages.grid.none(),
          cell.contentAlign
        );
      }

      ctx.restore();
      return;
    }
    draw();
  };
}

