import type { Theme } from "@glideapps/glide-data-grid";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import { COLUMN_DATA_TYPE } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import type { ColumnPresetFactory } from "./types";

// Reusable column presets to unify definitions across schemas
// Each preset annotates a semantic cellType for downstream use

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export const datePreset =
	(label: string, id = "date"): ColumnPresetFactory =>
	(overrides?: Partial<IColumnDefinition>): IColumnDefinition => ({
		id,
		name: id,
		title: label,
		dataType: COLUMN_DATA_TYPE.DATE,
		isEditable: false,
		isRequired: false,
		width: 120,
		metadata: { cellType: "date" },
		...(overrides || {}),
	});

export const timePreset =
	(label: string, id = "time"): ColumnPresetFactory =>
	(overrides?: Partial<IColumnDefinition>): IColumnDefinition => ({
		id,
		name: id,
		title: label,
		dataType: COLUMN_DATA_TYPE.TIME,
		isEditable: false,
		isRequired: false,
		width: 120,
		metadata: { cellType: "time" },
		...(overrides || {}),
	});

export const dateTimePreset =
	(label: string, id = "scheduled_time"): ColumnPresetFactory =>
	(overrides?: Partial<IColumnDefinition>): IColumnDefinition => ({
		id,
		name: id,
		title: label,
		dataType: COLUMN_DATA_TYPE.DATETIME,
		isEditable: true,
		isRequired: true,
		width: 190,
		metadata: { cellType: "datetime" },
		...(overrides || {}),
	});

export const namePreset =
	(label: string, id = "name"): ColumnPresetFactory =>
	(overrides?: Partial<IColumnDefinition>): IColumnDefinition => ({
		id,
		name: id,
		title: label,
		dataType: COLUMN_DATA_TYPE.TEXT,
		isEditable: true,
		isRequired: true,
		width: 220,
		metadata: { cellType: "name" },
		...(overrides || {}),
	});

export const phonePreset =
	(label: string, id = "phone"): ColumnPresetFactory =>
	(overrides?: Partial<IColumnDefinition>): IColumnDefinition => ({
		id,
		name: id,
		title: label,
		dataType: COLUMN_DATA_TYPE.PHONE,
		isEditable: true,
		isRequired: true,
		width: 320,
		defaultValue: "",
		metadata: { cellType: "phone" },
		...(overrides || {}),
	});

export const dropdownPreset =
	(label: string, options: string[], id = "type"): ColumnPresetFactory =>
	(overrides?: Partial<IColumnDefinition>): IColumnDefinition => ({
		id,
		name: id,
		title: label,
		dataType: COLUMN_DATA_TYPE.DROPDOWN,
		isEditable: true,
		isRequired: true,
		width: 140,
		metadata: { options, cellType: "dropdown" },
		...(overrides || {}),
	});

// Helper: create a header accent theme override for a column
export function makeColumnHeaderAccentTheme(
	accentHex: string,
	fontStyle = "600 13px"
): Partial<Theme> {
	const toAlpha20 = (hex: string) => {
		const v = hex?.trim();
		if (typeof v === "string" && HEX_COLOR_PATTERN.test(v)) {
			return `${v}20`;
		}
		return "#00000020";
	};
	return {
		textDark: accentHex,
		bgIconHeader: accentHex,
		accentColor: accentHex,
		accentLight: toAlpha20(accentHex),
		fgIconHeader: "#FFFFFF",
		baseFontStyle: fontStyle,
	};
}
