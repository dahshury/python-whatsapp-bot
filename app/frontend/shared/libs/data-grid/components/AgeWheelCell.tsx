import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
	type Rectangle,
} from "@glideapps/glide-data-grid";
import { WheelPicker, type WheelPickerOption, WheelPickerWrapper } from "@ncdai/react-wheel-picker";
import * as React from "react";

type AgeWheelCellData = {
	kind: "age-wheel-cell";
	value: number | null;
	/** Optional preformatted display string */
	display?: string;
	/** Inclusive range for options */
	min?: number;
	max?: number;
	/** Optional visual tweaks */
	visibleCount?: number;
	optionItemHeight?: number;
	infinite?: boolean;
};

export type AgeWheelCell = CustomCell<AgeWheelCellData> & {
	kind: typeof GridCellKind.Custom;
};

function buildOptions(min: number, max: number): WheelPickerOption[] {
	const options: WheelPickerOption[] = [];
	const start = Number.isFinite(min) ? Math.floor(min) : 0;
	const end = Number.isFinite(max) ? Math.floor(max) : 120;
	for (let i = start; i <= end; i++) {
		options.push({ label: String(i), value: String(i) });
	}
	return options;
}

const AgeWheelCellRenderer: CustomRenderer<AgeWheelCell> = {
	kind: GridCellKind.Custom,
	isMatch: (cell): cell is AgeWheelCell => {
		return (
			cell.kind === GridCellKind.Custom &&
			typeof (cell as { data?: unknown }).data === "object" &&
			(cell as { data?: { kind?: string } }).data?.kind === "age-wheel-cell"
		);
	},

	draw: (args, cell) => {
		const data = cell.data;
		const display = (data.display ?? data.value ?? "").toString();
		drawTextCell(args, display, cell.contentAlign);
		return true;
	},

	measure: (ctx, cell, theme) => {
		const display = (cell.data.display ?? cell.data.value ?? "").toString();
		return ctx.measureText(display).width + theme.cellHorizontalPadding * 2;
	},

	provideEditor: () => ({
		editor: (props: {
			value: AgeWheelCell;
			onChange: (newValue: AgeWheelCell) => void;
			onFinishedEditing: (newValue?: AgeWheelCell, movement?: readonly [-1 | 0 | 1, -1 | 0 | 1]) => void;
			target: Rectangle;
		}) => {
			const { value, onChange, onFinishedEditing } = props;
			const { min = 10, max = 120, visibleCount = 20, optionItemHeight = 30, infinite = false } = value.data || {};

			const [effectiveMin, effectiveMax] = React.useMemo(() => {
				const a = Number.isFinite(min) ? Math.floor(min) : 10;
				const b = Number.isFinite(max) ? Math.floor(max) : 120;
				return a <= b ? [a, b] : [10, 120];
			}, [min, max]);

			const options = React.useMemo(() => buildOptions(effectiveMin, effectiveMax), [effectiveMin, effectiveMax]);

			const [localValue, setLocalValue] = React.useState<string>(
				value.data.value != null ? String(value.data.value) : String(min)
			);

			const commit = React.useCallback(
				(nextStr: string | null, finish = false) => {
					let parsed: number | null = null;
					if (nextStr != null && nextStr !== "") {
						const n = Number(nextStr);
						parsed = Number.isFinite(n) ? n : null;
					}
					const nextCell: AgeWheelCell = {
						...value,
						data: {
							...value.data,
							value: parsed,
							display: parsed == null ? "" : String(parsed),
						},
					};
					onChange(nextCell);
					if (finish) onFinishedEditing(nextCell);
				},
				[onChange, onFinishedEditing, value]
			);

			const handleValueChange = React.useCallback(
				(v: string) => {
					setLocalValue(v);
					commit(v, false);
				},
				[commit]
			);

			const isUnselected = value.data.value == null;

			return (
				<fieldset
					style={{
						width: Math.max(120, props.target?.width ?? 120),
						padding: 0,
						border: "none",
						margin: 0,
						background: "transparent",
					}}
					aria-label="Age selector"
				>
					<WheelPickerWrapper className="w-full">
						<WheelPicker
							options={options}
							{...(isUnselected ? { defaultValue: String(effectiveMin) } : { value: localValue })}
							onValueChange={handleValueChange}
							visibleCount={visibleCount}
							optionItemHeight={optionItemHeight}
							infinite={infinite}
							classNames={{
								optionItem: "text-muted-foreground",
								highlightWrapper: "bg-muted text-foreground",
								highlightItem: "text-foreground",
							}}
						/>
					</WheelPickerWrapper>
				</fieldset>
			);
		},
		disablePadding: true,
	}),
};

export default AgeWheelCellRenderer;
