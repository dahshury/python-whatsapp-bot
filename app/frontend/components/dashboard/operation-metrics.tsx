"use client";

import { motion } from "framer-motion";
import { Calendar, CheckCircle, Edit, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { i18n } from "@/lib/i18n";
import type { PrometheusMetrics } from "@/types/dashboard";

interface OperationMetricsProps {
	prometheusMetrics: PrometheusMetrics;
	isRTL: boolean;
}

interface OperationMetricCardProps {
	title: string;
	icon: React.ReactNode;
	attempts: number;
	success: number;
	failures: number;
	isRTL: boolean;
}

function OperationMetricCard({
	title,
	icon,
	attempts,
	success,
	failures,
	isRTL,
}: OperationMetricCardProps) {
	const successRate = attempts > 0 ? (success / attempts) * 100 : 0;
	const failureRate = attempts > 0 ? (failures / attempts) * 100 : 0;

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
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="text-2xl font-bold">{attempts}</div>
						<Badge variant="outline" className="text-xs">
							{i18n.getMessage("operation_attempts", isRTL)}
						</Badge>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-1">
								<CheckCircle className="h-3 w-3 text-chart-1" />
								<span className="text-chart-1">{success}</span>
							</div>
							<div className="flex items-center gap-1">
								<XCircle className="h-3 w-3 text-destructive" />
								<span className="text-destructive">{failures}</span>
							</div>
						</div>

						<Progress value={successRate} className="h-2" />

						<div className="flex justify-between text-xs text-muted-foreground">
							<span>
								{successRate.toFixed(1)}%{" "}
								{i18n.getMessage("operation_success", isRTL)}
							</span>
							<span>
								{failureRate.toFixed(1)}%{" "}
								{i18n.getMessage("operation_failed", isRTL)}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

export function OperationMetrics({
	prometheusMetrics,
	isRTL,
}: OperationMetricsProps) {
	const hasMetrics =
		prometheusMetrics && Object.keys(prometheusMetrics).length > 0;

	if (!hasMetrics) {
		return (
			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					{i18n.getMessage("operation_metrics_title", isRTL)}
				</h2>
				<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardHeader className="space-y-0 pb-2">
								<Skeleton className="h-4 w-[120px]" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-[80px]" />
								<Skeleton className="h-3 w-[100px] mt-2" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	const operations = [
		{
			title: i18n.getMessage("operation_reservations", isRTL),
			icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
			attempts: prometheusMetrics.reservations_requested_total || 0,
			success: prometheusMetrics.reservations_successful_total || 0,
			failures: prometheusMetrics.reservations_failed_total || 0,
		},
		{
			title: i18n.getMessage("operation_cancellations", isRTL),
			icon: <X className="h-4 w-4 text-muted-foreground" />,
			attempts:
				prometheusMetrics.reservations_cancellation_requested_total || 0,
			success:
				prometheusMetrics.reservations_cancellation_successful_total || 0,
			failures: prometheusMetrics.reservations_cancellation_failed_total || 0,
		},
		{
			title: i18n.getMessage("operation_modifications", isRTL),
			icon: <Edit className="h-4 w-4 text-muted-foreground" />,
			attempts:
				prometheusMetrics.reservations_modification_requested_total || 0,
			success:
				prometheusMetrics.reservations_modification_successful_total || 0,
			failures: prometheusMetrics.reservations_modification_failed_total || 0,
		},
	];

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">
				{i18n.getMessage("operation_metrics_title", isRTL)}
			</h2>

			<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
				{operations.map((operation, index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1, duration: 0.4 }}
					>
						<OperationMetricCard
							title={operation.title}
							icon={operation.icon}
							attempts={operation.attempts}
							success={operation.success}
							failures={operation.failures}
							isRTL={isRTL}
						/>
					</motion.div>
				))}
			</div>
		</div>
	);
}
