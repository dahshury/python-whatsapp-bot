"use client";

import { motion } from "framer-motion";
import { Clock, Minus, Timer, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { i18n } from "@/lib/i18n";
import type { ConversationAnalysis } from "@/types/dashboard";

interface ResponseTimeAnalysisProps {
	conversationAnalysis: ConversationAnalysis;
	isLocalized: boolean;
}

interface ResponseTimeMetricProps {
	title: string;
	value: number;
	unit: string;
	icon: React.ReactNode;
	variant?: "default" | "success" | "warning" | "danger";
	description?: string;
}

function ResponseTimeMetric({
	title,
	value,
	unit,
	icon,
	variant = "default",
	description,
}: ResponseTimeMetricProps) {
	const getVariantClasses = () => {
		switch (variant) {
			case "success":
				return "border-green-200 bg-green-50/50";
			case "warning":
				return "border-yellow-200 bg-yellow-50/50";
			case "danger":
				return "border-red-200 bg-red-50/50";
			default:
				return "";
		}
	};

	const getValueColor = () => {
		switch (variant) {
			case "success":
				return "text-green-700";
			case "warning":
				return "text-yellow-700";
			case "danger":
				return "text-red-700";
			default:
				return "text-foreground";
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<Card className={`h-full ${getVariantClasses()}`}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">{title}</CardTitle>
					{icon}
				</CardHeader>
				<CardContent>
					<div className={`text-2xl font-bold ${getValueColor()}`}>
						{value.toFixed(1)}
						{unit}
					</div>
					{description && (
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}

export function ResponseTimeAnalysis({
	conversationAnalysis,
	isLocalized,
}: ResponseTimeAnalysisProps) {
	const { responseTimeStats } = conversationAnalysis;

	// Determine performance levels based on response times
	const getPerformanceVariant = (
		time: number,
	): "success" | "warning" | "danger" | "default" => {
		if (time <= 2) return "success";
		if (time <= 5) return "default";
		if (time <= 10) return "warning";
		return "danger";
	};

	const responseTimeMetrics = [
		{
			title: i18n.getMessage("response_time_average", isLocalized),
			value: responseTimeStats.avg,
			unit: i18n.getMessage("msg_minutes", isLocalized),
			icon: <Clock className="h-4 w-4 text-muted-foreground" />,
			variant: getPerformanceVariant(responseTimeStats.avg),
			description: i18n.getMessage("response_time_avg_desc", isLocalized),
		},
		{
			title: i18n.getMessage("response_time_median", isLocalized),
			value: responseTimeStats.median,
			unit: i18n.getMessage("msg_minutes", isLocalized),
			icon: <Minus className="h-4 w-4 text-muted-foreground" />,
			variant: getPerformanceVariant(responseTimeStats.median),
			description: i18n.getMessage("response_time_median_desc", isLocalized),
		},
		{
			title: i18n.getMessage("response_time_maximum", isLocalized),
			value: responseTimeStats.max,
			unit: i18n.getMessage("msg_minutes", isLocalized),
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			variant: getPerformanceVariant(responseTimeStats.max),
			description: i18n.getMessage("response_time_max_desc", isLocalized),
		},
	];

	// Calculate performance score based on average response time
	const performanceScore = Math.max(0, 100 - responseTimeStats.avg * 10);
	const getScoreColor = (score: number) => {
		if (score >= 80) return "text-green-600";
		if (score >= 60) return "text-yellow-600";
		return "text-red-600";
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">
					{i18n.getMessage("response_time_analysis_title", isLocalized)}
				</h2>
				<Badge variant="outline" className={getScoreColor(performanceScore)}>
					{i18n.getMessage("response_time_score", isLocalized)}:{" "}
					{performanceScore.toFixed(0)}%
				</Badge>
			</div>

			<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
				{responseTimeMetrics.map((metric, index) => (
					<motion.div
						key={metric.title}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1, duration: 0.4 }}
					>
						<ResponseTimeMetric
							title={metric.title}
							value={metric.value}
							unit={metric.unit}
							icon={metric.icon}
							variant={metric.variant}
							description={metric.description}
						/>
					</motion.div>
				))}
			</div>

			{/* Performance Progress Bar */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm flex items-center gap-2">
						<Timer className="h-4 w-4" />
						{i18n.getMessage("response_time_performance", isLocalized)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-muted-foreground">
								{i18n.getMessage("response_time_performance_desc", isLocalized)}
							</span>
							<span
								className={`text-sm font-semibold ${getScoreColor(performanceScore)}`}
							>
								{performanceScore.toFixed(0)}%
							</span>
						</div>
						<Progress value={performanceScore} className="h-2" />
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>{i18n.getMessage("response_time_slow", isLocalized)}</span>
							<span>{i18n.getMessage("response_time_fast", isLocalized)}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
