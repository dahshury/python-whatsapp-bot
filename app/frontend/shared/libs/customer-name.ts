import { i18n } from "@/shared/libs/i18n";

const PHONE_NORMALIZE_REGEX = /[\s()+-]/g;

function normalizeComparable(value: string): string {
  return value.replace(PHONE_NORMALIZE_REGEX, "");
}

function buildPlaceholderSet(): Set<string> {
  const english = i18n.getMessage("phone_unknown_label", false).toLowerCase();
  const localized = i18n.getMessage("phone_unknown_label", true).toLowerCase();
  const generic = ["unknown", "unavailable", "unnamed"].map((value) =>
    value.toLowerCase()
  );
  return new Set<string>([english, localized, ...generic]);
}

const PLACEHOLDER_CACHE = buildPlaceholderSet();

export function isSameAsWaId(candidate: string, waId: string): boolean {
  if (!candidate) {
    return false;
  }
  if (!waId) {
    return false;
  }
  return normalizeComparable(candidate) === normalizeComparable(waId);
}

export function isPlaceholderName(candidate: string): boolean {
  if (!candidate) {
    return false;
  }
  return PLACEHOLDER_CACHE.has(candidate.trim().toLowerCase());
}

export function getUnknownCustomerLabel(isLocalized?: boolean): string {
  return i18n.getMessage("phone_unknown_label", isLocalized);
}

export function resolveCustomerDisplayName(options: {
  waId: string;
  candidates: unknown[];
  isLocalized?: boolean;
}): string {
  const { waId, candidates, isLocalized } = options;
  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }
    if (isPlaceholderName(trimmed)) {
      continue;
    }
    if (isSameAsWaId(trimmed, waId)) {
      continue;
    }
    return trimmed;
  }
  return getUnknownCustomerLabel(isLocalized);
}
