"use client";

import type {
	DashboardData,
	DashboardFilters,
} from "@features/dashboard/types";
import { useDashboardData } from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { differenceInDays, format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
	Tabs,
	TabsList,
	TabsTrigger,
} from "@/shared/ui/animate-ui/components/radix/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DateRangeWithPresets } from "@/shared/ui/date-range-with-presets";
import { Skeleton } from "@/shared/ui/skeleton";
import { ConversationLengthAnalysis } from "./conversation-length-analysis";
import { KPICards } from "./kpi-cards";
import { MessageAnalysis } from "./message-analysis";
import { OperationMetrics } from "./operation-metrics";
import { ResponseTimeAnalysis } from "./response-time-analysis";
import { TrendCharts } from "./trend-charts";

// Constants for dashboard configuration
const DEFAULT_DATE_RANGE_DAYS = 30;
const FILTER_CHANGE_DEBOUNCE_MS = 250;

// Response time thresholds (minutes)
const RESPONSE_TIME_EXCELLENT_MAX = 2;
const RESPONSE_TIME_GOOD_MAX = 5;
const RESPONSE_TIME_POOR_MAX = 10;

// Conversation metrics thresholds
const AVG_MESSAGES_HIGH_THRESHOLD = 20;
const AVG_MESSAGES_MEDIUM_THRESHOLD = 10;

// Helper to format date to YYYY-MM-DD
function formatDateToYmd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

// Helper to initialize default date range
function getDefaultDateRange() {
	return {
		from: subDays(new Date(), DEFAULT_DATE_RANGE_DAYS),
		to: new Date(),
	};
}

// Helper to build safe dashboard data with fallbacks
function buildSafeDashboard(dashboardData: DashboardData | null | undefined) {
	return {
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
	};
}

