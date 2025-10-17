import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import {
	editorStyle,
	iconButtonStyle,
	wrapperStyle,
} from "@/shared/libs/data-grid/components/styles/tempus-date-editor.styles";
import { formatDisplayDate } from "@/shared/libs/data-grid/components/utils/date-utils";
import {
	type TempusDominusEditorProps,
	useTempusDominusEditor,
} from "./hooks/use-tempus-dominus-editor";

// Constants for opacity values
const BUTTON_OPACITY_DISABLED = 0.3;
const BUTTON_OPACITY_NORMAL = 0.7;

function getPlaceholderText(format?: "date" | "datetime" | "time"): string {
	if (format === "date") {
		return "dd/mm/yyyy";
	}
	if (format === "time") {
		return "hh:mm";
	}
	return "";
}

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
		editor: (props: unknown) => {
			const editorProps = props as TempusDominusEditorProps;
			const editor = useTempusDominusEditor(editorProps);
			const { data } = editor;
			const { wrapperRef, inputRef, iconButtonRef } = editor;
			const { getters, handlers } = editor;

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
						defaultValue={getters.getInputDefaultValue()}
						disabled={data.readonly}
						max={getters.getMaxValue()}
						min={getters.getMinValue()}
						onBlur={handlers.handleBlur}
						onChange={handlers.handleChange}
						onKeyDown={handlers.handleKeyDown}
						placeholder={getPlaceholderText(data.format)}
						ref={inputRef}
						style={editorStyle}
						type={getters.getInputHTMLType()}
					/>
					<button
						disabled={data.readonly}
						onClick={handlers.handleIconClick}
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
						ref={iconButtonRef}
						style={{
							...iconButtonStyle,
							opacity: data.readonly
								? BUTTON_OPACITY_DISABLED
								: BUTTON_OPACITY_NORMAL,
						}}
						type="button"
					>
						{data.format === "time" ? (
							// Clock icon
							<svg
								aria-label="Clock icon"
								fill="currentColor"
								height="16"
								role="img"
								style={{ pointerEvents: "none" }}
								viewBox="0 0 16 16"
								width="16"
							>
								<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 3a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.146.354l-2.5 2.5a.5.5 0 0 1-.708-.708L7.293 8H3.5a.5.5 0 0 1 0-1H8V3.5A.5.5 0 0 1 8 3Z" />
							</svg>
						) : (
							// Calendar icon
							<svg
								aria-label="Calendar icon"
								fill="currentColor"
								height="16"
								role="img"
								style={{ pointerEvents: "none" }}
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
