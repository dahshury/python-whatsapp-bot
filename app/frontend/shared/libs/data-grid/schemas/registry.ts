import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import { COLUMN_DATA_TYPE } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import {
	datePreset,
	dateTimePreset,
	dropdownPreset,
	namePreset,
	phonePreset,
	timePreset,
} from "@/shared/libs/data-grid/schemas/presets";
import { i18n } from "@/shared/libs/i18n";
import type { ColumnSchemaOptions } from "./types";

type SchemaFactory = (options?: ColumnSchemaOptions) => IColumnDefinition[];

class ColumnSchemaRegistry {
	private readonly registry: Map<string, SchemaFactory> = new Map();

	register(key: string, factory: SchemaFactory): void {
		this.registry.set(key, factory);
	}

	getColumns(key: string, options?: ColumnSchemaOptions): IColumnDefinition[] {
		const factory = this.registry.get(key);
		if (!factory) {
			throw new Error(`Column schema not found: ${key}`);
		}
		return factory(options);
	}
}

export const columnSchemaRegistry = new ColumnSchemaRegistry();

// Built-in: default fallback schema (used when no dataSource is provided)
columnSchemaRegistry.register("default", () => [
	namePreset("Full Name")({ width: 150 }),
	dropdownPreset(
		"Status",
		["Option A", "Option B", "Option C"],
		"status"
	)({ width: 120 }),
	{
		id: "amount",
		name: "amount",
		title: "Amount",
		dataType: COLUMN_DATA_TYPE.NUMBER,
		isEditable: true,
		isRequired: true,
		width: 100,
		formatting: { type: "currency", options: { currency: "USD" } },
		metadata: { cellType: "number" },
	},
	datePreset("Date")({ width: 120, isEditable: true, isRequired: true }),
	timePreset("Time")({ width: 120, isEditable: true, isRequired: true }),
]);

// Built-in: customer schema

columnSchemaRegistry.register("customer", (options?: ColumnSchemaOptions) => {
	const localized = Boolean(options?.localized);
	return [
		namePreset(i18n.getMessage("field_name", localized))({ width: 220 }),
		{
			id: "age",
			name: "age",
			title: i18n.getMessage("field_age", localized),
			dataType: COLUMN_DATA_TYPE.NUMBER,
			isEditable: true,
			isRequired: false,
			width: 120,
			metadata: { useWheel: true, cellType: "number" },
			validationRules: [
				{ type: "min", value: 10, message: "Minimum age is 10" },
				{ type: "max", value: 120, message: "Maximum age is 120" },
			],
		},
		phonePreset(i18n.getMessage("field_phone", localized))({ width: 220 }),
		{
			id: "excalidraw",
			name: "excalidraw",
			title: "Excalidraw",
			dataType: COLUMN_DATA_TYPE.EXCALIDRAW,
			isEditable: true,
			isRequired: false,
			width: 200,
			metadata: { cellType: "excalidraw" },
		},
	];
});

// Built-in: reservation preview schema (date, time, type)
columnSchemaRegistry.register(
	"reservationPreview",
	(options?: ColumnSchemaOptions) => {
		const localized = Boolean(options?.localized);
		const themeByCellType =
			(options?.themeByCellType as Record<string, unknown>) || {};
		const themeById = (options?.themeById as Record<string, unknown>) || {};
		return [
			datePreset(localized ? "التاريخ" : "Date")({
				width: 100,
				isEditable: false,
				isRequired: false,
				...(themeByCellType.date
					? {
							themeOverride: themeByCellType.date as Record<string, unknown>,
						}
					: {}),
				...(themeById.date
					? { themeOverride: themeById.date as Record<string, unknown> }
					: {}),
			}),
			timePreset(localized ? "الوقت" : "Time")({
				width: 90,
				isEditable: false,
				isRequired: false,
				...(themeByCellType.time
					? {
							themeOverride: themeByCellType.time as Record<string, unknown>,
						}
					: {}),
				...(themeById.time
					? { themeOverride: themeById.time as Record<string, unknown> }
					: {}),
			}),
			{
				id: "type",
				name: "type",
				title: localized ? "النوع" : "Type",
				dataType: COLUMN_DATA_TYPE.TEXT,
				isEditable: false,
				isRequired: false,
				width: 110,
				metadata: { cellType: "type" },
				...(themeByCellType.type
					? {
							themeOverride: themeByCellType.type as Record<string, unknown>,
						}
					: {}),
				...(themeById.type
					? { themeOverride: themeById.type as Record<string, unknown> }
					: {}),
			},
		];
	}
);

// Built-in: reservation dialog schema (scheduled_time, phone, type, name)
columnSchemaRegistry.register(
	"reservationDialog",
	(options?: ColumnSchemaOptions) => {
		const localized = Boolean(options?.localized);
		const selectedDateRange = options?.selectedDateRange as
			| { start?: string; end?: string }
			| undefined;
		const freeRoam = Boolean(options?.freeRoam);

		const defaultDateTimeValue = (() => {
			const startStr = selectedDateRange?.start;
			const hasTime =
				!!startStr && typeof startStr === "string" && startStr.includes("T");
			if (!startStr) {
				return;
			}
			try {
				if (hasTime) {
					return startStr as string;
				}
				// Default to 11:00 when only date is known; caller may override
				return `${startStr}T11:00`;
			} catch {
				return;
			}
		})();

		const themeByCellType =
			(options?.themeByCellType as Record<string, unknown>) || {};
		const themeById = (options?.themeById as Record<string, unknown>) || {};
		return [
			dateTimePreset(localized ? "التوقيت" : "Scheduled time")({
				defaultValue: defaultDateTimeValue,
				metadata: { freeRoam, cellType: "datetime" },
				...(themeByCellType.datetime
					? {
							themeOverride: themeByCellType.datetime as Record<
								string,
								unknown
							>,
						}
					: {}),
				...(themeById.scheduled_time
					? {
							themeOverride: themeById.scheduled_time as Record<
								string,
								unknown
							>,
						}
					: {}),
			}),
			phonePreset(localized ? "الهاتف" : "Phone")({
				...(themeByCellType.phone
					? {
							themeOverride: themeByCellType.phone as Record<string, unknown>,
						}
					: {}),
				...(themeById.phone
					? { themeOverride: themeById.phone as Record<string, unknown> }
					: {}),
			}),
			dropdownPreset(
				localized ? "النوع" : "Type",
				localized ? ["كشف", "مراجعة"] : ["Check-up", "Follow-up"]
			)({
				...(themeByCellType.dropdown
					? {
							themeOverride: themeByCellType.dropdown as Record<
								string,
								unknown
							>,
						}
					: {}),
				...(themeById.type
					? { themeOverride: themeById.type as Record<string, unknown> }
					: {}),
			}),
			namePreset(localized ? "الاسم" : "Name")({
				...(themeByCellType.name
					? {
							themeOverride: themeByCellType.name as Record<string, unknown>,
						}
					: {}),
				...(themeById.name
					? { themeOverride: themeById.name as Record<string, unknown> }
					: {}),
			}),
		];
	}
);

export function getColumnsForSchema(
	key: string,
	options?: ColumnSchemaOptions
): IColumnDefinition[] {
	return columnSchemaRegistry.getColumns(key, options);
}
