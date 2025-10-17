import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";
import { isNullOrUndefined } from "../components/utils/general-utils";

export function isMissingValueCell(cell: GridCell): boolean {
	const cellData = (
		cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }
	).data;
	const displayData = (
		cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }
	).displayData;

	// Check if cell has the isMissingValue flag
	if (
		(cell as { data?: unknown; displayData?: string; isMissingValue?: boolean })
			.isMissingValue === true
	) {
		return true;
	}

	// For custom cells, check the data property more thoroughly
	if (cell.kind === GridCellKind.Custom) {
		const customData = (
			cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }
		).data as
			| {
					kind?: string;
					date?: Date;
					value?: string;
					time?: Date;
			  }
			| undefined;
		if (customData?.kind === "tempus-date-cell") {
			const dateData = customData as { date?: Date };
			const isMissing = !dateData.date;
			return isMissing;
		}
		if (customData?.kind === "dropdown-cell") {
			const dropdownData = customData as { value?: string };
			const isMissing = !dropdownData.value || dropdownData.value === "";
			return isMissing;
		}
		// Phone cells store phone under data.value; displayData may be undefined.
		if (customData?.kind === "phone-cell") {
			const phoneData = customData as { value?: string };
			const v = (phoneData.value ?? "").trim();
			const isMissing = v.length === 0;
			return isMissing;
		}
		if (customData?.kind === "timekeeper-cell") {
			const timekeeperData = customData as { time?: Date };
			const isMissing = !timekeeperData.time;
			return isMissing;
		}
	}

	const isMissing =
		isNullOrUndefined(cellData) ||
		cellData === "" ||
		isNullOrUndefined(displayData) ||
		displayData === "";

	return isMissing;
}
