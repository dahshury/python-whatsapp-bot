"use client";

import type {
	ConversationAnalysis,
	CustomerActivity,
	MessageHeatmapData,
	WordFrequency,
} from "@features/dashboard/types";
// import { WordCloudChart } from "./word-cloud"; // Remove for now to reduce heavy render cost
import { useCustomerData } from "@shared/libs/data/customer-data-context";
import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { cn } from "@shared/libs/utils";
import { motion } from "framer-motion";
import { Clock, MessageSquare, TrendingUp, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Bar, BarChart, XAxis as XAxisComp } from "recharts";
import type { Conversations } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import { CustomerStatsCard } from "@/features/dashboard/customer-stats-card";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ChartConfig } from "@/shared/ui/chart";
import { ChartContainer } from "@/shared/ui/chart";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/shared/ui/hover-card";
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

interface MessageAnalysisProps {
	messageHeatmap: MessageHeatmapData[];
	topCustomers: CustomerActivity[];
	conversationAnalysis: ConversationAnalysis;
	wordFrequency: WordFrequency[];
	isLocalized: boolean;
}

// Monochrome custom bar shape for Most Common Words chart
interface WordCustomBarProps {
	fill?: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	index?: number;
	activeIndex?: number | null;
	value?: number | string;
	setActiveIndex?: (index: number | null) => void;
}

