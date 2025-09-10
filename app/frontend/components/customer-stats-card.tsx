"use client";

import { Calendar, Clock, MessageCircle, User } from "lucide-react";
import React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/animate-ui/components/radix/accordion";
import { CustomerReservationsGrid } from "@/components/customer-reservations-grid";
import { InlineCopyBtn } from "@/components/inline-copy-btn";
import { MagicCard } from "@/components/magicui/magic-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Conversations, Reservation } from "@/types/calendar";

interface CustomerStatsCardProps {
	selectedConversationId: string;
	conversations: Conversations;
	reservations: Record<string, Reservation[]>;
	isLocalized: boolean;
	isHoverCard?: boolean;
}

export const CustomerStatsCard = React.memo(function CustomerStatsCard({
	selectedConversationId,
	conversations,
	reservations,
	isLocalized,
	isHoverCard = false,
}: CustomerStatsCardProps) {
	const conversation = conversations[selectedConversationId] || [];
	const customerReservations = reservations[selectedConversationId] || [];
	const customerName = customerReservations[0]?.customer_name || null;

	// State for accordion
	const [accordionValue, setAccordionValue] = React.useState<string>("");

	// Format phone number for PhoneInput component
	const formatPhoneForInput = (phone: string) => {
		// Remove any spaces, dashes, or parentheses from the phone number
		const cleanPhone = phone.replace(/[\s\-()]/g, "");

		// If already has +, return cleaned version
		if (cleanPhone.startsWith("+")) {
			return cleanPhone;
		}

		// Check if it's a Saudi number without country code (starts with 5)
		if (cleanPhone.startsWith("5") && cleanPhone.length === 9) {
			return `+966${cleanPhone}`;
		}

		// Otherwise add + prefix
		return `+${cleanPhone}`;
	};

	const formattedPhone = formatPhoneForInput(selectedConversationId);

	// Calculate conversation stats
	const messageCount = conversation.length;
	const lastMessage =
		conversation.length > 0 ? conversation[conversation.length - 1] : null;

	// Get first message date for "customer since"
	const firstMessage =
		conversation.length > 0
			? [...conversation].sort((a, b) => {
					const aTime = new Date(`${a.date} ${a.time}`);
					const bTime = new Date(`${b.date} ${b.time}`);
					return aTime.getTime() - bTime.getTime();
				})[0]
			: null;

	const formatDate = (dateStr: string) => {
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString(isLocalized ? "ar-SA" : "en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch {
			return dateStr;
		}
	};

	const formatTime = (timeStr: string) => {
		try {
			// Handle various time formats
			if (timeStr.includes("AM") || timeStr.includes("PM")) {
				return timeStr;
			}
			// Convert 24-hour format to 12-hour format
			const [hours, minutes] = timeStr.split(":");
			const hour = Number.parseInt(hours || "0", 10);
			const ampm = hour >= 12 ? "PM" : "AM";
			const hour12 = hour % 12 || 12;
			return `${hour12}:${minutes} ${ampm}`;
		} catch {
			return timeStr;
		}
	};

	return (
		<div className={isHoverCard ? "" : "mb-2"}>
			<MagicCard
				className={`bg-background/90 ${isHoverCard ? "shadow-none border-0" : ""}`}
				gradientSize={200}
				gradientColor="hsl(var(--muted-foreground) / 0.1)"
				gradientOpacity={0.6}
				gradientFrom="hsl(var(--primary))"
				gradientTo="hsl(var(--accent))"
			>
				<Card className="bg-transparent border-0 shadow-none">
					<CardContent className={isHoverCard ? "p-1" : "p-2"}>
						{/* Fixed Customer Info Section */}
						<div className={`${isHoverCard ? "space-y-1" : "space-y-2"}`}>
							{/* Header with Avatar on left, Name and Phone in center */}
							<div
								className={`flex items-center ${isHoverCard ? "gap-2" : "gap-3"}`}
							>
								<Avatar
									className={
										isHoverCard
											? "h-8 w-8 flex-shrink-0"
											: "h-10 w-10 flex-shrink-0"
									}
								>
									<AvatarFallback
										className={`bg-primary/10 text-primary ${isHoverCard ? "text-sm" : "text-base"}`}
									>
										{customerName ? (
											customerName.charAt(0).toUpperCase()
										) : (
											<User className={isHoverCard ? "h-4 w-4" : "h-5 w-5"} />
										)}
									</AvatarFallback>
								</Avatar>

								<div
									className={`flex-1 flex flex-col items-center justify-center text-center ${isHoverCard ? "min-w-0 px-1" : ""}`}
								>
									{customerName ? (
										<div
											className={`font-medium ${isHoverCard ? "text-xs" : "text-sm"} truncate w-full`}
										>
											{customerName}
										</div>
									) : (
										<div
											className={`text-muted-foreground ${isHoverCard ? "text-xs" : "text-sm"} truncate w-full`}
										>
											{isLocalized ? "عميل غير معروف" : "Unknown Customer"}
										</div>
									)}

									<div
										className={`${isHoverCard ? "scale-90 w-full" : "w-full"} mt-0.5 flex justify-center`}
									>
										<span
											className={`text-muted-foreground ${isHoverCard ? "text-xs" : "text-sm"} font-mono`}
										>
											{formattedPhone}
										</span>
									</div>
								</div>

								<div
									className={`flex-shrink-0 ${isHoverCard ? "w-6 flex justify-center" : ""}`}
								>
									<InlineCopyBtn
										text={selectedConversationId}
										isLocalized={isLocalized}
										className="opacity-60 hover:opacity-100"
									/>
								</div>
							</div>

							{/* Stats Section */}
							<div
								className={`${isHoverCard ? "space-y-0.5 px-0.5" : "space-y-1 px-1"}`}
							>
								{/* Customer Since */}
								{firstMessage && (
									<div
										className={`flex items-center justify-between text-xs ${isHoverCard ? "py-0" : "py-0.5"}`}
									>
										<div className="flex items-center gap-1">
											<User
												className={isHoverCard ? "h-2.5 w-2.5" : "h-3 w-3"}
											/>
											<span>{isLocalized ? "عميل منذ" : "Customer since"}</span>
										</div>
										<span className="text-muted-foreground text-[10px]">
											{formatDate(firstMessage.date)}
										</span>
									</div>
								)}

								{/* Messages */}
								<div
									className={`flex items-center justify-between text-xs ${isHoverCard ? "py-0" : "py-0.5"}`}
								>
									<div className="flex items-center gap-1">
										<MessageCircle
											className={isHoverCard ? "h-2.5 w-2.5" : "h-3 w-3"}
										/>
										<span>{isLocalized ? "الرسائل" : "Messages"}</span>
									</div>
									<Badge variant="secondary" className="text-[10px] h-4 px-1">
										{messageCount}
									</Badge>
								</div>

								{/* Last Message */}
								{lastMessage && (
									<div
										className={`flex items-center justify-between text-xs ${isHoverCard ? "py-0" : "py-0.5"}`}
									>
										<div className="flex items-center gap-1">
											<Clock
												className={isHoverCard ? "h-2.5 w-2.5" : "h-3 w-3"}
											/>
											<span>{isLocalized ? "آخر رسالة" : "Last message"}</span>
										</div>
										<span className="text-muted-foreground text-[10px]">
											{formatDate(lastMessage.date)}{" "}
											{formatTime(lastMessage.time)}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Reservations Accordion */}
						{customerReservations.length > 0 && (
							<Accordion
								type="single"
								collapsible
								value={accordionValue}
								onValueChange={setAccordionValue}
								className="w-full mt-2"
							>
								<AccordionItem value="reservations" className="border-b-0">
									<AccordionTrigger
										className={`${isHoverCard ? "py-0.5 px-0.5" : "py-1 px-1"} text-xs font-medium hover:no-underline`}
									>
										<div className="flex items-center gap-1">
											<Calendar
												className={isHoverCard ? "h-2.5 w-2.5" : "h-3 w-3"}
											/>
											<span>{isLocalized ? "الحجوزات" : "Reservations"}</span>
											<Badge
												variant="outline"
												className="text-[10px] h-4 px-1 ml-auto"
											>
												{customerReservations.length}
											</Badge>
										</div>
									</AccordionTrigger>
									<AccordionContent className={isHoverCard ? "pb-0.5" : "pb-1"}>
										<div className={isHoverCard ? "px-0.5" : "px-1"}>
											<CustomerReservationsGrid
												reservations={customerReservations}
												isLocalized={isLocalized}
											/>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						)}
					</CardContent>
				</Card>
			</MagicCard>
		</div>
	);
});
