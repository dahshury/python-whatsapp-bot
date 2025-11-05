import { computeResponseTimeStats } from "@/features/dashboard/model/calculators/conversation";
import type {
  ConversationAnalysis,
  DashboardConversationMessage,
} from "@/features/dashboard/types";
import { median } from "@/shared/libs/math/stats";

const DIGITS_REGEX = /[\d]+/g;
const NON_TEXT_REGEX = /[^\w\s\u0600-\u06FF]/g;
const SPLIT_REGEX = /\s+/;

export type ConversationEntries = [string, DashboardConversationMessage[]][];

export function computeConversationAnalysis(
  filteredConversations: ConversationEntries,
  uniqueCustomers: number
): ConversationAnalysis {
  let totalMessages = 0;
  let totalChars = 0;
  let totalWords = 0;
  const perCustomerCounts: number[] = [];

  for (const [, msgs] of filteredConversations) {
    const count = Array.isArray(msgs) ? msgs.length : 0;
    perCustomerCounts.push(count);
    totalMessages += count;
    for (const m of Array.isArray(msgs) ? msgs : []) {
      const text = (
        (m as DashboardConversationMessage).text ||
        (m as DashboardConversationMessage).message ||
        ""
      ).toString();
      totalChars += text.length;
      const tokens = text
        .toLowerCase()
        .replace(DIGITS_REGEX, " ")
        .replace(NON_TEXT_REGEX, " ")
        .split(SPLIT_REGEX)
        .filter(Boolean);
      totalWords += tokens.length;
    }
  }

  const respStats = computeResponseTimeStats(filteredConversations);

  return {
    avgMessageLength: totalMessages > 0 ? totalChars / totalMessages : 0,
    avgWordsPerMessage: totalMessages > 0 ? totalWords / totalMessages : 0,
    avgMessagesPerCustomer:
      uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
    totalMessages,
    uniqueCustomers,
    responseTimeStats: respStats,
    messageCountDistribution: {
      avg: uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
      median: median(perCustomerCounts),
      max: perCustomerCounts.length ? Math.max(...perCustomerCounts) : 0,
    },
  };
}
