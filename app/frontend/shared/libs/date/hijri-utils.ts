import { toHijri } from "hijri-converter";

export function formatHijriDate(date: Date): string {
	try {
		const { hy, hm, hd } = toHijri(
			date.getFullYear(),
			date.getMonth() + 1,
			date.getDate()
		);
		const pad = (n: number) => n.toString().padStart(2, "0");
		return `${pad(hd)}/${pad(hm)}/${hy}`;
	} catch {
		return date.toLocaleDateString("en-GB");
	}
}

export function getCurrentHijriDate(): string {
	return formatHijriDate(new Date());
}

export function formatDateRangeWithHijri(
	start?: Date | null,
	end?: Date | null
): string {
	if (!(start || end)) {
		return "";
	}
	if (start && !end) {
		return `${formatHijriDate(start)} –`;
	}
	if (!start && end) {
		return `– ${formatHijriDate(end)}`;
	}
	return `${formatHijriDate(start as Date)} – ${formatHijriDate(end as Date)}`;
}