function WordCustomBar(props: WordCustomBarProps) {
	const { fill, x, y, width, height, index, activeIndex, value, setActiveIndex } = props;
	const xPos = Number(x || 0);
	const realWidth = Number(width || 0);
	const isActive = index === activeIndex;
	const collapsedWidth = 2;
	const barX = isActive ? xPos : xPos + (realWidth - collapsedWidth) / 2;
	const textX = xPos + realWidth / 2;
	return (
		// biome-ignore lint/a11y/useSemanticElements: SVG g elements use role="button" for accessibility
		<g
			role="button"
			tabIndex={0}
			onMouseEnter={() => setActiveIndex?.(index ?? null)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setActiveIndex?.(index ?? null);
				}
			}}
			aria-label={`Word bar ${index !== undefined ? index + 1 : 0}, value: ${value}`}
		>
			<motion.rect
				y={y}
				initial={{ width: collapsedWidth, x: barX }}
				animate={{ width: isActive ? realWidth : collapsedWidth, x: barX }}
				transition={{ duration: isActive ? 0.5 : 1, type: "spring" }}
				height={height}
				fill={fill}
			/>
			{isActive && (
				<motion.text
					key={index}
					initial={{ opacity: 0, y: -10, filter: "blur(3px)" }}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
					transition={{ duration: 0.1 }}
					x={textX}
					y={Number(y) - 5}
					textAnchor="middle"
					fill={fill}
					className="font-mono text-xs"
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

	// Use real data only to avoid extra rendering cost
	const limitedCustomers = topCustomers.slice(0, maxCustomers);
	const totalPages = Math.ceil(limitedCustomers.length / customersPerPage);

	const { customers: customerDirectory, conversations, reservations } = useCustomerData();
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
	const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
		if (intensity < 0.6) return "bg-chart-1/50 border-chart-1/40 text-foreground";
		if (intensity < 0.8) return "bg-chart-1/75 border-chart-1/50 text-white";
		return "bg-chart-1 border-chart-1 text-white";
	};

	const getIntensityLabel = (count: number) => {
		const intensity = count / maxCount;
		if (intensity === 0) return i18n.getMessage("msg_no_messages", isLocalized);
		if (intensity < 0.2) return i18n.getMessage("msg_very_low", isLocalized);
		if (intensity < 0.4) return i18n.getMessage("msg_low", isLocalized);
		if (intensity < 0.6) return i18n.getMessage("msg_medium", isLocalized);
		if (intensity < 0.8) return i18n.getMessage("msg_high", isLocalized);
		return i18n.getMessage("msg_very_high", isLocalized);
	};

	// Precomputed labels to avoid JSX inline IIFEs and multiline parentheses
	const peakHourLabel = React.useMemo(() => {
		const peakData = messageHeatmap.reduce((peak, current) => (current.count > peak.count ? current : peak), {
			hour: 0,
			count: 0,
		});
		return `${peakData.hour.toString().padStart(2, "0")}:00`;
	}, [messageHeatmap]);

	const busiestDayShortLabel = React.useMemo(() => {
		const dayTotals = daysOrder.map((day) => ({
			day,
			total: messageHeatmap.filter((d) => d.weekday === day).reduce((sum, d) => sum + d.count, 0),
		}));
		const busiestDay = dayTotals.reduce((peak, current) => (current.total > peak.total ? current : peak));
		return translateDayName(busiestDay.day).slice(0, 3);
	}, [messageHeatmap, translateDayName]);

	const averageMessagesPerHourLabel = React.useMemo(() => {
		const total = messageHeatmap.reduce((sum, d) => sum + d.count, 0);
		return (total / (24 * 7)).toFixed(1);
	}, [messageHeatmap]);

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
			return wordFrequency.slice(0, 20).map((word) => ({
				word: word.word,
				customerCount: Math.floor(word.count * 0.7),
				assistantCount: Math.ceil(word.count * 0.3),
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
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="h-full"
				>
					<Card className="h-full">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{i18n.getMessage("msg_total_messages", isLocalized)}
							</CardTitle>
							<MessageSquare className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{conversationAnalysis.totalMessages.toLocaleString()}</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_across_all_conversations", isLocalized)}
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
								{i18n.getMessage("msg_avg_message_length", isLocalized)}
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{conversationAnalysis.avgMessageLength.toFixed(0)}</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_chars", isLocalized)} • {conversationAnalysis.avgWordsPerMessage.toFixed(0)}{" "}
								{i18n.getMessage("msg_words_avg", isLocalized)}
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
								{i18n.getMessage("msg_avg_response_time", isLocalized)}
							</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{conversationAnalysis.responseTimeStats.avg.toFixed(1)}
								{i18n.getMessage("msg_minutes", isLocalized)}
							</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_median", isLocalized)} {conversationAnalysis.responseTimeStats.median.toFixed(1)}
								{i18n.getMessage("msg_minutes", isLocalized)}
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
								{i18n.getMessage("msg_messages_per_customer", isLocalized)}
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{conversationAnalysis.avgMessagesPerCustomer.toFixed(1)}</div>
							<p className="text-xs text-muted-foreground">
								{i18n.getMessage("msg_average_conversation_length", isLocalized)}
							</p>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Message Volume Heatmap */}
			<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
				<Card className="overflow-hidden">
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<MessageSquare className="h-5 w-5 text-chart-1" />
									{i18n.getMessage("msg_volume_heatmap", isLocalized)}
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									{i18n.getMessage("msg_activity_patterns", isLocalized)}
								</p>
							</div>
							<div className="text-right">
								<div className="text-2xl font-bold text-chart-1">{maxCount}</div>
								<p className="text-xs text-muted-foreground">{i18n.getMessage("msg_peak_messages", isLocalized)}</p>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pb-6">
						<div className="space-y-4">
							{/* Enhanced Header with time indicators */}
							<div className="flex items-center mb-3">
								<div className="w-16 flex-shrink-0" />
								<div className="flex flex-1 relative">
									{hours.map((hour) => (
										<div
											key={hour}
											className="flex-1 text-center text-muted-foreground text-xs font-medium min-w-[1.5rem] relative"
										>
											{hour.toString().padStart(2, "0")}
											{/* Time period indicators */}
											{hour === 6 && (
												<div className="absolute -top-2 left-0 right-0 text-[0.625rem] text-chart-3 font-medium">
													{i18n.getMessage("msg_morning", isLocalized)}
												</div>
											)}
											{hour === 12 && (
												<div className="absolute -top-2 left-0 right-0 text-[0.625rem] text-chart-2 font-medium">
													{i18n.getMessage("msg_afternoon", isLocalized)}
												</div>
											)}
											{hour === 18 && (
												<div className="absolute -top-2 left-0 right-0 text-[0.625rem] text-chart-4 font-medium">
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
									<div key={day} className="flex items-center group">
										<div className="w-16 flex-shrink-0 text-sm font-medium text-foreground text-right pr-3">
											<div className="bg-accent/20 px-2 py-1 rounded-md border">
												{translateDayName(day).slice(0, 3)}
											</div>
										</div>
										<div className="flex flex-1 gap-[0.0625rem]">
											{hours.map((hour) => {
												const count = getHeatmapValue(day, hour);
												return (
													<div
														key={`${day}-${hour}`}
														className={`relative flex-1 aspect-square ${getIntensity(count)} min-w-[1.5rem] min-h-[1.5rem] rounded border-2`}
														title={`${translateDayName(day)} ${hour.toString().padStart(2, "0")}:00\n${count} ${i18n.getMessage("msg_messages", isLocalized)}\n${getIntensityLabel(count)} ${i18n.getMessage("msg_activity", isLocalized)}`}
													>
														{count > 0 && (
															<div className="absolute inset-0 flex items-center justify-center">
																<span className="text-xs font-bold select-none">{count > 99 ? "99+" : count}</span>
															</div>
														)}
														{count === maxCount && (
															<div className="absolute -top-1 -right-1 w-3 h-3 bg-chart-3 rounded-full border-2 border-background shadow-sm" />
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
										<span>{i18n.getMessage("msg_less", isLocalized)}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span>{i18n.getMessage("msg_more", isLocalized)}</span>
									</div>
								</div>

								<div className="relative">
									<div className="h-4 rounded-full overflow-hidden border border-border/50 shadow-inner">
										<div className="h-full bg-gradient-to-r from-muted/20 via-chart-1/30 via-chart-1/60 to-chart-1" />
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
										<div className="text-xs text-muted-foreground">{i18n.getMessage("msg_peak_hour", isLocalized)}</div>
										<div className="text-sm font-semibold text-chart-1">{peakHourLabel}</div>
									</div>

									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_busiest_day", isLocalized)}
										</div>
										<div className="text-sm font-semibold text-chart-2">{busiestDayShortLabel}</div>
									</div>

									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_total_messages", isLocalized)}
										</div>
										<div className="text-sm font-semibold text-chart-3">
											{messageHeatmap.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
										</div>
									</div>

									<div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
										<div className="text-xs text-muted-foreground">
											{i18n.getMessage("msg_avg_per_hour", isLocalized)}
										</div>
										<div className="text-sm font-semibold text-chart-4">{averageMessagesPerHourLabel}</div>
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
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle>
								{i18n.getMessage("msg_most_active_customers", isLocalized)} {`(${maxCustomers})`}
							</CardTitle>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<Badge>
										{i18n.getMessage("msg_page", isLocalized)} {currentPage + 1}{" "}
										{i18n.getMessage("msg_of", isLocalized)} {totalPages}
									</Badge>
									<Badge>
										{limitedCustomers.length} {i18n.getMessage("msg_total", isLocalized)}
									</Badge>
								</div>

								<div className="flex items-center space-x-1">
									<Pagination>
										<PaginationContent>
											<PaginationItem>
												<PaginationPrevious
													href="#"
													onClick={(e) => {
														e.preventDefault();
														handlePrevPage();
													}}
													className={cn(currentPage === 0 && "pointer-events-none opacity-50")}
												/>
											</PaginationItem>

											{Array.from({ length: totalPages }).map((_, idx) => {
												const pageNumber = idx + 1;
												const isActive = idx === currentPage;

												if (totalPages > 7) {
													if (
														pageNumber === 1 ||
														pageNumber === totalPages ||
														Math.abs(pageNumber - (currentPage + 1)) <= 1
													) {
														return (
															<PaginationItem key={pageNumber}>
																<PaginationLink
																	href="#"
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
														(pageNumber === 2 && currentPage + 1 > 3) ||
														(pageNumber === totalPages - 1 && currentPage + 1 < totalPages - 2)
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
															href="#"
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
													href="#"
													onClick={(e) => {
														e.preventDefault();
														handleNextPage();
													}}
													className={cn(currentPage >= totalPages - 1 && "pointer-events-none opacity-50")}
												/>
											</PaginationItem>
										</PaginationContent>
									</Pagination>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-3 max-h-[25rem] overflow-y-auto">
								{paginatedCustomers.map((customer, index) => {
									const globalIndex = currentPage * customersPerPage + index + 1;
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
													<span className="text-sm font-medium text-muted-foreground w-6">#{globalIndex}</span>
													<Avatar className="h-8 w-8">
														<AvatarFallback className="text-xs">{initials}</AvatarFallback>
													</Avatar>
												</div>
												<div>
													<HoverCard>
														<HoverCardTrigger asChild>
															<button
																type="button"
																className="text-sm font-medium cursor-pointer truncate max-w-[11.25rem] hover:text-blue-600 bg-transparent border-none p-0 text-left"
																onClick={() => handleCustomerClick(customer.wa_id)}
																onKeyDown={(e) => {
																	if (e.key === "Enter" || e.key === " ") {
																		e.preventDefault();
																		handleCustomerClick(customer.wa_id);
																	}
																}}
															>
																{getCustomerName(customer.wa_id)}
															</button>
														</HoverCardTrigger>
														<HoverCardContent className="w-[18.75rem] p-0">
															<CustomerStatsCard
																selectedConversationId={customer.wa_id}
																conversations={conversations as unknown as Conversations}
																reservations={reservations as unknown as Record<string, Reservation[]>}
																isLocalized={isLocalized}
																isHoverCard={true}
															/>
														</HoverCardContent>
													</HoverCard>
													<p className="text-xs text-muted-foreground">
														{i18n.getMessage("msg_last", isLocalized)}{" "}
														{new Date(customer.lastActivity).toLocaleDateString()}
													</p>
												</div>
											</div>
											<div className="text-right space-y-1">
												<div className="flex items-center space-x-2">
													<Badge className="text-xs">
														{customer.messageCount} {i18n.getMessage("msg_msgs", isLocalized)}
													</Badge>
													<Badge className="text-xs">
														{customer.reservationCount} {i18n.getMessage("msg_bookings", isLocalized)}
													</Badge>
												</div>
												<Progress
													value={
														(customer.messageCount / Math.max(...limitedCustomers.map((c) => c.messageCount))) * 100
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
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageSquare className="h-5 w-5 text-muted-foreground" />
								{i18n.getMessage("msg_most_common_words", isLocalized)}
							</CardTitle>
							<CardDescription>{i18n.getMessage("msg_most_common_words", isLocalized)}</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={
									{
										desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
									} as unknown as ChartConfig
								}
								className="h-[25rem] w-full"
							>
								<BarChart
									data={enhancedWordFrequency.map((w) => ({
										month: w.word,
										desktop: w.totalCount,
									}))}
									onMouseLeave={() => setWordActiveIndex(null)}
								>
									<XAxisComp
										dataKey="month"
										tickLine={false}
										tickMargin={10}
										axisLine={false}
										tickFormatter={(value) => String(value).slice(0, 6)}
									/>
									<Bar
										dataKey="desktop"
										fill="var(--color-desktop)"
										shape={<WordCustomBar setActiveIndex={setWordActiveIndex} activeIndex={wordActiveIndex} />}
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
