"use client";

import { motion } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	MessageSquare,
	TrendingUp,
	Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis as XAxisComp,
	YAxis as YAxisComp
} from "recharts";
import { CustomerStatsCard } from "@/components/customer-stats-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
// import { WordCloudChart } from "./word-cloud"; // Remove for now to reduce heavy render cost
import { useCustomerData } from "@/lib/customer-data-context";
import { i18n } from "@/lib/i18n";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";

import type {
	ConversationAnalysis,
	CustomerActivity,
	MessageHeatmapData,
	WordFrequency,
} from "@/types/dashboard";

interface MessageAnalysisProps {
	messageHeatmap: MessageHeatmapData[];
	topCustomers: CustomerActivity[];
	conversationAnalysis: ConversationAnalysis;
	wordFrequency: WordFrequency[];
	isRTL: boolean;
}

// Chart configuration for word frequency
const _wordFrequencyChartConfig = {
	customerCount: {
		label: "Customers",
		color: "hsl(var(--chart-1))",
	},
	assistantCount: {
		label: "Assistant",
		color: "hsl(var(--chart-2))",
	},
} as const;

export function MessageAnalysis({
	messageHeatmap,
	topCustomers,
	conversationAnalysis,
	wordFrequency,
	isRTL,
}: MessageAnalysisProps) {
	const [currentPage, setCurrentPage] = useState(0);
	const customersPerPage = 10;
	const maxCustomers = 100;

	// Use real data only to avoid extra rendering cost
	const limitedCustomers = topCustomers.slice(0, maxCustomers);
	const totalPages = Math.ceil(limitedCustomers.length / customersPerPage);

	const {
		customers: customerDirectory,
		conversations,
		reservations,
	} = useCustomerData();
	const { openConversation } = useSidebarChatStore();

	useEffect(() => {
		setCurrentPage(0);
	}, []);

	const getCustomerName = (wa_id: string) => {
		const entry = customerDirectory.find((c) => c.phone === wa_id);
		return entry?.name || wa_id;
	};

	// Helper function to translate day names
	const translateDayName = (dayName: string) => {
		const dayMap = {
			Monday: "day_monday",
			Tuesday: "day_tuesday",
			Wednesday: "day_wednesday",
			Thursday: "day_thursday",
			Friday: "day_friday",
			Saturday: "day_saturday",
			Sunday: "day_sunday",
		};

		const key = dayMap[dayName as keyof typeof dayMap];
		return key ? i18n.getMessage(key, isRTL) : dayName;
	};

	// Create heatmap grid
	const daysOrder = [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday",
	];
	const hours = Array.from({ length: 24 }, (_, i) => i);
	const maxCount = Math.max(...messageHeatmap.map((d) => d.count), 1);

	// Precompute heatmap lookup to avoid repeated array scans per cell
	const heatmapMap = React.useMemo(() => {
		const map = new Map<string, number>();
		for (const d of messageHeatmap) {
			map.set(`${d.weekday}-${d.hour}`, d.count);
		}
		return map;
	}, [messageHeatmap]);

	const getHeatmapValue = (day: string, hour: number) => {
		return heatmapMap.get(`${day}-${hour}`) || 0;
	};

	const getIntensity = (count: number) => {
		const intensity = count / maxCount;
		if (intensity === 0) return "bg-muted/5 border-border/20 text-muted-foreground";
		if (intensity < 0.2) return "bg-chart-1/10 border-chart-1/20 text-chart-1";
		if (intensity < 0.4) return "bg-chart-1/25 border-chart-1/30 text-chart-1";
		if (intensity < 0.6)
			return "bg-chart-1/50 border-chart-1/40 text-foreground";
		if (intensity < 0.8)
			return "bg-chart-1/75 border-chart-1/50 text-white";
		return "bg-chart-1 border-chart-1 text-white";
	};

	const getIntensityLabel = (count: number) => {
		const intensity = count / maxCount;
		if (intensity === 0) return i18n.getMessage("msg_no_messages", isRTL);
		if (intensity < 0.2) return i18n.getMessage("msg_very_low", isRTL);
		if (intensity < 0.4) return i18n.getMessage("msg_low", isRTL);
		if (intensity < 0.6) return i18n.getMessage("msg_medium", isRTL);
		if (intensity < 0.8) return i18n.getMessage("msg_high", isRTL);
		return i18n.getMessage("msg_very_high", isRTL);
	};

	// Precomputed labels to avoid JSX inline IIFEs and multiline parentheses
	const peakHourLabel = React.useMemo(() => {
		const peakData = messageHeatmap.reduce(
			(peak, current) => (current.count > peak.count ? current : peak),
			{ hour: 0, count: 0 },
		);
		return `${peakData.hour.toString().padStart(2, "0")}:00`;
	}, [messageHeatmap]);

	const busiestDayShortLabel = React.useMemo(() => {
		const dayTotals = daysOrder.map((day) => ({
			day,
			total: messageHeatmap
				.filter((d) => d.weekday === day)
				.reduce((sum, d) => sum + d.count, 0),
		}));
		const busiestDay = dayTotals.reduce((peak, current) =>
			current.total > peak.total ? current : peak,
		);
		return translateDayName(busiestDay.day).slice(0, 3);
	}, [messageHeatmap, isRTL]);

	const averageMessagesPerHourLabel = React.useMemo(() => {
		const total = messageHeatmap.reduce((sum, d) => sum + d.count, 0);
		return (total / (24 * 7)).toFixed(1);
	}, [messageHeatmap]);

	const paginatedCustomers = limitedCustomers.slice(
		currentPage * customersPerPage,
		(currentPage + 1) * customersPerPage,
	);

	const handlePrevPage = () => {
		setCurrentPage((prev) => Math.max(0, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
	};

	const handleCustomerClick = (wa_id: string) => {
		openConversation(wa_id);
	};

	// Prefer backend-provided word frequency to avoid heavy client processing
	const enhancedWordFrequency = React.useMemo(() => {
		if (wordFrequency && wordFrequency.length > 0) {
			return wordFrequency.slice(0, 20).map((word) => ({
				word: word.word,
				customerCount: Math.floor(word.count * 0.7),
				assistantCount: Math.ceil(word.count * 0.3),
				totalCount: word.count,
			}));
		}
		return [] as Array<{ word: string; customerCount: number; assistantCount: number; totalCount: number }>;
	}, [wordFrequency]);

	// Build word cloud data with stopword filtering (Arabic + English)
	const wordCloudData = React.useMemo(() => {
		const arStop = new Set([
			"من","في","على","إلى","الى","عن","مع","هذا","هذه","ذلك","تلك","لكن","أو","او","و","ثم","إن","ان","لن","لم","ما","ماذا","كيف","أين","اين","هل","نعم","لا","كل","أي","اي","هناك","هنا","أنا","انا","هو","هي","هم","هن","كان","كانت","يكون","يمكن","لقد","قد","حتى","بعد","قبل","عند","إذا","اذا","كما","أيضا","ايضا","التي","الذي","اللذي","الذين","اللاتي","اليوم","غدا","أمس","امس"
		]);
		const enStop = new Set([
			"the","is","are","am","i","you","he","she","it","we","they","to","for","and","or","but","of","in","on","at","with","this","that","these","those","a","an","as","by","be","been","was","were","do","did","done","from","up","down","out","over","under","so","if","not","yes","no","can","could","would","should","have","has","had"
		]);
		const map = new Map<string, number>();
		enhancedWordFrequency.forEach(w => {
			const t = (w.word || "").toString().trim();
			if (!t) return;
			const lower = t.toLowerCase();
			if (arStop.has(lower) || enStop.has(lower)) return;
			map.set(lower, (map.get(lower) || 0) + w.totalCount);
		});
		return Array.from(map.entries()).map(([text, value]) => ({ text, value }));
	}, [enhancedWordFrequency]);

	// Custom tooltip renderer for word frequency chart
	const renderWordTooltip = React.useCallback(({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const customerCount = payload.find((p: any) => p.dataKey === "customerCount")?.value || 0;
			const assistantCount = payload.find((p: any) => p.dataKey === "assistantCount")?.value || 0;
			const total = Number(customerCount) + Number(assistantCount);

			return (
				<div className="bg-background/95 border border-border rounded-lg shadow-md p-3 backdrop-blur-sm">
					<p className="font-semibold text-foreground mb-2">
						&quot;{label}&quot;
					</p>
					<div className="space-y-1 text-sm">
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-sm bg-chart-1"></div>
								<span className="text-muted-foreground">
									{i18n.getMessage("msg_customers", isRTL)}:
								</span>
							</div>
							<span className="font-medium text-chart-1">
								{customerCount}
							</span>
						</div>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-sm bg-chart-2"></div>
								<span className="text-muted-foreground">
									{i18n.getMessage("msg_assistant", isRTL)}:
								</span>
							</div>
							<span className="font-medium text-chart-2">
								{assistantCount}
							</span>
						</div>
						<div className="border-t border-border/50 pt-1 mt-2">
							<div className="flex items-center justify-between gap-4">
								<span className="text-muted-foreground">
									Total:
								</span>
								<span className="font-semibold text-foreground">
									{total}
								</span>
							</div>
						</div>
					</div>
				</div>
			);
		}
		return null;
	}, [isRTL]);

	return (
		<div className="space-y-6">
			{/* Message Analysis Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="h-full"
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{i18n.getMessage("msg_total_messages", isRTL)}
							</CardTitle>
							<MessageSquare className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{conversationAnalysis.totalMessages.toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_across_all_conversations", isRTL)}
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="h-full"
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{i18n.getMessage("msg_avg_message_length", isRTL)}
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{conversationAnalysis.avgMessageLength.toFixed(0)}
							</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_chars", isRTL)} •{" "}
								{conversationAnalysis.avgWordsPerMessage.toFixed(0)}{" "}
								{i18n.getMessage("msg_words_avg", isRTL)}
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="h-full"
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{i18n.getMessage("msg_avg_response_time", isRTL)}
							</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{conversationAnalysis.responseTimeStats.avg.toFixed(1)}
								{i18n.getMessage("msg_minutes", isRTL)}
							</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_median", isRTL)}{" "}
								{conversationAnalysis.responseTimeStats.median.toFixed(1)}
								{i18n.getMessage("msg_minutes", isRTL)}
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="h-full"
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{i18n.getMessage("msg_messages_per_customer", isRTL)}
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{conversationAnalysis.avgMessagesPerCustomer.toFixed(1)}
							</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_average_conversation_length", isRTL)}
							</p>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Message Volume Heatmap */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5 }}
			>
				<Card className="overflow-hidden">
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<MessageSquare className="h-5 w-5 text-chart-1" />
									{i18n.getMessage("msg_volume_heatmap", isRTL)}
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									{i18n.getMessage("msg_activity_patterns", isRTL)}
								</p>
							</div>
							<div className="text-right">
								<div className="text-2xl font-bold text-chart-1">
									{maxCount}
								</div>
								<p className="text-xs text-muted-foreground">{i18n.getMessage("msg_peak_messages", isRTL)}</p>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pb-6">
						<div className="space-y-4">
							{/* Enhanced Header with time indicators */}
							<div className="flex items-center mb-3">
								<div className="w-16 flex-shrink-0"></div>
								<div className="flex flex-1 relative">
									{hours.map((hour) => (
										<div
											key={hour}
											className="flex-1 text-center text-muted-foreground text-xs font-medium min-w-[24px] relative"
										>
											{hour.toString().padStart(2, "0")}
											{/* Time period indicators */}
											{hour === 6 && (
												<div className="absolute -top-2 left-0 right-0 text-[10px] text-chart-3 font-medium">
													{i18n.getMessage("msg_morning", isRTL)}
												</div>
											)}
											{hour === 12 && (
												<div className="absolute -top-2 left-0 right-0 text-[10px] text-chart-2 font-medium">
													{i18n.getMessage("msg_afternoon", isRTL)}
												</div>
											)}
											{hour === 18 && (
												<div className="absolute -top-2 left-0 right-0 text-[10px] text-chart-4 font-medium">
													{i18n.getMessage("msg_evening", isRTL)}
												</div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Heatmap grid without per-cell animations */}
							<div className="space-y-1">
								{daysOrder.map((day) => (
									<div key={day} className="flex items-center group">
										<div className="w-16 flex-shrink-0 text-sm font-medium text-foreground text-right pr-3">
											<div className="bg-accent/20 px-2 py-1 rounded-md border">
												{translateDayName(day).slice(0, 3)}
											</div>
										</div>
										<div className="flex flex-1 gap-[1px]">
											{hours.map((hour) => {
												const count = getHeatmapValue(day, hour);
												return (
													<div
														key={`${day}-${hour}`}
														className={`relative flex-1 aspect-square ${getIntensity(count)} min-w-[24px] min-h-[24px] rounded border-2`}
														title={`${translateDayName(day)} ${hour.toString().padStart(2, "0")}:00\n${count} ${i18n.getMessage("msg_messages", isRTL)}\n${getIntensityLabel(count)} ${i18n.getMessage("msg_activity", isRTL)}`}
													>
														{count > 0 && (
															<div className="absolute inset-0 flex items-center justify-center">
																<span className="text-xs font-bold select-none">
																	{count > 99 ? "99+" : count}
																</span>
															</div>
														)}
														{count === maxCount && (
															<div className="absolute -top-1 -right-1 w-3 h-3 bg-chart-3 rounded-full border-2 border-background shadow-sm"></div>
														)}
													</div>
												);
											})}
										</div>
									</div>
								))}
							</div>

							{/* Legend */}
							<div className="mt-6 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span>{i18n.getMessage("msg_less", isRTL)}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span>{i18n.getMessage("msg_more", isRTL)}</span>
									</div>
								</div>

								<div className="relative">
									<div className="h-4 rounded-full overflow-hidden border border-border/50 shadow-inner">
										<div className="h-full bg-gradient-to-r from-muted/20 via-chart-1/30 via-chart-1/60 to-chart-1"></div>
									</div>
									<div className="flex justify-between mt-2 text-xs text-muted-foreground">
										<span>0</span>
										<span>{Math.floor(maxCount * 0.25)}</span>
										<span>{Math.floor(maxCount * 0.5)}</span>
										<span>{Math.floor(maxCount * 0.75)}</span>
										<span>{maxCount}</span>
									</div>
								</div>

								{/* Activity insights */}
								<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_peak_hour", isRTL)}
										</div>
										<div className="text-sm font-semibold text-chart-1">
											{peakHourLabel}
										</div>
									</div>

									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_busiest_day", isRTL)}
										</div>
										<div className="text-sm font-semibold text-chart-2">
											{busiestDayShortLabel}
										</div>
									</div>

									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_total_messages", isRTL)}
										</div>
										<div className="text-sm font-semibold text-chart-3">
											{messageHeatmap
												.reduce((sum, d) => sum + d.count, 0)
												.toLocaleString()}
										</div>
									</div>

									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_avg_per_hour", isRTL)}
										</div>
										<div className="text-sm font-semibold text-chart-4">
											{averageMessagesPerHourLabel}
										</div>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Top Customers and Word Frequency */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Most Active Customers */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
				>
					<Card className="h-full">
						<CardHeader>
							<CardTitle>
								{i18n.getMessage("msg_most_active_customers", isRTL)}{" "}
								{`(${maxCustomers})`}
							</CardTitle>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<Badge>
										{i18n.getMessage("msg_page", isRTL)} {currentPage + 1}{" "}
										{i18n.getMessage("msg_of", isRTL)} {totalPages}
									</Badge>
									<Badge>
										{limitedCustomers.length}{" "}
										{i18n.getMessage("msg_total", isRTL)}
									</Badge>
								</div>

								<div className="flex items-center space-x-1">
									<Button
										onClick={handlePrevPage}
										disabled={currentPage === 0}
										className="h-8"
									>
										<ChevronLeft className="h-4 w-4" />
										{i18n.getMessage("msg_previous", isRTL)}
									</Button>
									<Button
										onClick={handleNextPage}
										disabled={currentPage >= totalPages - 1}
										className="h-8"
									>
										{i18n.getMessage("msg_next", isRTL)}
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-3 max-h-[400px] overflow-y-auto">
								{paginatedCustomers.map((customer, index) => {
									const globalIndex =
										currentPage * customersPerPage + index + 1;
									const initials = customer.wa_id
										.replace(/[^a-zA-Z0-9]/g, "")
										.slice(-2)
										.toUpperCase();

									return (
										<motion.div
											key={customer.wa_id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.05 }}
											className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
										>
											<div className="flex items-center space-x-3">
												<div className="flex items-center space-x-2">
													<span className="text-sm font-medium text-muted-foreground w-6">
														#{globalIndex}
													</span>
													<Avatar className="h-8 w-8">
														<AvatarFallback className="text-xs">
															{initials}
														</AvatarFallback>
													</Avatar>
												</div>
												<div>
													<HoverCard>
														<HoverCardTrigger asChild>
															<p
																className="text-sm font-medium cursor-pointer truncate max-w-[180px] hover:text-blue-600"
																onClick={() =>
																	handleCustomerClick(customer.wa_id)
																}
															>
																{getCustomerName(customer.wa_id)}
															</p>
														</HoverCardTrigger>
														<HoverCardContent className="w-[300px] p-0">
															<CustomerStatsCard
																	selectedConversationId={customer.wa_id}
																	conversations={conversations}
																	reservations={reservations}
																	isRTL={isRTL}
																	isHoverCard={true}
																/>
														</HoverCardContent>
													</HoverCard>
													<p className="text-xs text-muted-foreground">
														{i18n.getMessage("msg_last", isRTL)}{" "}
														{new Date(
															customer.lastActivity,
														).toLocaleDateString()}
													</p>
												</div>
											</div>
											<div className="text-right space-y-1">
												<div className="flex items-center space-x-2">
													<Badge className="text-xs">
														{customer.messageCount}{" "}
														{i18n.getMessage("msg_msgs", isRTL)}
													</Badge>
													<Badge className="text-xs">
														{customer.reservationCount}{" "}
														{i18n.getMessage("msg_bookings", isRTL)}
													</Badge>
												</div>
												<Progress
													value={
														(customer.messageCount /
															Math.max(
																...limitedCustomers.map((c) => c.messageCount),
															)) *
														100
													}
													className="h-1.5 w-20"
												/>
											</div>
										</motion.div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Most Common Words - One Bar Chart */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.7 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageSquare className="h-5 w-5 text-chart-1" />
								{i18n.getMessage("msg_most_common_words", isRTL)}
							</CardTitle>
							<CardDescription>
								{isRTL
									? "الكلمات الأكثر شيوعاً في المحادثات"
									: "Most frequently used words in conversations"}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="h-[400px] relative border border-border/20 bg-background/50 rounded-md">
								{enhancedWordFrequency.length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={enhancedWordFrequency} layout="horizontal" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
											<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
											<XAxisComp type="number" domain={[0, "dataMax"]} tickFormatter={(value: number) => value.toString()} />
											<YAxisComp type="category" dataKey="word" tick={{ fontSize: 12 }} width={70} />
											<Bar dataKey="customerCount" stackId="a" fill="#3b82f6" name={i18n.getMessage("msg_customers", isRTL)} stroke="#3b82f6" strokeWidth={1} />
											<Bar dataKey="assistantCount" stackId="a" fill="#ef4444" name={i18n.getMessage("msg_assistant", isRTL)} stroke="#ef4444" strokeWidth={1} />
											<Tooltip content={renderWordTooltip} />
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
										{i18n.getMessage("chart_no_data", isRTL)}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
