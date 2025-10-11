import { createFuseIndex, fuzzySearchItems } from "@shared/libs/fuzzy";
import { convertZeroZeroToPlus } from "@shared/libs/utils/phone-utils";
import type Fuse from "fuse.js";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";

export function createPhoneFuseIndex(indexed: IndexedPhoneOption[]) {
	try {
		return createFuseIndex(indexed, {
			keys: [
				{ name: "__searchName", weight: 0.85 },
				{ name: "__searchLabel", weight: 0.15 },
			],
			threshold: 0.28,
			ignoreLocation: true,
			minMatchCharLength: 2,
			includeScore: true,
			shouldSort: true,
		});
	} catch {
		return createFuseIndex(indexed, {
			keys: ["__searchName", "__searchLabel"],
			threshold: 0.28,
		});
	}
}

export function filterPhones(
	fuse: Fuse<IndexedPhoneOption>,
	indexed: IndexedPhoneOption[],
	rawSearch: string
): IndexedPhoneOption[] {
	const raw = (rawSearch || "").trim();
	const search = raw.toLowerCase();
	if (!search) return indexed;

	let normalizedSearch = convertZeroZeroToPlus(search);
	normalizedSearch = normalizedSearch.replace(/[\s\-+]/g, "");

	const hasLetters = /\p{L}/u.test(search);
	const lettersOnly = search.replace(/[^\p{L}\s]/gu, "").trim();
	const isNumericOnly = !hasLetters && (/[0-9]/.test(search) || raw.startsWith("+") || raw.startsWith("00"));

	const numberMatches =
		isNumericOnly && normalizedSearch.length >= 2
			? indexed.filter((option) => {
					const normalizedDisplay = String(option.displayNumber || option.number)
						.toLowerCase()
						.replace(/[\s\-+]/g, "");
					const matchesNumber =
						option.__normalizedNumber.includes(normalizedSearch) || normalizedDisplay.includes(normalizedSearch);
					return matchesNumber;
				})
			: [];

	let fuzzyMatches: IndexedPhoneOption[] = [];
	if (hasLetters && lettersOnly.length > 0) {
		try {
			fuzzyMatches = fuzzySearchItems<IndexedPhoneOption>(fuse, lettersOnly);
		} catch {
			fuzzyMatches = [];
		}
	}

	const seen = new Set<string>();
	const pushUnique = (list: IndexedPhoneOption[], acc: IndexedPhoneOption[]) => {
		for (const item of list) {
			const key = item.number;
			if (!seen.has(key)) {
				seen.add(key);
				acc.push(item);
			}
		}
	};

	const merged: IndexedPhoneOption[] = [];
	if (isNumericOnly) {
		pushUnique(numberMatches, merged);
	} else {
		pushUnique(fuzzyMatches, merged);
		pushUnique(numberMatches, merged);
	}

	return merged;
}

export function getVisiblePhones(
	filtered: IndexedPhoneOption[],
	selectedPhone: string,
	limit: number
): IndexedPhoneOption[] {
	if (!selectedPhone) return filtered.slice(0, limit);
	const normalize = (s: string) =>
		String(s)
			.replace(/[\s\-+]/g, "")
			.toLowerCase();
	const selectedIndex = filtered.findIndex(
		(opt) => opt.number === selectedPhone || normalize(opt.number) === normalize(selectedPhone)
	);
	if (selectedIndex < 0) return filtered.slice(0, limit);
	const half = Math.floor(limit / 2);
	const maxStart = Math.max(0, filtered.length - limit);
	const start = Math.max(0, Math.min(maxStart, selectedIndex - half));
	const end = Math.min(filtered.length, start + limit);
	return filtered.slice(start, end);
}

export function getAddPreviewDisplay(
	rawSearch: string,
	country: string | undefined,
	getCallingCode: (c: string) => string | number
): string {
	const raw = (rawSearch || "").trim();
	if (!raw) return "";
	const digits = raw.replace(/\D/g, "");
	try {
		const selected = (country as string) || "SA";
		const cc = String(getCallingCode(selected));
		return digits ? `+${cc}${digits}` : `+${cc} `;
	} catch {
		return digits ? `+${digits}` : "+";
	}
}

export function canCreateNewPhone(allowCreateNew: boolean, rawSearch: string, indexed: IndexedPhoneOption[]): boolean {
	if (!allowCreateNew) return false;
	const raw = (rawSearch || "").trim();
	if (!raw) return false;
	const lower = raw.toLowerCase();
	const hasLetters = /\p{L}/u.test(lower);
	const isNumericOnly = !hasLetters && (/[0-9]/.test(lower) || raw.startsWith("+") || raw.startsWith("00"));
	if (!isNumericOnly) return false;
	const normalized = convertZeroZeroToPlus(lower).replace(/[\s\-+]/g, "");
	if (normalized.length < 6) return false;
	const existsExact = indexed.some((opt) => opt.__normalizedNumber === normalized);
	return !existsExact;
}
