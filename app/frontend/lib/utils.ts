import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Truncation constants
const TRUNCATE_ELLIPSIS_LENGTH = 3;

export function truncate(text: string, maxLength = 15): string {
  if (typeof text !== "string") {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - TRUNCATE_ELLIPSIS_LENGTH)}...`;
}