// Helper component for error state
function DashboardErrorState({
	error,
	isLocalized,
	onRetry,
}: {
	error: string;
	isLocalized: boolean;
	onRetry: () => void;
}) {
	return (
		<div className="flex min-h-[25rem] items-center justify-center">
			<Card className="w-full max-w-md">
				<CardContent className="p-6 text-center">
					<div className="mb-4 text-destructive">
						<svg
							aria-label="Error icon"
							className="mx-auto h-12 w-12"
							fill="none"
							role="img"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Error icon</title>
							<path
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
					</div>
					<h3 className="mb-2 font-semibold text-lg">
						{i18n.getMessage("dashboard_error_title", isLocalized)}
					</h3>
					<p className="mb-4 text-muted-foreground">{error}</p>
					<Button onClick={onRetry} variant="outline">
						{i18n.getMessage("dashboard_try_again", isLocalized)}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

// Helper to handle initial dashboard load
const useInitializeDashboard = (
	isInitialized: boolean,
	setIsInitialized: (value: boolean) => void,
	refreshDashboard: (range: {
		fromDate: string;
		toDate: string;
	}) => Promise<void>,
	defaultDateRange: { from: Date; to: Date }
) => {
	useEffect(() => {
		if (!isInitialized) {
			refreshDashboard({
				fromDate: formatDateToYmd(defaultDateRange.from),
				toDate: formatDateToYmd(defaultDateRange.to),
			})
				.then(() => {
					setIsInitialized(true);
				})
				.catch(() => {
					// Dashboard refresh may fail on initialization
				});
		}
	}, [isInitialized, refreshDashboard, defaultDateRange, setIsInitialized]);
};

// Helper to handle filter changes
const useFilterChanges = (
	isInitialized: boolean,
	filters: DashboardFilters,
	refreshDashboard: (range: {
		fromDate: string;
		toDate: string;
	}) => Promise<void>
) => {
	useEffect(() => {
		if (isInitialized && filters.dateRange?.from && filters.dateRange?.to) {
			const timeoutId = setTimeout(() => {
				refreshDashboard({
					fromDate: formatDateToYmd(filters.dateRange?.from as Date),
					toDate: formatDateToYmd(filters.dateRange?.to as Date),
				}).catch(() => {
					// Filter changes may fail to refresh dashboard
				});
			}, FILTER_CHANGE_DEBOUNCE_MS);

			return () => clearTimeout(timeoutId);
		}

		return () => {
			// No cleanup needed when conditions are not met
		};
	}, [filters, refreshDashboard, isInitialized]);
};

// Helper component for response time insights
function ResponseTimeInsightsCard({
	avgResponseTime,
	isLocalized,
}: {
	avgResponseTime: number;
	isLocalized: boolean;
}) {
	const renderInsight = () => {
		if (avgResponseTime <= RESPONSE_TIME_EXCELLENT_MAX) {
			return {
				className: "border-chart-1/30 bg-chart-1/20",
				textColor: "text-chart-1",
				message: "response_time_excellent",
			};
		}
		if (avgResponseTime <= RESPONSE_TIME_GOOD_MAX) {
			return {
				className: "border-chart-2/30 bg-chart-2/20",
				textColor: "text-chart-2",
				message: "response_time_good",
			};
		}
		if (avgResponseTime <= RESPONSE_TIME_POOR_MAX) {
			return {
				className: "border-chart-3/30 bg-chart-3/20",
				textColor: "text-chart-3",
				message: "response_time_needs_improvement",
			};
		}
		return {
			className: "border-destructive/30 bg-destructive/20",
			textColor: "text-destructive",
			message: "response_time_poor",
		};
	};

	const insight = renderInsight();

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{i18n.getMessage("response_time_insights", isLocalized)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className={`rounded-lg border ${insight.className} p-3`}>
					<p className={insight.textColor}>
						{i18n.getMessage(insight.message, isLocalized)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// Helper component for conversation insights
function ConversationInsightsCard({
	avgMessagesPerCustomer,
	isLocalized,
}: {
	avgMessagesPerCustomer: number;
	isLocalized: boolean;
}) {
	const renderInsight = () => {
		if (avgMessagesPerCustomer >= AVG_MESSAGES_HIGH_THRESHOLD) {
			return {
				className: "border-chart-1/30 bg-chart-1/20",
				textColor: "text-chart-1",
				message: "conversation_insight_high",
			};
		}
		if (avgMessagesPerCustomer >= AVG_MESSAGES_MEDIUM_THRESHOLD) {
			return {
				className: "border-chart-2/30 bg-chart-2/20",
				textColor: "text-chart-2",
				message: "conversation_insight_medium",
			};
		}
		return {
			className: "border-chart-3/30 bg-chart-3/20",
			textColor: "text-chart-3",
			message: "conversation_insight_low",
		};
	};

	const insight = renderInsight();

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{i18n.getMessage("conversation_insights", isLocalized)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className={`rounded-lg border ${insight.className} p-3`}>
					<p className={insight.textColor}>
						{i18n.getMessage(insight.message, isLocalized)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// Helper component for business insights
function BusinessInsightsCard({
	isLocalized,
	stats,
}: {
	isLocalized: boolean;
	stats: { returningRate: number; avgResponseTime: number };
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{i18n.getMessage("dashboard_business_insights", isLocalized)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="rounded-lg border-accent border-l-4 bg-accent/10 p-4">
						<h4 className="font-semibold text-accent-foreground">
							{i18n.getMessage("dashboard_peak_hours_title", isLocalized)}
						</h4>
						<p className="mt-1 text-accent-foreground/80 text-sm">
							{i18n.getMessage("dashboard_peak_hours_desc", isLocalized)}
						</p>
						<span className="mt-2 inline-block rounded-full bg-accent/20 px-2 py-1 text-accent text-xs">
							{i18n.getMessage("demo_data_warning", isLocalized)}
						</span>
					</div>

					<div className="rounded-lg border-chart-1 border-l-4 bg-chart-1/10 p-4">
						<h4 className="font-semibold text-chart-1">
							{i18n.getMessage(
								"dashboard_customer_retention_title",
								isLocalized
							)}
						</h4>
						<p className="mt-1 text-chart-1/80 text-sm">
							{isLocalized
								? `${stats.returningRate.toFixed(
										1
									)}% من العملاء يعودون لحجوزات أخرى. هذا يدل على رضا جيد عن الخدمة.`
								: `${stats.returningRate.toFixed(
										1
									)}% of customers return for follow-up appointments. This indicates good service satisfaction.`}
						</p>
						<span className="mt-2 inline-block rounded-full bg-chart-1/20 px-2 py-1 text-chart-1 text-xs">
							{i18n.getMessage("real_data_available", isLocalized)}
						</span>
					</div>

					<div className="rounded-lg border-chart-3 border-l-4 bg-chart-3/10 p-4">
						<h4 className="font-semibold text-chart-3">
							{i18n.getMessage("dashboard_response_time_title", isLocalized)}
						</h4>
						<p className="mt-1 text-chart-3/80 text-sm">
							{isLocalized
								? `متوسط زمن الاستجابة هو ${stats.avgResponseTime.toFixed(
										1
									)} دقيقة. فكر في تطبيق ردود تلقائية للاستفسارات الشائعة.`
								: `Average response time is ${stats.avgResponseTime.toFixed(
										1
									)} minutes. Consider implementing automated responses for common queries.`}
						</p>
						<span className="mt-2 inline-block rounded-full bg-chart-3/20 px-2 py-1 text-chart-3 text-xs">
							{i18n.getMessage("real_data_available", isLocalized)}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function EnhancedDashboardView() {
	const { isLocalized } = useLanguage();

	// Initialize with last 30 days as default for both UI and data loading
	const defaultDateRange = React.useMemo(() => getDefaultDateRange(), []);

	const [filters, setFilters] = useState<DashboardFilters>({
		dateRange: defaultDateRange,
	});

	const [activeTab, setActiveTab] = useState("overview");

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
		if (!(filters.dateRange?.from && filters.dateRange?.to)) {
			return 0;
		}
		return differenceInDays(filters.dateRange.to, filters.dateRange.from) + 1;
	}, [filters.dateRange]);

	// Create stable, safe fallbacks to avoid undefined access and re-mount animations
	const safeDashboard = React.useMemo(
		() => buildSafeDashboard(dashboardData),
		[dashboardData]
	);

	// Smart initialization: always set initial 30-day range on first mount
	useInitializeDashboard(
		isInitialized,
		setIsInitialized,
		refreshDashboard,
		defaultDateRange
	);

	// When filters change, refresh dashboard data
	useFilterChanges(isInitialized, filters, refreshDashboard);

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
		}
	};

	const handleExport = () => {
		if (!dashboardData) {
			return;
		}

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
			<DashboardErrorState
				error={error}
				isLocalized={isLocalized}
				onRetry={() => refreshDashboard()}
			/>
		);
	}

	// Show loading state while data is being fetched or if data is incomplete
	if (isLoading || !dashboardData) {
		return (
			<div className="space-y-6">
				{/* Header Skeleton */}
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<Skeleton className="mb-2 h-8 w-48" />
						<Skeleton className="h-4 w-96" />
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>

				{/* KPI Cards Skeleton */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
					{[
						"total",
						"active",
						"pending",
						"completed",
						"cancelled",
						"revenue",
					].map((metric) => (
						<Card className="h-32" key={`kpi-skeleton-${metric}`}>
							<CardHeader className="pb-2">
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="mb-2 h-8 w-16" />
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
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
				initial={{ opacity: 0, y: -20 }}
			>
				<div>
					<h1 className="font-bold text-3xl tracking-tight">
						{i18n.getMessage("dashboard_title", isLocalized)}
					</h1>
					<p className="text-muted-foreground">
						{i18n.getMessage("dashboard_subtitle", isLocalized) ||
							"Showing all available data. Use date filters to view specific timeframes."}
					</p>
					{isUsingMockData && (
						<div className="mt-2 rounded-lg border border-accent/20 bg-accent/10 p-3">
							<p className="text-accent-foreground text-sm">
								<strong>
									{i18n.getMessage("dashboard_demo_mode", isLocalized)}:
								</strong>{" "}
								{i18n.getMessage("dashboard_demo_description", isLocalized)}
							</p>
						</div>
					)}
				</div>

				{/* Controls */}
				<div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
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
								onChange={handleDateRangeChange}
								value={filters.dateRange}
							/>

							<Button
								disabled={!dashboardData}
								onClick={handleExport}
								size="sm"
								variant="outline"
							>
								<Download className="mr-2 h-4 w-4" />
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
									<Skeleton className="h-4 w-[7.5rem]" />
								</CardHeader>
								<CardContent>
									<Skeleton className="h-8 w-[5rem]" />
									<Skeleton className="mt-2 h-3 w-[6.25rem]" />
								</CardContent>
							</Card>
						))}
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{["trends", "distribution", "performance", "analytics"].map(
							(chart) => (
								<Card key={`chart-skeleton-${chart}`}>
									<CardHeader>
										<Skeleton className="h-6 w-[9.375rem]" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-[18.75rem] w-full" />
									</CardContent>
								</Card>
							)
						)}
					</div>
				</div>
			)}

			{/* Dashboard Content */}
			{dashboardData && (
				<Tabs
					className="space-y-6"
					onValueChange={setActiveTab}
					value={activeTab}
				>
					<TabsList className="mx-auto grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[37.5rem]">
						<TabsTrigger className="w-full whitespace-nowrap" value="overview">
							{i18n.getMessage("dashboard_overview", isLocalized)}
						</TabsTrigger>
						<TabsTrigger className="w-full whitespace-nowrap" value="trends">
							{i18n.getMessage("dashboard_trends", isLocalized)}
						</TabsTrigger>
						<TabsTrigger className="w-full whitespace-nowrap" value="messages">
							{i18n.getMessage("dashboard_messages", isLocalized)}
						</TabsTrigger>
						<TabsTrigger className="w-full whitespace-nowrap" value="insights">
							{i18n.getMessage("dashboard_insights", isLocalized)}
						</TabsTrigger>
					</TabsList>

					<div className="overflow-hidden border-zinc-200 border-t dark:border-zinc-700">
						<div className="pt-4">
							{/* Overview */}
							<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
								<div className="lg:col-span-12">
									<KPICards
										isLocalized={isLocalized}
										prometheusMetrics={safeDashboard.prometheusMetrics}
										stats={safeDashboard.stats}
									/>
								</div>

								<div className="lg:col-span-4">
									<OperationMetrics
										isLocalized={isLocalized}
										prometheusMetrics={safeDashboard.prometheusMetrics}
									/>
								</div>

								<div className="lg:col-span-8">
									<TrendCharts
										customerSegments={safeDashboard.customerSegments}
										dailyTrends={safeDashboard.dailyTrends}
										dayOfWeekData={safeDashboard.dayOfWeekData}
										funnelData={safeDashboard.funnelData}
										isLocalized={isLocalized}
										monthlyTrends={safeDashboard.monthlyTrends}
										timeSlots={safeDashboard.timeSlots}
										typeDistribution={safeDashboard.typeDistribution}
										variant="compact"
									/>
								</div>
							</div>

							{/* Trends */}
							<div className="space-y-6">
								<TrendCharts
									customerSegments={safeDashboard.customerSegments}
									dailyTrends={safeDashboard.dailyTrends}
									dayOfWeekData={safeDashboard.dayOfWeekData}
									funnelData={safeDashboard.funnelData}
									isLocalized={isLocalized}
									monthlyTrends={safeDashboard.monthlyTrends}
									timeSlots={safeDashboard.timeSlots}
									typeDistribution={safeDashboard.typeDistribution}
								/>
							</div>

							{/* Messages */}
							<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
								<div className="lg:col-span-6">
									<ResponseTimeAnalysis
										conversationAnalysis={dashboardData.conversationAnalysis}
										isLocalized={isLocalized}
									/>
								</div>

								<div className="lg:col-span-6">
									<ConversationLengthAnalysis
										conversationAnalysis={safeDashboard.conversationAnalysis}
										isLocalized={isLocalized}
									/>
								</div>

								<div className="lg:col-span-12">
									<MessageAnalysis
										conversationAnalysis={safeDashboard.conversationAnalysis}
										isLocalized={isLocalized}
										messageHeatmap={safeDashboard.messageHeatmap}
										topCustomers={safeDashboard.topCustomers}
										wordFrequency={safeDashboard.wordFrequency}
									/>
								</div>
							</div>

							{/* Insights */}
							<div className="space-y-6">
								<div className="grid gap-6">
									<ResponseTimeInsightsCard
										avgResponseTime={
											dashboardData.conversationAnalysis.responseTimeStats.avg
										}
										isLocalized={isLocalized}
									/>
									<ConversationInsightsCard
										avgMessagesPerCustomer={
											dashboardData.conversationAnalysis.avgMessagesPerCustomer
										}
										isLocalized={isLocalized}
									/>
									<BusinessInsightsCard
										isLocalized={isLocalized}
										stats={{
											returningRate: dashboardData.stats.returningRate,
											avgResponseTime: dashboardData.stats.avgResponseTime,
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				</Tabs>
			)}
		</div>
	);
}
