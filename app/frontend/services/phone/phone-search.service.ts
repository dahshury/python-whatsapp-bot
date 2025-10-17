import { normalizePhoneNumber } from "@shared/libs/utils/phone-utils";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";

// Constants for phone search
const LETTER_PATTERN = /\p{L}/u;
const SPACE_DASH_PLUS_PATTERN = /[\s\-+]/g;
const NUMERIC_PATTERN = /[0-9]/;
const MIN_NORMALIZED_PHONE_LENGTH = 6;

export function filterPhones(
	indexed: IndexedPhoneOption[],
	rawSearch: string
): IndexedPhoneOption[] {
	const raw = (rawSearch || "").trim();
	const search = raw.toLowerCase();
	if (!search) {
		return indexed;
	}

	let normalizedSearch = normalizePhoneNumber(search);
	normalizedSearch = normalizedSearch.replace(SPACE_DASH_PLUS_PATTERN, "");

	const hasLetters = LETTER_PATTERN.test(search);
	const isNumericOnly =
		!hasLetters &&
		(NUMERIC_PATTERN.test(search) ||
			raw.startsWith("+") ||
			raw.startsWith("00"));

	const numberMatches =
		isNumericOnly && normalizedSearch.length >= 2
			? indexed.filter((option) => {
					const normalizedDisplay = String(
						option.displayNumber || option.number
					)
						.toLowerCase()
						.replace(SPACE_DASH_PLUS_PATTERN, "");
					const matchesNumber =
						option.__normalizedNumber.includes(normalizedSearch) ||
						normalizedDisplay.includes(normalizedSearch);
					return matchesNumber;
				})
			: [];

	// Fuzzy (name) matching is now handled on the backend via WebSocket search
	// No local fuzzy matches

	const seen = new Set<string>();
	const pushUnique = (
		list: IndexedPhoneOption[],
		acc: IndexedPhoneOption[]
	) => {
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
		// Names matched from backend; only local numeric prefix matching here
		pushUnique(numberMatches, merged);
	}

	return merged;
}

export function getVisiblePhones(
	filtered: IndexedPhoneOption[],
	selectedPhone: string,
	limit: number
): IndexedPhoneOption[] {
	if (!selectedPhone) {
		return filtered.slice(0, limit);
	}
	const normalize = (s: string) =>
		String(s).replace(SPACE_DASH_PLUS_PATTERN, "").toLowerCase();
	const selectedIndex = filtered.findIndex(
		(opt) =>
			opt.number === selectedPhone ||
			normalize(opt.number) === normalize(selectedPhone)
	);
	if (selectedIndex < 0) {
		return filtered.slice(0, limit);
	}
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
	if (!raw) {
		return "";
	}
	const digits = raw.replace(/\D/g, "");
	try {
		const selected = (country as string) || "SA";
		const cc = String(getCallingCode(selected));
		return digits ? `+${cc}${digits}` : `+${cc} `;
	} catch {
		return digits ? `+${digits}` : "+";
	}
}

export function canCreateNewPhone(
	allowCreateNew: boolean,
	rawSearch: string,
	indexed: IndexedPhoneOption[]
): boolean {
	if (!allowCreateNew) {
		return false;
	}
	const raw = (rawSearch || "").trim();
	if (!raw) {
		return false;
	}
	const lower = raw.toLowerCase();
	const hasLetters = LETTER_PATTERN.test(lower);
	const isNumericOnly =
		!hasLetters &&
		(NUMERIC_PATTERN.test(lower) ||
			raw.startsWith("+") ||
			raw.startsWith("00"));
	if (!isNumericOnly) {
		return false;
	}
	const normalized = normalizePhoneNumber(lower).replace(
		SPACE_DASH_PLUS_PATTERN,
		""
	);
	if (normalized.length < MIN_NORMALIZED_PHONE_LENGTH) {
		return false;
	}
	const existsExact = indexed.some(
		(opt) => opt.__normalizedNumber === normalized
	);
	return !existsExact;
}
