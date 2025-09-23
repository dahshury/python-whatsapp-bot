import type {
	CustomCell,
	CustomRenderer,
	Rectangle,
} from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import * as React from "react";
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
		const text = cell.data.value ?? "";
		const paddingX = 8;
		const paddingY = 0;

		ctx.save();
		ctx.beginPath();
		ctx.rect(rect.x, rect.y, rect.width, rect.height);
		ctx.clip();
		ctx.fillStyle = cell.style === "faded" ? theme.textLight : theme.textDark;
		ctx.textBaseline = "middle";
		ctx.font = theme.baseFontStyle;

		const y = rect.y + rect.height / 2 + paddingY;
		ctx.fillText(text, rect.x + paddingX, y);
		ctx.restore();
	},

	provideEditor: () => ({
		editor: (props: {
			value: PhoneCell;
			onChange: (newValue: PhoneCell) => void;
			onFinishedEditing: (
				newValue?: PhoneCell,
				movement?: readonly [-1 | 0 | 1, -1 | 0 | 1],
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

			// Dispatch a global event so the Documents page can react to selections
			const handleCustomerSelect = (phone: string, customerName: string) => {
				try {
					if (typeof window !== "undefined") {
						const evt = new CustomEvent("documents:customerSelected", {
							detail: { phone, customerName },
						});
						window.dispatchEvent(evt);
					}
				} catch {}
			};

			return React.createElement(PhoneCellEditor, {
				value: value.data.value,
				onChange: handleChange,
				onFinishedEditing: handleFinishedEditing,
				onCustomerSelect: handleCustomerSelect,
			});
		},
		disablePadding: true,
	}),
};

export default PhoneCellRenderer;
