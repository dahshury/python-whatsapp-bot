import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import * as React from "react";
import { useTempusDominusWidget } from "@/components/glide_custom_cells/components/hooks/useTempusDominusWidget";
import {
	editorStyle,
	iconButtonStyle,
	wrapperStyle,
} from "@/components/glide_custom_cells/components/styles/tempus-date-editor.styles";
import {
	formatDisplayDate,
	getInputType,
	getInputValue,
	toLocalDateInputValue,
	toLocalDateTimeInputValue,
} from "@/components/glide_custom_cells/components/utils/date-utils";
import { useVacation } from "../../../lib/vacation-context";

interface TempusDateCellProps {
	readonly kind: "tempus-date-cell";
	readonly date?: Date;
	readonly format?: "date" | "datetime" | "time";
	readonly displayDate?: string;
	readonly readonly?: boolean;
	readonly min?: Date;
	readonly max?: Date;
	readonly isDarkTheme?: boolean;
	readonly freeRoam?: boolean;
}

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
			const inputRef = React.useRef<HTMLInputElement>(null);
			const wrapperRef = React.useRef<HTMLDivElement>(null);
			const iconButtonRef = React.useRef<HTMLButtonElement>(null);

			const { vacationPeriods } = useVacation();

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
				theme: (document.documentElement.classList.contains("dark")
					? "dark"
					: "light") as "dark" | "light",
				vacationPeriods,
				freeRoam: data.freeRoam || false,
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

			React.useEffect(() => {
				ensureStyleLoaded();
			}, [ensureStyleLoaded]);

			const getMinValue = () => {
				if (!data.min) return undefined;

				switch (data.format) {
					case "time":
						return data.min.toTimeString().slice(0, 5);
					case "datetime":
						return toLocalDateTimeInputValue(data.min);
					default:
						return toLocalDateInputValue(data.min);
				}
			};

			const getMaxValue = () => {
				if (!data.max) return undefined;

				switch (data.format) {
					case "time":
						return data.max.toTimeString().slice(0, 5);
					case "datetime":
						return toLocalDateTimeInputValue(data.max);
					default:
						return toLocalDateInputValue(data.max);
				}
			};

			if (data.readonly) {
				return (
					<div style={wrapperStyle}>
						<span style={editorStyle}>{data.displayDate || ""}</span>
					</div>
				);
			}

			return (
				<div ref={wrapperRef} style={wrapperStyle}>
					<input
						ref={inputRef}
						style={editorStyle}
						type={getInputType(
							data.format as unknown as
								| "date"
								| "datetime"
								| "time"
								| undefined,
						)}
						defaultValue={getInputValue(
							data.date,
							data.format as unknown as
								| "date"
								| "datetime"
								| "time"
								| undefined,
							data.displayDate,
						)}
						min={getMinValue()}
						max={getMaxValue()}
						onChange={handleChange}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						disabled={data.readonly}
						placeholder={
							data.format === "date"
								? "dd/mm/yyyy"
								: data.format === "time"
									? "hh:mm"
									: ""
						}
					/>
					<button
						type="button"
						ref={iconButtonRef}
						style={{
							...iconButtonStyle,
							opacity: data.readonly ? 0.3 : 0.7,
						}}
						onClick={handleIconClick}
						disabled={data.readonly}
						onMouseEnter={(e) => {
							if (!data.readonly) {
								e.currentTarget.style.opacity = "1";
							}
						}}
						onMouseLeave={(e) => {
							if (!data.readonly) {
								e.currentTarget.style.opacity = "0.7";
							}
						}}
					>
						{data.format === "time" ? (
							// Clock icon
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
								style={{ pointerEvents: "none" }}
								role="img"
								aria-label="Clock icon"
							>
								<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 3a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.146.354l-2.5 2.5a.5.5 0 0 1-.708-.708L7.293 8H3.5a.5.5 0 0 1 0-1H8V3.5A.5.5 0 0 1 8 3Z" />
							</svg>
						) : (
							// Calendar icon
							<svg
								width="16"
								height="16"
								role="img"
								aria-label="Calendar icon"
								viewBox="0 0 16 16"
								fill="currentColor"
								style={{ pointerEvents: "none" }}
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
			if (!Number.isNaN(timestamp)) {
				parsedDate = new Date(timestamp);
			} else {
				const parsed = Date.parse(v);
				if (!Number.isNaN(parsed)) {
					parsedDate = new Date(parsed);
				}
			}
		}

		if (parsedDate) {
			return {
				...d,
				date: parsedDate,
				displayDate: formatDisplayDate(parsedDate, d.format),
			};
		}
		return undefined;
	},
};

export default renderer;
