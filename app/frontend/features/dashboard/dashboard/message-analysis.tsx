"use client";

import type {
	ConversationAnalysis,
	CustomerActivity,
	MessageHeatmapData,
	WordFrequency,
} from "@features/dashboard/types";
import { useCustomerData } from "@shared/libs/data/customer-data-context";
import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { cn } from "@shared/libs/utils";
import { motion } from "framer-motion";
import { Clock, MessageSquare, TrendingUp, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Bar, BarChart, XAxis as XAxisComp } from "recharts";
// import { WordCloudChart } from "./word-cloud"; // Remove for now to reduce heavy render cost
import type { Conversations } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import { CustomerStatsCard } from "@/features/dashboard/customer-stats-card";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import type { ChartConfig } from "@/shared/ui/chart";
import { ChartContainer } from "@/shared/ui/chart";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/shared/ui/hover-card";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/shared/ui/pagination";
import { Progress } from "@/shared/ui/progress";

// Constants
const PERCENTAGE_MULTIPLIER = 100;
const WORD_DISPLAY_LENGTH = 6;

type MessageAnalysisProps = {
	messageHeatmap: MessageHeatmapData[];
	topCustomers: CustomerActivity[];
	conversationAnalysis: ConversationAnalysis;
	wordFrequency: WordFrequency[];
	isLocalized: boolean;
};

// Monochrome custom bar shape for Most Common Words chart
type WordCustomBarProps = {
	fill?: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	index?: number;
	activeIndex?: number | null;
	value?: number | string;
	setActiveIndex?: (index: number | null) => void;
};

function WordCustomBar(props: WordCustomBarProps) {
	const {
		fill,
		x,
		y,
		width,
		height,
		index,
		activeIndex,
		value,
		setActiveIndex,
	} = props;
	const xPos = Number(x || 0);
	const realWidth = Number(width || 0);
	const isActive = index === activeIndex;
	const collapsedWidth = 2;
	const barX = isActive ? xPos : xPos + (realWidth - collapsedWidth) / 2;
	const textX = xPos + realWidth / 2;

	// Animation constants
	const ACTIVE_BAR_DURATION = 0.5;
	const INACTIVE_BAR_DURATION = 1;
	const TEXT_FADE_DURATION = 0.1;
	const TEXT_Y_OFFSET = 5;

	return (
		// biome-ignore lint/a11y/useSemanticElements: SVG g elements use role="button" for accessibility
		<g
			aria-label={`Word bar ${index !== undefined ? index + 1 : 0}, value: ${value}`}
			onFocus={() => setActiveIndex?.(index ?? null)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setActiveIndex?.(index ?? null);
				}
			}}
			onMouseLeave={() => setActiveIndex?.(null)}
			onMouseOver={() => setActiveIndex?.(index ?? null)}
			role="button"
			tabIndex={0}
		>
			<motion.rect
				animate={{ width: isActive ? realWidth : collapsedWidth, x: barX }}
				fill={fill}
				height={height}
				initial={{ width: collapsedWidth, x: barX }}
				transition={{
					duration: isActive ? ACTIVE_BAR_DURATION : INACTIVE_BAR_DURATION,
					type: "spring",
				}}
				y={y}
			/>
			{isActive && (
				<motion.text
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					className="font-mono text-xs"
					exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
					fill={fill}
					initial={{ opacity: 0, y: -10, filter: "blur(3px)" }}
					key={index}
					textAnchor="middle"
					transition={{ duration: TEXT_FADE_DURATION }}
					x={textX}
					y={Number(y) - TEXT_Y_OFFSET}
				>
					{value}
				</motion.text>
			)}
		</g>
	);
}

