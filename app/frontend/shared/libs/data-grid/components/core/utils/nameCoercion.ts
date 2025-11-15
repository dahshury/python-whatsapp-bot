import type { IColumnDefinition } from "../interfaces/IDataSource";

const ASCII_LETTERS_AND_SPACES_REGEX = /^[A-Za-z\s]+$/;
const NON_LETTER_REGEX = /[^\p{L}\s]/gu;
const MULTISPACE_REGEX = /\s+/g;
const DIGIT_REGEX = /\d+/g;
const NAME_COLUMN_ID = "name";

type NameColumnShape =
  | Pick<IColumnDefinition, "id" | "name" | "title">
  | {
      id?: string;
      name?: string;
      title?: string;
    };

function pickColumnIdentifier(column?: NameColumnShape): string | undefined {
  if (!column) {
    return;
  }
  if (typeof column.id === "string") {
    return column.id;
  }
  if (typeof column.name === "string") {
    return column.name;
  }
  if (typeof column.title === "string") {
    return column.title;
  }
  return;
}

function toEnglishTitleCase(value: string): string {
  return value
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => {
      const [first, ...rest] = word;
      if (first === undefined) {
        return "";
      }
      const tail = rest.join("");
      return `${first.toUpperCase()}${tail.toLowerCase()}`;
    })
    .join(" ");
}

export function isNameColumnDefinition(column?: NameColumnShape): boolean {
  const identifier = pickColumnIdentifier(column);
  if (!identifier) {
    return false;
  }
  return identifier.trim().toLowerCase() === NAME_COLUMN_ID;
}

export function coerceNameValue(rawValue: unknown): string {
  let resolved: string;
  if (rawValue === null || rawValue === undefined) {
    resolved = "";
  } else if (typeof rawValue === "string") {
    resolved = rawValue;
  } else {
    resolved = String(rawValue);
  }

  if (!resolved) {
    return "";
  }

  const normalized = resolved.normalize("NFKC").trim();
  if (!normalized) {
    return "";
  }

  const stripped = normalized
    .replace(DIGIT_REGEX, " ")
    .replace(NON_LETTER_REGEX, " ")
    .replace(MULTISPACE_REGEX, " ")
    .trim();

  if (!stripped) {
    return "";
  }

  if (ASCII_LETTERS_AND_SPACES_REGEX.test(stripped)) {
    return toEnglishTitleCase(stripped);
  }

  return stripped;
}

export function coerceNameValueIfNeeded(
  value: string,
  column: NameColumnShape
): string {
  if (!isNameColumnDefinition(column)) {
    return value;
  }
  return coerceNameValue(value);
}
