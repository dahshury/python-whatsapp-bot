"use client";

import { motion } from "framer-motion";
import { BarChart3, MessageSquare, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { ConversationAnalysis } from "@/features/dashboard/types";
import { i18n } from "@/shared/libs/i18n";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";

const HIGH_ENGAGEMENT_THRESHOLD = 20;
const MEDIUM_ENGAGEMENT_THRESHOLD = 10;
const ENGAGEMENT_SCORE_MAX = 100;
const ENGAGEMENT_SCORE_NORMALIZER = 30;
const METRIC_ANIMATION_DURATION = 0.4;
const METRIC_ANIMATION_DELAY_STEP = 0.1;
const METRIC_INITIAL_OFFSET = 20;

type ConversationLengthAnalysisProps = {
  conversationAnalysis: ConversationAnalysis;
  isLocalized: boolean;
};

type ConversationMetricProps = {
  title: string;
  value: number;
  unit: string;
  icon: ReactNode;
  description?: string;
};

function ConversationMetric({
  title,
  value,
  unit,
  icon,
  description,
}: ConversationMetricProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: METRIC_INITIAL_OFFSET }}
      transition={{ duration: METRIC_ANIMATION_DURATION }}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">
            {value.toFixed(1)} {unit}
          </div>
          {description && (
            <p className="mt-1 text-muted-foreground text-xs">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ConversationLengthAnalysis({
  conversationAnalysis,
  isLocalized,
}: ConversationLengthAnalysisProps) {
  const {
    avgMessagesPerCustomer,
    totalMessages,
    uniqueCustomers,
    messageCountDistribution,
  } = conversationAnalysis;

  // Use real calculated values from the dashboard service
  const avgMessages = messageCountDistribution.avg;
  const medianMessages = messageCountDistribution.median;
  const maxMessages = messageCountDistribution.max;

  const conversationMetrics = [
    {
      title: i18n.getMessage("conversation_length_average", isLocalized),
      value: avgMessages,
      unit: i18n.getMessage("msg_messages", isLocalized),
      icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
      description: i18n.getMessage("conversation_per_customer", isLocalized),
    },
    {
      title: i18n.getMessage("conversation_length_median", isLocalized),
      value: medianMessages,
      unit: i18n.getMessage("msg_messages", isLocalized),
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      description: i18n.getMessage("conversation_per_customer", isLocalized),
    },
    {
      title: i18n.getMessage("conversation_length_maximum", isLocalized),
      value: maxMessages,
      unit: i18n.getMessage("msg_messages", isLocalized),
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      description: i18n.getMessage("conversation_per_customer", isLocalized),
    },
  ];

  // Calculate engagement level based on average messages
  const getEngagementLevel = (messageCount: number) => {
    if (messageCount >= HIGH_ENGAGEMENT_THRESHOLD) {
      return {
        level: "high",
        color: "text-green-600",
        label: i18n.getMessage("engagement_high", isLocalized),
      };
    }
    if (messageCount >= MEDIUM_ENGAGEMENT_THRESHOLD) {
      return {
        level: "medium",
        color: "text-yellow-600",
        label: i18n.getMessage("engagement_medium", isLocalized),
      };
    }
    return {
      level: "low",
      color: "text-red-600",
      label: i18n.getMessage("engagement_low", isLocalized),
    };
  };

  const engagement = getEngagementLevel(avgMessagesPerCustomer);
  const engagementScore = Math.min(
    ENGAGEMENT_SCORE_MAX,
    (avgMessagesPerCustomer / ENGAGEMENT_SCORE_NORMALIZER) *
      ENGAGEMENT_SCORE_MAX
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl">
          {i18n.getMessage("conversation_analysis_title", isLocalized)}
        </h2>
        <Badge className={engagement.color} variant="outline">
          {engagement.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {conversationMetrics.map((metric, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: METRIC_INITIAL_OFFSET }}
            key={metric.title}
            transition={{
              delay: index * METRIC_ANIMATION_DELAY_STEP,
              duration: METRIC_ANIMATION_DURATION,
            }}
          >
            <ConversationMetric
              description={metric.description}
              icon={metric.icon}
              title={metric.title}
              unit={metric.unit}
              value={metric.value}
            />
          </motion.div>
        ))}
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              {i18n.getMessage("conversation_overview", isLocalized)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {i18n.getMessage("msg_total_messages", isLocalized)}
              </span>
              <span className="font-semibold">
                {totalMessages.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {i18n.getMessage("msg_unique_customers", isLocalized)}
              </span>
              <span className="font-semibold">
                {uniqueCustomers.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {i18n.getMessage("conversation_avg_per_customer", isLocalized)}
              </span>
              <span className="font-semibold">
                {avgMessagesPerCustomer.toFixed(1)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {i18n.getMessage("conversation_engagement", isLocalized)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {i18n.getMessage(
                    "conversation_engagement_level",
                    isLocalized
                  )}
                </span>
                <span className={`font-semibold text-sm ${engagement.color}`}>
                  {engagement.label}
                </span>
              </div>
              <Progress className="h-2" value={engagementScore} />
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>{i18n.getMessage("engagement_low", isLocalized)}</span>
                <span>{i18n.getMessage("engagement_high", isLocalized)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
