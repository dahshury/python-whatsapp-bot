"use client";

import type {
  ConversationAnalysis,
  CustomerActivity,
  MessageHeatmapData,
  WordFrequency,
} from "@/features/dashboard/types";
import { usePagination } from "../hooks/usePagination";
import { CustomerActivityList } from "../ui/customer-activity-list";
import { MessageAnalysisStats } from "../ui/message-analysis-stats";
import { MessageHeatmap } from "../ui/message-heatmap";
import { WordFrequencyChart } from "../ui/word-frequency-chart";

type MessageAnalysisProps = {
  messageHeatmap: MessageHeatmapData[];
  topCustomers: CustomerActivity[];
  conversationAnalysis: ConversationAnalysis;
  wordFrequency: WordFrequency[];
  wordFrequencyByRole?: { user: WordFrequency[]; assistant: WordFrequency[] };
  isLocalized: boolean;
};

export function MessageAnalysis({
  messageHeatmap,
  topCustomers,
  conversationAnalysis,
  wordFrequencyByRole,
  isLocalized,
}: MessageAnalysisProps) {
  const customersPerPage = 10;
  const maxCustomers = 100;

  // Use real data only to avoid extra rendering cost
  const limitedCustomers = topCustomers.slice(0, maxCustomers);

  const pagination = usePagination({
    totalItems: limitedCustomers.length,
    itemsPerPage: customersPerPage,
  });

  const paginatedCustomers = limitedCustomers.slice(
    pagination.currentPage * customersPerPage,
    (pagination.currentPage + 1) * customersPerPage
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <MessageAnalysisStats
          conversationAnalysis={conversationAnalysis}
          isLocalized={isLocalized}
        />
      </div>

      <MessageHeatmap
        isLocalized={isLocalized}
        messageHeatmap={messageHeatmap}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CustomerActivityList
          customers={limitedCustomers}
          customersPerPage={customersPerPage}
          isLocalized={isLocalized}
          maxCustomers={maxCustomers}
          paginatedCustomers={paginatedCustomers}
          pagination={pagination}
        />

        <WordFrequencyChart
          {...(wordFrequencyByRole ? { wordFrequencyByRole } : {})}
          isLocalized={isLocalized}
        />
      </div>
    </div>
  );
}
