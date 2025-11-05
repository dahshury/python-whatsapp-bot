import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";

type BuildPhoneGroupsConfig = {
  selectedPhone?: string;
  recentLimit?: number;
  totalLimit?: number;
  locale?: string;
};

type PhoneGroupKey = "selected" | "recent" | "all";

export type PhoneGroup<T extends { number: string }> = {
  key: PhoneGroupKey;
  items: T[];
};

export type PhoneGroupingResult<T extends { number: string }> = {
  groups: PhoneGroup<T>[];
  counts: { selected: number; recent: number; all: number };
  ordered: T[];
};

const DEFAULT_RECENT_LIMIT = 50;
const DEFAULT_TOTAL_LIMIT = 400;

export const buildAlphabeticalCollator = (locale?: string) =>
  new Intl.Collator(locale || "en", {
    numeric: true,
    sensitivity: "base",
  });

export const getSortValue = (option: IndexedPhoneOption): string =>
  option.name?.trim() ||
  option.displayNumber?.trim() ||
  option.label?.trim() ||
  option.number;

/**
 * Checks if a phone option has a valid display name.
 * A valid name is one that:
 * - Exists and is not empty after trimming
 * - Is different from the phone number (with or without formatting)
 * - Is different from the normalized phone number
 */
export const hasDisplayName = (option: IndexedPhoneOption): boolean => {
  if (!option.name || option.name.trim().length === 0) {
    return false;
  }

  const trimmedName = option.name.trim();
  const normalizedName = trimmedName.replace(/[\s\-+]/g, "");
  const normalizedNumber =
    option.__normalizedNumber || option.number.replace(/[\s\-+]/g, "");
  const phoneNumber = option.number;

  // Name is valid if it's different from both the formatted and normalized phone numbers
  return trimmedName !== phoneNumber && normalizedName !== normalizedNumber;
};

/**
 * Sorts phone options alphabetically by contact name/label/number.
 * Contacts with names are prioritized over those without names.
 *
 * @param options - Array of phone options to sort
 * @param locale - Optional locale for collation (defaults to 'en')
 * @returns Sorted array of phone options
 */
export function sortPhoneOptionsAlphabetically<T extends IndexedPhoneOption>(
  options: T[],
  locale?: string
): T[] {
  const collator = buildAlphabeticalCollator(locale);
  return [...options].sort((a, b) => {
    const aHasName = hasDisplayName(a);
    const bHasName = hasDisplayName(b);
    if (aHasName !== bHasName) {
      return aHasName ? -1 : 1;
    }
    const aValue = aHasName
      ? (a.name?.trim() ?? getSortValue(a))
      : getSortValue(a);
    const bValue = bHasName
      ? (b.name?.trim() ?? getSortValue(b))
      : getSortValue(b);
    return collator.compare(aValue, bValue);
  });
}

export function buildPhoneGroups<T extends IndexedPhoneOption>(
  phones: T[],
  config: BuildPhoneGroupsConfig = {}
): PhoneGroupingResult<T> {
  const {
    selectedPhone,
    recentLimit = DEFAULT_RECENT_LIMIT,
    totalLimit = DEFAULT_TOTAL_LIMIT,
    locale,
  } = config;

  // Deduplicate by phone number to avoid duplicate entries in UI
  const dedupedMap = new Map<string, T>();
  for (const option of phones) {
    if (!dedupedMap.has(option.number)) {
      dedupedMap.set(option.number, option);
    }
  }
  const uniqueOptions = Array.from(dedupedMap.values());

  // Sort by recency and select top N with known message timestamps
  const recencySorted = uniqueOptions
    .filter((option) => {
      const lastMessage = option.lastMessageAt ?? 0;
      const lastReservation = option.lastReservationAt ?? 0;
      return Math.max(lastMessage ?? 0, lastReservation ?? 0) > 0;
    })
    .sort((a, b) => {
      const aLatest = Math.max(a.lastMessageAt ?? 0, a.lastReservationAt ?? 0);
      const bLatest = Math.max(b.lastMessageAt ?? 0, b.lastReservationAt ?? 0);
      return bLatest - aLatest;
    });

  const recentOptions = recencySorted.slice(0, Math.max(recentLimit, 0));

  // Extract selected phone into its own group (if exists)
  let selectedOption: T | undefined;
  const selectedSet = new Set<string>();
  if (selectedPhone) {
    selectedOption = uniqueOptions.find(
      (option) => option.number === selectedPhone
    );
    if (selectedOption) {
      selectedSet.add(selectedOption.number);
    }
  }

  // Remove selected from recent set
  const recentWithoutSelected = recentOptions.filter(
    (option) => !selectedSet.has(option.number)
  );
  const recentSetWithoutSelected = new Set(
    recentWithoutSelected.map((option) => option.number)
  );

  // Remaining options sorted alphabetically by contact name/label/number
  const remainingOptions = sortPhoneOptionsAlphabetically(
    uniqueOptions.filter(
      (option) =>
        !(
          selectedSet.has(option.number) ||
          recentSetWithoutSelected.has(option.number)
        )
    ),
    locale
  );

  const orderedOptions: T[] = [];
  if (selectedOption) {
    orderedOptions.push(selectedOption);
  }
  orderedOptions.push(...recentWithoutSelected, ...remainingOptions);

  // Dedupe again to ensure unique ordering after potential insertion
  const seenAfterInsertion = new Set<string>();
  const dedupedOrdered: T[] = [];
  for (const option of orderedOptions) {
    if (!seenAfterInsertion.has(option.number)) {
      seenAfterInsertion.add(option.number);
      dedupedOrdered.push(option);
    }
  }

  // Apply total cap while keeping the selected phone visible when possible
  let limitedOrdered = dedupedOrdered;
  if (
    totalLimit > 0 &&
    Number.isFinite(totalLimit) &&
    dedupedOrdered.length > totalLimit
  ) {
    if (selectedOption) {
      // Selected is always first, so keep it and limit the rest
      const rest = dedupedOrdered.slice(1);
      const restLimited = rest.slice(0, totalLimit - 1);
      limitedOrdered = [selectedOption, ...restLimited];
    } else {
      limitedOrdered = dedupedOrdered.slice(0, totalLimit);
    }

    // Remove any accidental duplicates introduced by the selection logic
    const seenLimited = new Set<string>();
    limitedOrdered = limitedOrdered.filter((option) => {
      if (seenLimited.has(option.number)) {
        return false;
      }
      seenLimited.add(option.number);
      return true;
    });
  }

  const visibleSelected =
    selectedOption &&
    limitedOrdered.some((opt) => opt.number === selectedOption.number)
      ? [selectedOption]
      : [];
  const visibleRecent = limitedOrdered.filter((option) =>
    recentSetWithoutSelected.has(option.number)
  );
  const visibleAll = limitedOrdered.filter(
    (option) =>
      !(
        selectedSet.has(option.number) ||
        recentSetWithoutSelected.has(option.number)
      )
  );

  const groups: PhoneGroup<T>[] = [];
  if (visibleSelected.length > 0) {
    groups.push({ key: "selected", items: visibleSelected });
  }
  if (visibleRecent.length > 0) {
    groups.push({ key: "recent", items: visibleRecent });
  }
  if (visibleAll.length > 0) {
    groups.push({ key: "all", items: visibleAll });
  }

  return {
    groups,
    counts: {
      selected: selectedOption ? 1 : 0,
      recent: recentWithoutSelected.length,
      all: remainingOptions.length,
    },
    ordered: limitedOrdered,
  };
}
