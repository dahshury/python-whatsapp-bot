import type {
  DashboardConversationMessage,
  WordFrequency,
} from "@/features/dashboard/types";

const DIGITS_REGEX = /[\d]+/g;
const NON_TEXT_REGEX = /[^\w\s\u0600-\u06FF]/g;
const MIN_WORD_LENGTH = 3;
const SPLIT_REGEX = /\s+/;

const TOP_N = 50;

export function computeWordFrequency(
  entries: [string, DashboardConversationMessage[]][]
): WordFrequency[] {
  const words: Record<string, number> = {};
  for (const [, msgs] of entries) {
    for (const m of Array.isArray(msgs) ? msgs : []) {
      const text = (
        (m as DashboardConversationMessage).text ||
        (m as DashboardConversationMessage).message ||
        ""
      )
        .toString()
        .toLowerCase();
      const tokens = text
        .replace(DIGITS_REGEX, " ")
        .replace(NON_TEXT_REGEX, " ")
        .split(SPLIT_REGEX)
        .filter((w: string) => w.length >= MIN_WORD_LENGTH);
      for (const t of tokens) {
        words[t] = (words[t] || 0) + 1;
      }
    }
  }
  return Object.entries(words)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}
