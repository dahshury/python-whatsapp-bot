import type { IColumnDefinition } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import { getSlotTimes } from "@/lib/calendar-config";

export function getDataTableColumns(
	isLocalized: boolean,
	selectedDateRange?: { start: string; end?: string } | null,
	freeRoam?: boolean,
): IColumnDefinition[] {
	const t = (en: string, ar: string) => (isLocalized ? ar : en);

	// Derive default scheduled datetime from the opened calendar slot/range
	const startStr = selectedDateRange?.start;
	const hasTime = !!startStr && startStr.includes("T");
	const defaultDateTimeValue = (() => {
		if (!startStr) return undefined;
		try {
			if (hasTime) return startStr;
			const base = new Date(`${startStr}T00:00:00`);
			if (Number.isNaN(base.getTime())) return undefined;
			const { slotMinTime } = getSlotTimes(base, !!freeRoam, "");
			const [h, m] = String(slotMinTime || "11:00:00")
				.split(":")
				.map((v) => Number.parseInt(v, 10));
			const hh = String(Number.isFinite(h) ? h : 11).padStart(2, "0");
			const mm = String(Number.isFinite(m) ? m : 0).padStart(2, "0");
			return `${startStr}T${hh}:${mm}`;
		} catch {
			return undefined;
		}
	})();

	const columns: IColumnDefinition[] = [
		{
			id: "scheduled_time",
			name: "scheduled_time",
			title: t("Scheduled time", "التوقيت"),
			dataType: ColumnDataType.DATETIME,
			isEditable: true,
			isRequired: true,
			defaultValue: defaultDateTimeValue,
			width: 190,
			metadata: { freeRoam: !!freeRoam },
		},
		{
			id: "phone",
			name: "phone",
			title: t("Phone", "الهاتف"),
			dataType: ColumnDataType.PHONE,
			isEditable: true,
			isRequired: true,
			defaultValue: "",
			width: 320, // Increased width for phone input widget
		},
		{
			id: "type",
			name: "type",
			title: t("Type", "النوع"),
			dataType: ColumnDataType.DROPDOWN,
			isEditable: true,
			isRequired: true,
			metadata: {
				options: isLocalized ? ["كشف", "مراجعة"] : ["Check-up", "Follow-up"],
			},
			width: 140,
		},
		{
			id: "name",
			name: "name",
			title: t("Name", "الاسم"),
			dataType: ColumnDataType.TEXT,
			isEditable: true,
			isRequired: true,
			width: 220,
		},
	];

	return columns;
}

export function getColumnNamesForParsing(): string[] {
	return ["scheduled_time", "phone", "type", "name"];
}

export function getValidationColumns(_isLocalized?: boolean) {
	return [
		{ name: "phone", required: true },
		{ name: "name", required: true },
		{ name: "scheduled_time", required: true },
		{ name: "type", required: true },
	];
}
