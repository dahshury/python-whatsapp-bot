import {
  WORD_ASSISTANT_SHARE_RATIO,
  WORD_CUSTOMER_SHARE_RATIO,
  WORD_FREQUENCY_TOP_LIMIT,
} from "../dashboard/constants";
import type { WordFrequency } from "../types";

export type EnhancedWordFrequency = {
  word: string;
  customerCount: number;
  assistantCount: number;
  totalCount: number;
};

/**
 * Enhance word frequency data by splitting counts between customer and assistant
 * Prefer backend-provided word frequency to avoid heavy client processing
 * @param wordFrequency - Array of word frequency data from backend
 * @returns Enhanced word frequency with customer/assistant split
 */
export function enhanceWordFrequency(
  wordFrequency: WordFrequency[]
): EnhancedWordFrequency[] {
  if (wordFrequency && wordFrequency.length > 0) {
    return wordFrequency.slice(0, WORD_FREQUENCY_TOP_LIMIT).map((word) => ({
      word: word.word,
      customerCount: Math.floor(word.count * WORD_CUSTOMER_SHARE_RATIO),
      assistantCount: Math.ceil(word.count * WORD_ASSISTANT_SHARE_RATIO),
      totalCount: word.count,
    }));
  }
  return [];
}
