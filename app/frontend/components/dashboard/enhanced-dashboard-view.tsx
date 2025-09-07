"use client";

import { differenceInDays, format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { TransitionPanel } from "@/components/motion-primitives/transition-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeWithPresets } from "@/components/ui/date-range-with-presets";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useDashboardData } from "@/lib/websocket-data-provider";
import type { DashboardFilters } from "@/types/dashboard";
import { ConversationLengthAnalysis } from "./conversation-length-analysis";
import { KPICards } from "./kpi-cards";
import { MessageAnalysis } from "./message-analysis";
import { OperationMetrics } from "./operation-metrics";
import { ResponseTimeAnalysis } from "./response-time-analysis";
import { TrendCharts } from "./trend-charts";

export function EnhancedDashboardView() {
	const { isLocalized } = useLanguage();

	// Initialize with last 30 days as default for both UI and data loading
	const defaultDateRange = React.useMemo(
		() => ({
			from: subDays(new Date(), 30),
			to: new Date(),
		}),
		[],
	);

	const [filters, setFilters] = useState<DashboardFilters>({
		dateRange: defaultDateRange,
	});

	const [activeTab, setActiveTab] = useState("overview");
	const tabOrder = ["overview", "trends", "messages", "insights"] as const;
	const activeIndex = tabOrder.indexOf(activeTab as (typeof tabOrder)[number]);

	// Use smart data loading that fetches filtered data directly from backend
	const {
		dashboardData,
		isLoading,
		error,
		refresh: refreshDashboard,
	} = useDashboardData();
	const [isUsingMockData, setIsUsingMockData] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);

	// Calculate days count properly
	const daysCount = React.useMemo(() => {
		if (!filters.dateRange?.from || !filters.dateRange?.to) return 0;
		return differenceInDays(filters.dateRange.to, filters.dateRange.from) + 1;
	}, [filters.dateRange]);

	// Create stable, safe fallbacks to avoid undefined access and re-mount animations
	const safeDashboard = React.useMemo(
		() => ({
			stats: dashboardData?.stats ?? {
				totalReservations: 0,
				totalCancellations: 0,
				uniqueCustomers: 0,
				conversionRate: 0,
				returningCustomers: 0,
				returningRate: 0,
				avgFollowups: 0,
				avgResponseTime: 0,
				activeCustomers: 0,
			},
			prometheusMetrics: dashboardData?.prometheusMetrics ?? {},
			dailyTrends: dashboardData?.dailyTrends ?? [],
			typeDistribution: dashboardData?.typeDistribution ?? [],
			timeSlots: dashboardData?.timeSlots ?? [],
			messageHeatmap: dashboardData?.messageHeatmap ?? [],
			topCustomers: dashboardData?.topCustomers ?? [],
			conversationAnalysis: dashboardData?.conversationAnalysis ?? {
				avgMessageLength: 0,
				avgWordsPerMessage: 0,
				avgMessagesPerCustomer: 0,
				totalMessages: 0,
				uniqueCustomers: 0,
				responseTimeStats: { avg: 0, median: 0, max: 0 },
				messageCountDistribution: { avg: 0, median: 0, max: 0 },
			},
			wordFrequency: dashboardData?.wordFrequency ?? [],
			dayOfWeekData: dashboardData?.dayOfWeekData ?? [],
			monthlyTrends: dashboardData?.monthlyTrends ?? [],
			funnelData: dashboardData?.funnelData ?? [],
			customerSegments: dashboardData?.customerSegments ?? [],
		}),
		[dashboardData],
	);

	// Smart initialization: always set initial 30-day range on first mount
	useEffect(() => {
		if (!isInitialized) {
			const formatYmd = (d: Date) => {
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				return `${y}-${m}-${day}`;
			};
			refreshDashboard({
				fromDate: formatYmd(defaultDateRange.from),
				toDate: formatYmd(defaultDateRange.to),
			})
				.then(() => {
					setIsInitialized(true);
				})
				.catch((err) => {
					console.error("Dashboard smart initialization error:", err);
				});
		}
	}, [isInitialized, refreshDashboard, defaultDateRange]);

	// When filters change, refresh dashboard data
	useEffect(() => {
		if (isInitialized && filters.dateRange?.from && filters.dateRange?.to) {
			const formatYmd = (d: Date) => {
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				return `${y}-${m}-${day}`;
			};
			// Debounce filter changes to avoid too many requests
			const timeoutId = setTimeout(() => {
				refreshDashboard({
					fromDate: formatYmd(filters.dateRange?.from as Date),
					toDate: formatYmd(filters.dateRange?.to as Date),
				}).catch((err) => {
					console.error("Dashboard filter refresh error:", err);
				});
			}, 250);

			return () => clearTimeout(timeoutId);
		}

		return () => {
			// No cleanup needed when conditions are not met
		};
	}, [filters, refreshDashboard, isInitialized]);

	// Check if using mock data
	useEffect(() => {
		setIsUsingMockData(!!dashboardData?._isMockData);
	}, [dashboardData]);

	const handleDateRangeChange = (dateRange: DateRange | undefined) => {
		if (dateRange?.from && dateRange?.to) {
			setFilters((prev) => ({
				...prev,
				dateRange: {
					from: dateRange.from as Date,
					to: dateRange.to as Date,
				},
			}));
			// Immediate refresh removed; debounced effect will handle
		}
	};

	// Presets are now embedded in the date picker component

	const handleExport = () => {
		if (!dashboardData) return;

		const dataToExport = {
			exportedAt: new Date().toISOString(),
			dateRange: filters.dateRange,
			stats: dashboardData.stats,
			dailyTrends: dashboardData.dailyTrends,
			typeDistribution: dashboardData.typeDistribution,
			timeSlots: dashboardData.timeSlots,
			topCustomers: dashboardData.topCustomers,
			conversationAnalysis: dashboardData.conversationAnalysis,
		};

		const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dashboard-export-${format(new Date(), "yyyy-MM-dd")}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	if (error) {
		return (
			<div className="min-h-[400px] flex items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="p-6 text-center">
						<div className="text-destructive mb-4">
							{/* Error icon SVG */}
							<svg
								className="w-12 h-12 mx-auto"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								role="img"
								aria-label="Error icon"
							>
								<title>Error icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">
							{i18n.getMessage("dashboard_error_title", isLocalized)}
						</h3>
						<p className="text-muted-foreground mb-4">{error}</p>
						<Button onClick={() => refreshDashboard()} variant="outline">
							{i18n.getMessage("dashboard_try_again", isLocalized)}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Show loading state while data is being fetched or if data is incomplete
	if (isLoading || !dashboardData) {
		return (
			<div className="space-y-6">
				{/* Header Skeleton */}
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-96" />
					</div>
					<div className="flex flex-col sm:flex-row gap-2">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>

				{/* KPI Cards Skeleton */}
				<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
					{[
						"total",
						"active",
						"pending",
						"completed",
						"cancelled",
						"revenue",
					].map((metric) => (
						<Card key={`kpi-skeleton-${metric}`} className="h-32">
							<CardHeader className="pb-2">
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16 mb-2" />
								<Skeleton className="h-3 w-20" />
							</CardContent>
						</Card>
					))}
				</div>

				{/* Charts Skeleton */}
				<div className="grid gap-4 md:grid-cols-2">
					<Card className="h-96">
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-64 w-full" />
						</CardContent>
					</Card>
					<Card className="h-96">
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-64 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
			>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{i18n.getMessage("dashboard_title", isLocalized)}
					</h1>
					<p className="text-muted-foreground">
						{i18n.getMessage("dashboard_subtitle", isLocalized) ||
							"Showing all available data. Use date filters to view specific timeframes."}
					</p>
					{isUsingMockData && (
						<div className="mt-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
							<p className="text-sm text-accent-foreground">
								<strong>
									{i18n.getMessage("dashboard_demo_mode", isLocalized)}:
								</strong>{" "}
								{i18n.getMessage("dashboard_demo_description", isLocalized)}
							</p>
						</div>
					)}
				</div>

				{/* Controls */}
				<div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
					<div className="flex flex-col gap-2">
						{/* Days and Reservations badges row */}
						{dashboardData && (
							<div className="flex items-center gap-2 self-start">
								<Badge variant="secondary">
									{daysCount} {i18n.getMessage("dashboard_days", isLocalized)}
								</Badge>
								<Badge variant="outline">
									{dashboardData.stats.totalReservations}{" "}
									{i18n.getMessage("dashboard_reservations", isLocalized)}
								</Badge>
							</div>
						)}

						<div className="flex items-center gap-3">
							<DateRangeWithPresets
								value={filters.dateRange}
								onChange={handleDateRangeChange}
							/>

							<Button
								onClick={handleExport}
								variant="outline"
								size="sm"
								disabled={!dashboardData}
							>
								<Download className="w-4 h-4 mr-2" />
								{i18n.getMessage("dashboard_export", isLocalized)}
							</Button>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Loading State */}
			{isLoading && !dashboardData && (
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						{[
							"reservations",
							"revenue",
							"customers",
							"avg-value",
							"completion",
							"rating",
						].map((stat) => (
							<Card key={`stat-skeleton-${stat}`}>
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
					<div className="grid gap-6 md:grid-cols-2">
						{["trends", "distribution", "performance", "analytics"].map(
							(chart) => (
								<Card key={`chart-skeleton-${chart}`}>
									<CardHeader>
										<Skeleton className="h-6 w-[150px]" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-[300px] w-full" />
									</CardContent>
								</Card>
							),
						)}
					</div>
				</div>
			)}

			{/* Dashboard Content */}
			{dashboardData && (
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-6"
				>
					<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 lg:max-w-[600px]">
						<TabsTrigger value="overview" className="whitespace-nowrap w-full">
							{i18n.getMessage("dashboard_overview", isLocalized)}
						</TabsTrigger>
						<TabsTrigger value="trends" className="whitespace-nowrap w-full">
							{i18n.getMessage("dashboard_trends", isLocalized)}
						</TabsTrigger>
						<TabsTrigger value="messages" className="whitespace-nowrap w-full">
							{i18n.getMessage("dashboard_messages", isLocalized)}
						</TabsTrigger>
						<TabsTrigger value="insights" className="whitespace-nowrap w-full">
							{i18n.getMessage("dashboard_insights", isLocalized)}
						</TabsTrigger>
					</TabsList>

					<div className="overflow-hidden border-t border-zinc-200 dark:border-zinc-700">
						<TransitionPanel
							activeIndex={activeIndex}
							transition={{ duration: 0.2, ease: "easeInOut" }}
							variants={{
								enter: { opacity: 0, y: -50, filter: "blur(4px)" },
								center: { opacity: 1, y: 0, filter: "blur(0px)" },
								exit: { opacity: 0, y: 50, filter: "blur(4px)" },
							}}
							className="pt-4"
						>
							{/* Overview */}
							<div className="space-y-6">
								<KPICards
									stats={safeDashboard.stats}
									prometheusMetrics={safeDashboard.prometheusMetrics}
									isLocalized={isLocalized}
								/>

								<OperationMetrics
									prometheusMetrics={safeDashboard.prometheusMetrics}
									isLocalized={isLocalized}
								/>

								<TrendCharts
									dailyTrends={safeDashboard.dailyTrends}
									typeDistribution={safeDashboard.typeDistribution}
									timeSlots={safeDashboard.timeSlots}
									dayOfWeekData={safeDashboard.dayOfWeekData}
									monthlyTrends={safeDashboard.monthlyTrends}
									funnelData={safeDashboard.funnelData}
									customerSegments={safeDashboard.customerSegments}
									isLocalized={isLocalized}
									variant="compact"
								/>
							</div>

							{/* Trends */}
							<div className="space-y-6">
								<TrendCharts
									dailyTrends={safeDashboard.dailyTrends}
									typeDistribution={safeDashboard.typeDistribution}
									timeSlots={safeDashboard.timeSlots}
									dayOfWeekData={safeDashboard.dayOfWeekData}
									monthlyTrends={safeDashboard.monthlyTrends}
									funnelData={safeDashboard.funnelData}
									customerSegments={safeDashboard.customerSegments}
									isLocalized={isLocalized}
								/>
							</div>

							{/* Messages */}
							<div className="space-y-6">
								<ResponseTimeAnalysis
									conversationAnalysis={dashboardData.conversationAnalysis}
									isLocalized={isLocalized}
								/>

								<ConversationLengthAnalysis
									conversationAnalysis={safeDashboard.conversationAnalysis}
									isLocalized={isLocalized}
								/>

								<MessageAnalysis
									messageHeatmap={safeDashboard.messageHeatmap}
									topCustomers={safeDashboard.topCustomers}
									conversationAnalysis={safeDashboard.conversationAnalysis}
									wordFrequency={safeDashboard.wordFrequency}
									isLocalized={isLocalized}
								/>
							</div>

							{/* Insights */}
							<div className="space-y-6">
								<div className="grid gap-6">
									{/* Response Time Performance Insights */}
									<Card>
										<CardHeader>
											<CardTitle>
												{i18n.getMessage("response_time_insights", isLocalized)}
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="space-y-2 text-sm">
												{dashboardData.conversationAnalysis.responseTimeStats
													.avg <= 2 && (
													<div className="p-3 bg-chart-1/20 border border-chart-1/30 rounded-lg">
														<p className="text-chart-1">
															{i18n.getMessage(
																"response_time_excellent",
																isLocalized,
															)}
														</p>
													</div>
												)}
												{dashboardData.conversationAnalysis.responseTimeStats
													.avg > 2 &&
													dashboardData.conversationAnalysis.responseTimeStats
														.avg <= 5 && (
														<div className="p-3 bg-chart-2/20 border border-chart-2/30 rounded-lg">
															<p className="text-chart-2">
																{i18n.getMessage(
																	"response_time_good",
																	isLocalized,
																)}
															</p>
														</div>
													)}
												{dashboardData.conversationAnalysis.responseTimeStats
													.avg > 5 &&
													dashboardData.conversationAnalysis.responseTimeStats
														.avg <= 10 && (
														<div className="p-3 bg-chart-3/20 border border-chart-3/30 rounded-lg">
															<p className="text-chart-3">
																{i18n.getMessage(
																	"response_time_needs_improvement",
																	isLocalized,
																)}
															</p>
														</div>
													)}
												{dashboardData.conversationAnalysis.responseTimeStats
													.avg > 10 && (
													<div className="p-3 bg-destructive/20 border border-destructive/30 rounded-lg">
														<p className="text-destructive">
															{i18n.getMessage(
																"response_time_poor",
																isLocalized,
															)}
														</p>
													</div>
												)}
											</div>
										</CardContent>
									</Card>

									{/* Conversation Engagement Insights */}
									<Card>
										<CardHeader>
											<CardTitle>
												{i18n.getMessage("conversation_insights", isLocalized)}
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="space-y-2 text-sm">
												{dashboardData.conversationAnalysis
													.avgMessagesPerCustomer >= 20 && (
													<div className="p-3 bg-chart-1/20 border border-chart-1/30 rounded-lg">
														<p className="text-chart-1">
															{i18n.getMessage(
																"conversation_insight_high",
																isLocalized,
															)}
														</p>
													</div>
												)}
												{dashboardData.conversationAnalysis
													.avgMessagesPerCustomer >= 10 &&
													dashboardData.conversationAnalysis
														.avgMessagesPerCustomer < 20 && (
														<div className="p-3 bg-chart-2/20 border border-chart-2/30 rounded-lg">
															<p className="text-chart-2">
																{i18n.getMessage(
																	"conversation_insight_medium",
																	isLocalized,
																)}
															</p>
														</div>
													)}
												{dashboardData.conversationAnalysis
													.avgMessagesPerCustomer < 10 && (
													<div className="p-3 bg-chart-3/20 border border-chart-3/30 rounded-lg">
														<p className="text-chart-3">
															{i18n.getMessage(
																"conversation_insight_low",
																isLocalized,
															)}
														</p>
													</div>
												)}
											</div>
										</CardContent>
									</Card>

									{/* Business Insights */}
									<Card>
										<CardHeader>
											<CardTitle>
												{i18n.getMessage(
													"dashboard_business_insights",
													isLocalized,
												)}
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="space-y-4">
												<div className="p-4 bg-accent/10 rounded-lg border-l-4 border-accent">
													<h4 className="font-semibold text-accent-foreground">
														{i18n.getMessage(
															"dashboard_peak_hours_title",
															isLocalized,
														)}
													</h4>
													<p className="text-accent-foreground/80 text-sm mt-1">
														{i18n.getMessage(
															"dashboard_peak_hours_desc",
															isLocalized,
														)}
													</p>
													<span className="inline-block mt-2 px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
														{i18n.getMessage("demo_data_warning", isLocalized)}
													</span>
												</div>

												<div className="p-4 bg-chart-1/10 rounded-lg border-l-4 border-chart-1">
													<h4 className="font-semibold text-chart-1">
														{i18n.getMessage(
															"dashboard_customer_retention_title",
															isLocalized,
														)}
													</h4>
													<p className="text-chart-1/80 text-sm mt-1">
														{isLocalized
															? `${dashboardData.stats.returningRate.toFixed(1)}% من العملاء يعودون لحجوزات أخرى. هذا يدل على رضا جيد عن الخدمة.`
															: `${dashboardData.stats.returningRate.toFixed(1)}% of customers return for follow-up appointments. This indicates good service satisfaction.`}
													</p>
													<span className="inline-block mt-2 px-2 py-1 bg-chart-1/20 text-chart-1 text-xs rounded-full">
														{i18n.getMessage(
															"real_data_available",
															isLocalized,
														)}
													</span>
												</div>

												<div className="p-4 bg-chart-3/10 rounded-lg border-l-4 border-chart-3">
													<h4 className="font-semibold text-chart-3">
														{i18n.getMessage(
															"dashboard_response_time_title",
															isLocalized,
														)}
													</h4>
													<p className="text-chart-3/80 text-sm mt-1">
														{isLocalized
															? `متوسط زمن الاستجابة هو ${dashboardData.stats.avgResponseTime.toFixed(1)} دقيقة. فكر في تطبيق ردود تلقائية للاستفسارات الشائعة.`
															: `Average response time is ${dashboardData.stats.avgResponseTime.toFixed(1)} minutes. Consider implementing automated responses for common queries.`}
													</p>
													<span className="inline-block mt-2 px-2 py-1 bg-chart-3/20 text-chart-3 text-xs rounded-full">
														{i18n.getMessage(
															"real_data_available",
															isLocalized,
														)}
													</span>
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							</div>
						</TransitionPanel>
					</div>
				</Tabs>
			)}
		</div>
	);
}
