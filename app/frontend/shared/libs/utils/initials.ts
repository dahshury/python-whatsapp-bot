const WHITESPACE_REGEX = /\s+/;

export function getInitials(name?: string): string {
  try {
    if (!(name && String(name).trim())) {
      return "??";
    }
    const trimmed = String(name).trim();
    const words = trimmed.split(WHITESPACE_REGEX).filter(Boolean);
    if (words.length === 0) {
      return trimmed.slice(0, 2).toUpperCase();
    }
    if (words.length === 1) {
      return trimmed.slice(0, 2).toUpperCase();
    }
    // Take first letter of first word and first letter of last word
    const first = words[0]?.[0] || "";
    const last = words.at(-1)?.[0] || "";
    return `${first}${last}`.toUpperCase();
  } catch {
    return "??";
  }
}
