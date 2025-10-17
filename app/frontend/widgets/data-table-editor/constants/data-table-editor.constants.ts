import { getSlotTimes } from "@shared/libs/calendar/calendar-config";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import { getColumnsForSchema } from "@/shared/libs/data-grid/schemas/registry";

const DEFAULT_HOUR = 11;
const DEFAULT_MINUTE = 0;

export function getDataTableColumns(
	isLocalized: boolean,
	selectedDateRange?: { start: string; end?: string } | null,
	freeRoam?: boolean
): IColumnDefinition[] {
	// Build via centralized schema
	const base = getColumnsForSchema("reservationDialog", {
		localized: isLocalized,
		selectedDateRange: selectedDateRange || undefined,
		freeRoam,
	});

	// If only a date is selected without time, refine default using slotMinTime
	const startStr = selectedDateRange?.start;
	const hasTime = !!startStr && startStr.includes("T");
	if (startStr && !hasTime) {
		try {
			const baseDate = new Date(`${startStr}T00:00:00`);
			if (!Number.isNaN(baseDate.getTime())) {
				const { slotMinTime } = getSlotTimes(baseDate, !!freeRoam, "");
				const [h, m] = String(slotMinTime || "11:00:00")
					.split(":")
					.map((v) => Number.parseInt(v, 10));
				const hh = String(Number.isFinite(h) ? h : DEFAULT_HOUR).padStart(
					2,
					"0"
				);
				const mm = String(Number.isFinite(m) ? m : DEFAULT_MINUTE).padStart(
					2,
					"0"
				);
				const refined = `${startStr}T${hh}:${mm}`;
				return base.map((c) =>
					c.id === "scheduled_time" ? { ...c, defaultValue: refined } : c
				);
			}
		} catch {
			// Date parsing failed; returning base columns without time refinement
		}
	}

	return base;
}

export function getColumnNamesForParsing(): string[] {
	return getColumnsForSchema("reservationDialog").map((c) => c.id);
}

export function getValidationColumns(_isLocalized?: boolean) {
	// Mark required based on schema
	return getColumnsForSchema("reservationDialog").map((c) => ({
		name: c.id,
		required: Boolean(c.isRequired),
	}));
}
