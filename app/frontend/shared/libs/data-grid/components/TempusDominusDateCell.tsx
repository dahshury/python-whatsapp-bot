"use client";

import {
  type CustomCell,
  type CustomRenderer,
  drawTextCell,
  GridCellKind,
} from "@glideapps/glide-data-grid";
import { useVacation } from "@shared/libs/state/vacation-context";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useTempusDominusWidget } from "@/shared/libs/data-grid/components/hooks/useTempusDominusWidget";
import {
  formatDisplayDate,
  getInputType,
  getInputValue,
  toLocalDateInputValue,
  toLocalDateTimeInputValue,
} from "@/shared/libs/data-grid/components/utils/date-utils";

type TempusDateCellProps = {
  readonly kind: "tempus-date-cell";
  readonly date?: Date;
  readonly format?: "date" | "datetime" | "time";
  readonly displayDate?: string;
  readonly readonly?: boolean;
  readonly min?: Date;
  readonly max?: Date;
  readonly isDarkTheme?: boolean;
  readonly freeRoam?: boolean;
};

export type TempusDateCell = CustomCell<TempusDateCellProps>;

// parseDisplayToDate centralized in utils

const renderer: CustomRenderer<TempusDateCell> = {
  kind: GridCellKind.Custom,
  isMatch: (c): c is TempusDateCell =>
    (c.data as { kind?: string }).kind === "tempus-date-cell",

  draw: (args, cell) => {
    const { displayDate } = cell.data;
    drawTextCell(args, displayDate || "", cell.contentAlign);
    return true;
  },

  measure: (ctx, cell, theme) => {
    const { displayDate } = cell.data;
    return (
      ctx.measureText(displayDate || "").width + theme.cellHorizontalPadding * 2
    );
  },

  provideEditor: () => ({
    editor: (props) => {
      const { data } = props.value;
      const { onFinishedEditing } = props;
      const inputRef = useRef<HTMLInputElement>(null);
      const wrapperRef = useRef<HTMLDivElement>(null);
      const iconButtonRef = useRef<HTMLButtonElement>(null);

      const { vacationPeriods } = useVacation();
      const { resolvedTheme } = useTheme();

      const {
        ensureStyleLoaded,
        handleIconClick,
        handleChange,
        handleBlur,
        handleKeyDown,
      } = useTempusDominusWidget({
        inputRef,
        wrapperRef,
        format: data.format as unknown as
          | "date"
          | "datetime"
          | "time"
          | undefined,
        theme: (resolvedTheme === "dark" ? "dark" : "light") as
          | "dark"
          | "light",
        vacationPeriods,
        freeRoam: data.freeRoam ?? false,
        ...(data.min ? { min: data.min } : {}),
        ...(data.max ? { max: data.max } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.displayDate ? { displayDate: data.displayDate } : {}),
        locale: "en-GB",
        onChange: (picked?: Date) => {
          const newCell = {
            ...props.value,
            data: {
              ...data,
              date: picked,
              displayDate: picked ? formatDisplayDate(picked, data.format) : "",
            },
          } as typeof props.value;
          props.onChange(newCell);
        },
        onFinished: () => onFinishedEditing?.(props.value),
      });

      useEffect(() => {
        ensureStyleLoaded();
      }, [ensureStyleLoaded]);

      const getMinValue = () => {
        if (!data.min) {
          return;
        }

        const TIME_STRING_LENGTH = 5;
        switch (data.format) {
          case "time":
            return data.min.toTimeString().slice(0, TIME_STRING_LENGTH);
          case "datetime":
            return toLocalDateTimeInputValue(data.min);
          default:
            return toLocalDateInputValue(data.min);
        }
      };

      const getMaxValue = () => {
        if (!data.max) {
          return;
        }

        const TIME_STRING_LENGTH = 5;
        switch (data.format) {
          case "time":
            return data.max.toTimeString().slice(0, TIME_STRING_LENGTH);
          case "datetime":
            return toLocalDateTimeInputValue(data.max);
          default:
            return toLocalDateInputValue(data.max);
        }
      };

      if (data.readonly) {
        return (
          <div className="tempus-dominus-wrapper">
            <span className="tempus-dominus-editor">
              {data.displayDate || ""}
            </span>
          </div>
        );
      }

      return (
        <div className="tempus-dominus-wrapper" ref={wrapperRef}>
          <input
            className="tempus-dominus-editor"
            defaultValue={getInputValue(
              data.date,
              data.format as unknown as
                | "date"
                | "datetime"
                | "time"
                | undefined,
              data.displayDate
            )}
            disabled={data.readonly}
            max={getMaxValue()}
            min={getMinValue()}
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={(() => {
              if (data.format === "date") {
                return "dd/mm/yyyy";
              }
              if (data.format === "time") {
                return "hh:mm";
              }
              return "";
            })()}
            ref={inputRef}
            type={getInputType(
              data.format as unknown as "date" | "datetime" | "time" | undefined
            )}
          />
          <button
            className={`tempus-dominus-icon-button ${data.readonly ? "readonly" : ""}`}
            disabled={data.readonly}
            onClick={handleIconClick}
            ref={iconButtonRef}
            type="button"
          >
            {data.format === "time" ? (
              // Clock icon
              <svg
                aria-label="Clock icon"
                className="tempus-dominus-icon-button-svg"
                fill="currentColor"
                height="16"
                role="img"
                viewBox="0 0 16 16"
                width="16"
              >
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 3a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.146.354l-2.5 2.5a.5.5 0 0 1-.708-.708L7.293 8H3.5a.5.5 0 0 1 0-1H8V3.5A.5.5 0 0 1 8 3Z" />
              </svg>
            ) : (
              // Calendar icon
              <svg
                aria-label="Calendar icon"
                className="tempus-dominus-icon-button-svg"
                fill="currentColor"
                height="16"
                role="img"
                viewBox="0 0 16 16"
                width="16"
              >
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                <path d="M3 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-6 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z" />
              </svg>
            )}
          </button>
        </div>
      );
    },
    disablePadding: true,
  }),

  onPaste: (v, d) => {
    let parsedDate: Date | undefined;

    if (v) {
      const timestamp = Number(v);
      if (Number.isNaN(timestamp)) {
        const parsed = Date.parse(v);
        if (!Number.isNaN(parsed)) {
          parsedDate = new Date(parsed);
        }
      } else {
        parsedDate = new Date(timestamp);
      }
    }

    if (parsedDate) {
      return {
        ...d,
        date: parsedDate,
        displayDate: formatDisplayDate(parsedDate, d.format),
      };
    }
    return;
  },
};

export default renderer;
