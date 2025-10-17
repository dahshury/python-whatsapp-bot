import type { GridCell } from "@glideapps/glide-data-grid";
import { useVacation } from "@shared/libs/state/vacation-context";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import {
	formatDisplayDate,
	getInputType,
	getInputValue,
	toLocalDateInputValue,
	toLocalDateTimeInputValue,
} from "../utils/date-utils";
import { useTempusDominusWidget } from "./use-tempus-dominus-widget";

// Constants for time string slicing and opacity values
const TIME_STRING_HOUR_MINUTE_LENGTH = 5;

export type TempusDominusEditorData = {
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

type EditorProps = {
	value: GridCell;
	onChange: (newCell: GridCell) => void;
	onFinishedEditing?: (save: boolean) => void;
};

export type { EditorProps as TempusDominusEditorProps };

/**
 * Hook: useTempusDominusEditor
 * Extracts editor setup logic including refs, handlers, and date utilities
 */
export const useTempusDominusEditor = (props: EditorProps) => {
	const cell = props.value as GridCell & { data?: TempusDominusEditorData };
	const data =
		cell.data ?? ({ kind: "tempus-date-cell" } as TempusDominusEditorData);
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
		format: data.format as unknown as "date" | "datetime" | "time" | undefined,
		theme: (resolvedTheme === "dark" ? "dark" : "light") as unknown as
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
			const newData = {
				kind: "tempus-date-cell" as const,
				...(picked !== undefined && { date: picked }),
				displayDate: picked ? formatDisplayDate(picked, data.format) : "",
				...(data.format !== undefined && { format: data.format }),
				...(data.readonly !== undefined && { readonly: data.readonly }),
				...(data.min !== undefined && { min: data.min }),
				...(data.max !== undefined && { max: data.max }),
				...(data.isDarkTheme !== undefined && {
					isDarkTheme: data.isDarkTheme,
				}),
				...(data.freeRoam !== undefined && { freeRoam: data.freeRoam }),
			} satisfies TempusDominusEditorData;
			const newCell = {
				...cell,
				data: newData,
			} as unknown as GridCell;
			props.onChange(newCell);
		},
		onFinished: () => onFinishedEditing?.(true),
	});

	useEffect(() => {
		ensureStyleLoaded();
	}, [ensureStyleLoaded]);

	const getMinValue = () => {
		if (!data.min) {
			return;
		}

		switch (data.format) {
			case "time":
				return data.min.toTimeString().slice(0, TIME_STRING_HOUR_MINUTE_LENGTH);
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

		switch (data.format) {
			case "time":
				return data.max.toTimeString().slice(0, TIME_STRING_HOUR_MINUTE_LENGTH);
			case "datetime":
				return toLocalDateTimeInputValue(data.max);
			default:
				return toLocalDateInputValue(data.max);
		}
	};

	const getInputDefaultValue = () =>
		getInputValue(
			data.date,
			data.format as unknown as "date" | "datetime" | "time" | undefined,
			data.displayDate
		);

	const getInputHTMLType = () =>
		getInputType(
			data.format as unknown as "date" | "datetime" | "time" | undefined
		);

	return {
		inputRef,
		wrapperRef,
		iconButtonRef,
		data,
		props,
		handlers: {
			handleChange,
			handleBlur,
			handleKeyDown,
			handleIconClick,
		},
		getters: {
			getMinValue,
			getMaxValue,
			getInputDefaultValue,
			getInputHTMLType,
		},
	};
};
