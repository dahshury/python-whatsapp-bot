import type {
  CustomCell,
  CustomRenderer,
  Rectangle,
} from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import { createElement } from "react";
import { PhoneCellEditor } from "./ui/PhoneCellEditor";

// Define the phone cell data type
type PhoneCellData = { kind: "phone-cell"; value: string };

// Define the phone cell type
type PhoneCell = CustomCell<PhoneCellData> & { kind: GridCellKind.Custom };

// Phone cell renderer
const PhoneCellRenderer: CustomRenderer<PhoneCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is PhoneCell =>
    cell.kind === GridCellKind.Custom &&
    typeof (cell as CustomCell<PhoneCellData>).data === "object" &&
    (cell as CustomCell<PhoneCellData>).data?.kind === "phone-cell",

  draw: ({ ctx, theme, rect, cell }) => {
    const raw = cell.data.value ?? "";
    const paddingX = 8;
    const paddingY = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();

    // Apply theme override if present
    const cellThemeOverride = (
      cell as { themeOverride?: { baseFontStyle?: string; textDark?: string } }
    ).themeOverride;
    const effectiveFontStyle =
      cellThemeOverride?.baseFontStyle ?? theme.baseFontStyle;
    const effectiveTextColor =
      cellThemeOverride?.textDark ??
      (cell.style === "faded" ? theme.textLight : theme.textDark);

    ctx.fillStyle = effectiveTextColor;
    ctx.textBaseline = "middle";
    ctx.font = effectiveFontStyle;

    // Force LTR rendering regardless of page direction
    try {
      (ctx as unknown as { direction?: CanvasDirection }).direction = "ltr";
    } catch {
      // Canvas direction setting failed; continue
    }

    // Respect contentAlign from cell (default to left if not specified)
    const contentAlign =
      (cell as { contentAlign?: "left" | "center" | "right" }).contentAlign ??
      "left";
    try {
      ctx.textAlign = contentAlign;
    } catch {
      // Canvas textAlign setting failed; continue
    }

    const y = rect.y + rect.height / 2 + paddingY;
    // Wrap text with LTR isolate markers to avoid bidi issues in RTL locales
    const LRI = "\u2066"; // Left-to-Right Isolate
    const PDI = "\u2069"; // Pop Directional Isolate
    const text = `${LRI}${String(raw)}${PDI}`;

    // Calculate x position based on alignment
    let x: number;
    if (contentAlign === "center") {
      x = rect.x + rect.width / 2;
    } else if (contentAlign === "right") {
      x = rect.x + rect.width - paddingX;
    } else {
      x = rect.x + paddingX;
    }

    ctx.fillText(text, x, y);
    ctx.restore();
  },

  provideEditor: () => ({
    editor: (props: {
      value: PhoneCell;
      onChange: (newValue: PhoneCell) => void;
      onFinishedEditing: (
        newValue?: PhoneCell,
        movement?: readonly [-1 | 0 | 1, -1 | 0 | 1]
      ) => void;
      target: Rectangle;
    }) => {
      const { value, onChange, onFinishedEditing } = props;

      const handleChange = (newValue: string) => {
        const next: PhoneCell = {
          ...value,
          data: { kind: "phone-cell", value: newValue ?? "" },
          copyData: newValue ?? "",
        };
        onChange(next);
      };

      const handleFinishedEditing = (save: boolean) => {
        if (!save) {
          // Revert to original value
          handleChange(value.data.value);
        }
        onFinishedEditing(value);
      };

      return createElement(PhoneCellEditor, {
        value: value.data.value,
        onChange: handleChange,
        onFinishedEditing: handleFinishedEditing,
      });
    },
    disablePadding: true,
  }),
};

export default PhoneCellRenderer;