export function MessageAnalysis({
	messageHeatmap,
	topCustomers,
	conversationAnalysis,
	wordFrequency,
	isLocalized,
}: MessageAnalysisProps) {
	const [currentPage, setCurrentPage] = useState(0);
	const [wordActiveIndex, setWordActiveIndex] = useState<number | null>(null);
	const customersPerPage = 10;
	const maxCustomers = 100;

	// Constants for intensity thresholds
	const INTENSITY_VERY_LOW = 0.2;
	const INTENSITY_LOW = 0.4;
	const INTENSITY_MEDIUM = 0.6;
	const INTENSITY_HIGH = 0.8;

	// Constants for UI/data display
	const BUSIEST_DAY_SUBSTRING_LENGTH = 3;
	const HOURS_PER_DAY = 24;
	const DAYS_PER_WEEK = 7;
	const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;
	const MAX_DISPLAY_WORDS = 20;
	const WORD_FREQUENCY_CUSTOMER_RATIO = 0.7;
	const WORD_FREQUENCY_ASSISTANT_RATIO = 0.3;
	const TIME_PERIOD_MORNING_HOUR = 6;
	const TIME_PERIOD_AFTERNOON_HOUR = 12;
	const TIME_PERIOD_EVENING_HOUR = 18;
	const MAX_HEATMAP_DISPLAY = 99;
	const PAGINATION_THRESHOLD_PAGES = 7;
	const PAGINATION_ADJACENT_OFFSET = 1;
	const PAGINATION_START_PAGES = 3;
	const MOTION_DELAY_X_OFFSET = -20;
	const MOTION_DELAY_INCREMENT_MS = 0.05;

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
	const translateDayName = React.useCallback(
		(dayName: string) => {
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
			return key ? i18n.getMessage(key, isLocalized) : dayName;
		},
		[isLocalized]
	);

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

	const getHeatmapValue = (day: string, hour: number) =>
		heatmapMap.get(`${day}-${hour}`) || 0;

	const getIntensity = (count: number) => {
		const intensity = count / maxCount;
		if (intensity === 0) {
			return "bg-muted/5 border-border/20 text-muted-foreground";
		}
		if (intensity < INTENSITY_VERY_LOW) {
			return "bg-chart-1/10 border-chart-1/20 text-chart-1";
		}
		if (intensity < INTENSITY_LOW) {
			return "bg-chart-1/25 border-chart-1/30 text-chart-1";
		}
		if (intensity < INTENSITY_MEDIUM) {
			return "bg-chart-1/50 border-chart-1/40 text-foreground";
		}
		if (intensity < INTENSITY_HIGH) {
			return "bg-chart-1/75 border-chart-1/50 text-white";
		}
		return "bg-chart-1 border-chart-1 text-white";
	};

	const getIntensityLabel = (count: number) => {
		const intensity = count / maxCount;
		if (intensity === 0) {
			return i18n.getMessage("msg_no_messages", isLocalized);
		}
		if (intensity < INTENSITY_VERY_LOW) {
			return i18n.getMessage("msg_very_low", isLocalized);
		}
		if (intensity < INTENSITY_LOW) {
			return i18n.getMessage("msg_low", isLocalized);
		}
		if (intensity < INTENSITY_MEDIUM) {
			return i18n.getMessage("msg_medium", isLocalized);
		}
		if (intensity < INTENSITY_HIGH) {
			return i18n.getMessage("msg_high", isLocalized);
		}
		return i18n.getMessage("msg_very_high", isLocalized);
	};

	// Precomputed labels to avoid JSX inline IIFEs and multiline parentheses
	const peakHourLabel = React.useMemo(() => {
		const peakData = messageHeatmap.reduce(
			(peak, current) => (current.count > peak.count ? current : peak),
			{
				hour: 0,
				count: 0,
			}
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
			current.total > peak.total ? current : peak
		);
		return translateDayName(busiestDay.day).slice(
			0,
			BUSIEST_DAY_SUBSTRING_LENGTH
		);
	}, [messageHeatmap, translateDayName]);

	const averageMessagesPerHourLabel = React.useMemo(() => {
		const total = messageHeatmap.reduce((sum, d) => sum + d.count, 0);
		return (total / HOURS_PER_WEEK).toFixed(1);
	}, [messageHeatmap, HOURS_PER_WEEK]);

	const paginatedCustomers = limitedCustomers.slice(
		currentPage * customersPerPage,
		(currentPage + 1) * customersPerPage
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
			return wordFrequency.slice(0, MAX_DISPLAY_WORDS).map((word) => ({
				word: word.word,
				customerCount: Math.floor(word.count * WORD_FREQUENCY_CUSTOMER_RATIO),
				assistantCount: Math.ceil(word.count * WORD_FREQUENCY_ASSISTANT_RATIO),
				totalCount: word.count,
			}));
		}
		return [] as Array<{
			word: string;
			customerCount: number;
			assistantCount: number;
			totalCount: number;
		}>;
	}, [wordFrequency]);

	return (
		<div className="space-y-6">
			{/* Message Analysis Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="h-full"
					initial={{ opacity: 0, y: 20 }}
					transition={{ delay: 0.1 }}
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								{i18n.getMessage("msg_total_messages", isLocalized)}
							</CardTitle>
							<MessageSquare className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{conversationAnalysis.totalMessages.toLocaleString()}
							</div>
							<p className="text-muted-foreground text-xs">
								{i18n.getMessage("msg_across_all_conversations", isLocalized)}
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="h-full"
					initial={{ opacity: 0, y: 20 }}
					transition={{ delay: 0.2 }}
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								{i18n.getMessage("msg_avg_message_length", isLocalized)}
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{conversationAnalysis.avgMessageLength.toFixed(0)}
							</div>
							<p className="text-muted-foreground text-xs">
								{i18n.getMessage("msg_chars", isLocalized)} •{" "}
								{conversationAnalysis.avgWordsPerMessage.toFixed(0)}{" "}
								{i18n.getMessage("msg_words_avg", isLocalized)}
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="h-full"
					initial={{ opacity: 0, y: 20 }}
					transition={{ delay: 0.3 }}
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								{i18n.getMessage("msg_avg_response_time", isLocalized)}
							</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{conversationAnalysis.responseTimeStats.avg.toFixed(1)}
								{i18n.getMessage("msg_minutes", isLocalized)}
							</div>
							<p className="text-muted-foreground text-xs">
								{i18n.getMessage("msg_median", isLocalized)}{" "}
								{conversationAnalysis.responseTimeStats.median.toFixed(1)}
								{i18n.getMessage("msg_minutes", isLocalized)}
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="h-full"
					initial={{ opacity: 0, y: 20 }}
					transition={{ delay: 0.4 }}
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								{i18n.getMessage("msg_messages_per_customer", isLocalized)}
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{conversationAnalysis.avgMessagesPerCustomer.toFixed(1)}
							</div>
							<p className="text-muted-foreground text-xs">
								{i18n.getMessage(
									"msg_average_conversation_length",
									isLocalized
								)}
							</p>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Message Volume Heatmap */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				initial={{ opacity: 0, y: 20 }}
				transition={{ delay: 0.5 }}
			>
				<Card className="overflow-hidden">
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<MessageSquare className="h-5 w-5 text-chart-1" />
									{i18n.getMessage("msg_volume_heatmap", isLocalized)}
								</CardTitle>
								<p className="mt-1 text-muted-foreground text-sm">
									{i18n.getMessage("msg_activity_patterns", isLocalized)}
								</p>
							</div>
							<div className="text-right">
								<div className="font-bold text-2xl text-chart-1">
									{maxCount}
								</div>
								<p className="text-muted-foreground text-xs">
									{i18n.getMessage("msg_peak_messages", isLocalized)}
								</p>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pb-6">
						<div className="space-y-4">
							{/* Enhanced Header with time indicators */}
							<div className="mb-3 flex items-center">
								<div className="w-16 flex-shrink-0" />
								<div className="relative flex flex-1">
									{hours.map((hour) => (
										<div
											className="relative min-w-[1.5rem] flex-1 text-center font-medium text-muted-foreground text-xs"
											key={hour}
										>
											{hour.toString().padStart(2, "0")}
											{/* Time period indicators */}
											{hour === TIME_PERIOD_MORNING_HOUR && (
												<div className="-top-2 absolute right-0 left-0 font-medium text-[0.625rem] text-chart-3">
													{i18n.getMessage("msg_morning", isLocalized)}
												</div>
											)}
											{hour === TIME_PERIOD_AFTERNOON_HOUR && (
												<div className="-top-2 absolute right-0 left-0 font-medium text-[0.625rem] text-chart-2">
													{i18n.getMessage("msg_afternoon", isLocalized)}
												</div>
											)}
											{hour === TIME_PERIOD_EVENING_HOUR && (
												<div className="-top-2 absolute right-0 left-0 font-medium text-[0.625rem] text-chart-4">
													{i18n.getMessage("msg_evening", isLocalized)}
												</div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Heatmap grid without per-cell animations */}
							<div className="space-y-1">
								{daysOrder.map((day) => (
									<div className="group flex items-center" key={day}>
										<div className="w-16 flex-shrink-0 pr-3 text-right font-medium text-foreground text-sm">
											<div className="rounded-md border bg-accent/20 px-2 py-1">
												{translateDayName(day).slice(
													0,
													BUSIEST_DAY_SUBSTRING_LENGTH
												)}
											</div>
										</div>
										<div className="flex flex-1 gap-[0.0625rem]">
											{hours.map((hour) => {
												const count = getHeatmapValue(day, hour);
												return (
													<div
														className={`relative aspect-square flex-1 ${getIntensity(
															count
														)} min-h-[1.5rem] min-w-[1.5rem] rounded border-2`}
														key={`${day}-${hour}`}
														title={`${translateDayName(day)} ${hour.toString().padStart(2, "0")}:00\n${count} ${i18n.getMessage(
															"msg_messages",
															isLocalized
														)}\n${getIntensityLabel(count)} ${i18n.getMessage("msg_activity", isLocalized)}`}
													>
														{count > 0 && (
															<div className="absolute inset-0 flex items-center justify-center">
																<span className="select-none font-bold text-xs">
																	{count > MAX_HEATMAP_DISPLAY
																		? `${MAX_HEATMAP_DISPLAY}+`
																		: count}
																</span>
															</div>
														)}
														{count === maxCount && (
															<div className="-top-1 -right-1 absolute h-3 w-3 rounded-full border-2 border-background bg-chart-3 shadow-sm" />
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
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<span>{i18n.getMessage("msg_less", isLocalized)}</span>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<span>{i18n.getMessage("msg_more", isLocalized)}</span>
									</div>
								</div>

								<div className="relative">
									<div className="h-4 overflow-hidden rounded-full border border-border/50 shadow-inner">
										<div className="h-full bg-gradient-to-r from-muted/20 via-chart-1/30 via-chart-1/60 to-chart-1" />
									</div>
									<div className="mt-2 flex justify-between text-muted-foreground text-xs">
										<span>0</span>
										<span>{Math.floor(maxCount * INTENSITY_VERY_LOW)}</span>
										<span>{Math.floor(maxCount * INTENSITY_LOW)}</span>
										<span>{Math.floor(maxCount * INTENSITY_MEDIUM)}</span>
										<span>{maxCount}</span>
									</div>
								</div>

								{/* Activity insights */}
								<div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
									<div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
										<div className="text-muted-foreground text-xs">
											{i18n.getMessage("msg_peak_hour", isLocalized)}
										</div>
										<div className="font-semibold text-chart-1 text-sm">
											{peakHourLabel}
										</div>
									</div>

									<div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
										<div className="text-muted-foreground text-xs">
											{i18n.getMessage("msg_busiest_day", isLocalized)}
										</div>
										<div className="font-semibold text-chart-2 text-sm">
											{busiestDayShortLabel}
										</div>
									</div>

									<div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
										<div className="text-muted-foreground text-xs">
											{i18n.getMessage("msg_total_messages", isLocalized)}
										</div>
										<div className="font-semibold text-chart-3 text-sm">
											{messageHeatmap
												.reduce((sum, d) => sum + d.count, 0)
												.toLocaleString()}
										</div>
									</div>

									<div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
										<div className="text-muted-foreground text-xs">
											{i18n.getMessage("msg_avg_per_hour", isLocalized)}
										</div>
										<div className="font-semibold text-chart-4 text-sm">
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
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 20 }}
					transition={{ delay: 0.6 }}
				>
					<Card className="h-full">
						<CardHeader>
							<CardTitle>
								{i18n.getMessage("msg_most_active_customers", isLocalized)}{" "}
								{`(${maxCustomers})`}
							</CardTitle>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<Badge>
										{i18n.getMessage("msg_page", isLocalized)} {currentPage + 1}{" "}
										{i18n.getMessage("msg_of", isLocalized)} {totalPages}
									</Badge>
									<Badge>
										{limitedCustomers.length}{" "}
										{i18n.getMessage("msg_total", isLocalized)}
									</Badge>
								</div>

								<div className="flex items-center space-x-1">
									<Pagination>
										<PaginationContent>
											<PaginationItem>
												<PaginationPrevious
													className={cn(
														currentPage === 0 &&
															"pointer-events-none opacity-50"
													)}
													onClick={(e) => {
														e.preventDefault();
														handlePrevPage();
													}}
												/>
											</PaginationItem>

											{Array.from({ length: totalPages }).map((_, idx) => {
												const pageNumber = idx + 1;
												const isActive = idx === currentPage;

												if (totalPages > PAGINATION_THRESHOLD_PAGES) {
													if (
														pageNumber === 1 ||
														pageNumber === totalPages ||
														Math.abs(pageNumber - (currentPage + 1)) <=
															PAGINATION_ADJACENT_OFFSET
													) {
														return (
															<PaginationItem key={pageNumber}>
																<PaginationLink
																	isActive={isActive}
																	onClick={(e) => {
																		e.preventDefault();
																		setCurrentPage(idx);
																	}}
																>
																	{pageNumber}
																</PaginationLink>
															</PaginationItem>
														);
													}

													if (
														(pageNumber === PAGINATION_START_PAGES + 1 &&
															currentPage + 1 > PAGINATION_START_PAGES + 2) ||
														(pageNumber ===
															totalPages - PAGINATION_ADJACENT_OFFSET &&
															currentPage + 1 <
																totalPages - PAGINATION_ADJACENT_OFFSET)
													) {
														return (
															<PaginationItem key={`ellipsis-${pageNumber}`}>
																<PaginationEllipsis />
															</PaginationItem>
														);
													}

													return null;
												}

												return (
													<PaginationItem key={pageNumber}>
														<PaginationLink
															isActive={isActive}
															onClick={(e) => {
																e.preventDefault();
																setCurrentPage(idx);
															}}
														>
															{pageNumber}
														</PaginationLink>
													</PaginationItem>
												);
											})}

											<PaginationItem>
												<PaginationNext
													className={cn(
														currentPage >= totalPages - 1 &&
															"pointer-events-none opacity-50"
													)}
													onClick={(e) => {
														e.preventDefault();
														handleNextPage();
													}}
												/>
											</PaginationItem>
										</PaginationContent>
									</Pagination>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="max-h-[25rem] space-y-3 overflow-y-auto">
								{paginatedCustomers.map((customer, index) => {
									const globalIndex =
										currentPage * customersPerPage + index + 1;
									const initials = customer.wa_id
										.replace(/[^a-zA-Z0-9]/g, "")
										.slice(-2)
										.toUpperCase();

									return (
										<motion.div
											animate={{ opacity: 1, x: 0 }}
											className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
											initial={{ opacity: 0, x: MOTION_DELAY_X_OFFSET }}
											key={customer.wa_id}
											transition={{ delay: index * MOTION_DELAY_INCREMENT_MS }}
										>
											<div className="flex items-center space-x-3">
												<div className="flex items-center space-x-2">
													<span className="w-6 font-medium text-muted-foreground text-sm">
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
															<button
																className="max-w-[11.25rem] cursor-pointer truncate border-none bg-transparent p-0 text-left font-medium text-sm hover:text-blue-600"
																onClick={() =>
																	handleCustomerClick(customer.wa_id)
																}
																onKeyDown={(e) => {
																	if (e.key === "Enter" || e.key === " ") {
																		e.preventDefault();
																		handleCustomerClick(customer.wa_id);
																	}
																}}
																type="button"
															>
																{getCustomerName(customer.wa_id)}
															</button>
														</HoverCardTrigger>
														<HoverCardContent className="w-[18.75rem] p-0">
															<CustomerStatsCard
																conversations={
																	conversations as unknown as Conversations
																}
																isHoverCard={true}
																isLocalized={isLocalized}
																reservations={
																	reservations as unknown as Record<
																		string,
																		Reservation[]
																	>
																}
																selectedConversationId={customer.wa_id}
															/>
														</HoverCardContent>
													</HoverCard>
													<p className="text-muted-foreground text-xs">
														{i18n.getMessage("msg_last", isLocalized)}{" "}
														{new Date(
															customer.lastActivity
														).toLocaleDateString()}
													</p>
												</div>
											</div>
											<div className="space-y-1 text-right">
												<div className="flex items-center space-x-2">
													<Badge className="text-xs">
														{customer.messageCount}{" "}
														{i18n.getMessage("msg_msgs", isLocalized)}
													</Badge>
													<Badge className="text-xs">
														{customer.reservationCount}{" "}
														{i18n.getMessage("msg_bookings", isLocalized)}
													</Badge>
												</div>
												<Progress
													className="h-1.5 w-20"
													value={
														(customer.messageCount /
															Math.max(
																...limitedCustomers.map((c) => c.messageCount)
															)) *
														PERCENTAGE_MULTIPLIER
													}
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
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 20 }}
					transition={{ delay: 0.7 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageSquare className="h-5 w-5 text-muted-foreground" />
								{i18n.getMessage("msg_most_common_words", isLocalized)}
							</CardTitle>
							<CardDescription>
								{i18n.getMessage("msg_most_common_words", isLocalized)}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								className="h-[25rem] w-full"
								config={
									{
										desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
									} as unknown as ChartConfig
								}
							>
								<BarChart
									data={enhancedWordFrequency.map((w) => ({
										month: w.word,
										desktop: w.totalCount,
									}))}
									onMouseLeave={() => setWordActiveIndex(null)}
								>
									<XAxisComp
										axisLine={false}
										dataKey="month"
										tickFormatter={(value) =>
											String(value).slice(0, WORD_DISPLAY_LENGTH)
										}
										tickLine={false}
										tickMargin={10}
									/>
									<Bar
										dataKey="desktop"
										fill="var(--color-desktop)"
										shape={
											<WordCustomBar
												activeIndex={wordActiveIndex}
												setActiveIndex={setWordActiveIndex}
											/>
										}
									/>
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
