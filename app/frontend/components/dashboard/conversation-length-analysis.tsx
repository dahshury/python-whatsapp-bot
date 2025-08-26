"use client";

import { motion } from "framer-motion";
import { BarChart3, MessageSquare, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { i18n } from "@/lib/i18n";
import type { ConversationAnalysis } from "@/types/dashboard";

interface ConversationLengthAnalysisProps {
	conversationAnalysis: ConversationAnalysis;
	isRTL: boolean;
}

interface ConversationMetricProps {
	title: string;
	value: number;
	unit: string;
	icon: React.ReactNode;
	description?: string;
}

function ConversationMetric({
	title,
	value,
	unit,
	icon,
	description,
}: ConversationMetricProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<Card className="h-full">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">{title}</CardTitle>
					{icon}
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						{value.toFixed(1)} {unit}
					</div>
					{description && (
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}

export function ConversationLengthAnalysis({
	conversationAnalysis,
	isRTL,
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
			title: i18n.getMessage("conversation_length_average", isRTL),
			value: avgMessages,
			unit: i18n.getMessage("msg_messages", isRTL),
			icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
			description: i18n.getMessage("conversation_per_customer", isRTL),
		},
		{
			title: i18n.getMessage("conversation_length_median", isRTL),
			value: medianMessages,
			unit: i18n.getMessage("msg_messages", isRTL),
			icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
			description: i18n.getMessage("conversation_per_customer", isRTL),
		},
		{
			title: i18n.getMessage("conversation_length_maximum", isRTL),
			value: maxMessages,
			unit: i18n.getMessage("msg_messages", isRTL),
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			description: i18n.getMessage("conversation_per_customer", isRTL),
		},
	];

	// Calculate engagement level based on average messages
	const getEngagementLevel = (avgMessages: number) => {
		if (avgMessages >= 20)
			return {
				level: "high",
				color: "text-green-600",
				label: i18n.getMessage("engagement_high", isRTL),
			};
		if (avgMessages >= 10)
			return {
				level: "medium",
				color: "text-yellow-600",
				label: i18n.getMessage("engagement_medium", isRTL),
			};
		return {
			level: "low",
			color: "text-red-600",
			label: i18n.getMessage("engagement_low", isRTL),
		};
	};

	const engagement = getEngagementLevel(avgMessagesPerCustomer);
	const engagementScore = Math.min(100, (avgMessagesPerCustomer / 30) * 100); // Scale to 100

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">
					{i18n.getMessage("conversation_analysis_title", isRTL)}
				</h2>
				<Badge variant="outline" className={engagement.color}>
					{engagement.label}
				</Badge>
			</div>

			<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
				{conversationMetrics.map((metric, index) => (
					<motion.div
						key={metric.title}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1, duration: 0.4 }}
					>
						<ConversationMetric
							title={metric.title}
							value={metric.value}
							unit={metric.unit}
							icon={metric.icon}
							description={metric.description}
						/>
					</motion.div>
				))}
			</div>

			{/* Overall Statistics */}
			<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm flex items-center gap-2">
							<Users className="h-4 w-4" />
							{i18n.getMessage("conversation_overview", isRTL)}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">
								{i18n.getMessage("msg_total_messages", isRTL)}
							</span>
							<span className="font-semibold">
								{totalMessages.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">
								{i18n.getMessage("msg_unique_customers", isRTL)}
							</span>
							<span className="font-semibold">
								{uniqueCustomers.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">
								{i18n.getMessage("conversation_avg_per_customer", isRTL)}
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
							{i18n.getMessage("conversation_engagement", isRTL)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground">
									{i18n.getMessage("conversation_engagement_level", isRTL)}
								</span>
								<span className={`text-sm font-semibold ${engagement.color}`}>
									{engagement.label}
								</span>
							</div>
							<Progress value={engagementScore} className="h-2" />
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>{i18n.getMessage("engagement_low", isRTL)}</span>
								<span>{i18n.getMessage("engagement_high", isRTL)}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
