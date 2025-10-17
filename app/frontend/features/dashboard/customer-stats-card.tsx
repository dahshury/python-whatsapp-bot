"use client";

import { Badge } from "@ui/badge";
import { Card, CardContent } from "@ui/card";
import {
	Calendar,
	CalendarDays,
	Clock,
	MapPin,
	MessageCircle,
	User,
} from "lucide-react";
import React from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import { CustomerReservationsGrid } from "@/features/dashboard/customer-reservations-grid";
import { getCountryLabel } from "@/shared/libs/phone/countries";
import { getCountryFromPhone } from "@/shared/libs/utils/phone-utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/ui/animate-ui/components/radix/accordion";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { InlineCopyBtn } from "@/shared/ui/inline-copy-btn";
import { MagicCard } from "@/shared/ui/magicui/magic-card";

// Constants
const COUNTRY_CODE_STRIP_PATTERN = /\s*\(\+.*\)$/;
const SAUDI_COUNTRY_CODE = "966";
const SAUDI_PHONE_PREFIX = "5";
const SAUDI_PHONE_LENGTH = 9;
const NOON_HOUR = 12;
const HOURS_PER_12HOUR_FORMAT = 12;
const UNKNOWN_DATE_AR = "تاريخ غير معروف";
const UNKNOWN_DATE_EN = "Unknown date";
const UNKNOWN_COUNTRY_AR = "غير معروف";
const UNKNOWN_COUNTRY_EN = "Unknown";

type CustomerStatsCardProps = {
	selectedConversationId: string;
	conversations: Record<string, ConversationMessage[]>;
	reservations: Record<string, Reservation[]>;
	isLocalized: boolean;
	isHoverCard?: boolean;
};

// Helper function to format phone for input
function formatPhoneForInput(phone: string): string {
	const cleanPhone = phone.replace(/[\s\-()]/g, "");
	if (cleanPhone.startsWith("+")) {
		return cleanPhone;
	}
	if (
		cleanPhone.startsWith(SAUDI_PHONE_PREFIX) &&
		cleanPhone.length === SAUDI_PHONE_LENGTH
	) {
		return `+${SAUDI_COUNTRY_CODE}${cleanPhone}`;
	}
	return `+${cleanPhone}`;
}

// Helper function to get country name
function getCountryNameDisplay(
	countryCode: string,
	isLocalized: boolean
): string {
	try {
		const label = getCountryLabel(countryCode as never, isLocalized);
		return (
			(label || "").replace(COUNTRY_CODE_STRIP_PATTERN, "") ||
			(isLocalized ? UNKNOWN_COUNTRY_AR : UNKNOWN_COUNTRY_EN)
		);
	} catch {
		return isLocalized ? UNKNOWN_COUNTRY_AR : UNKNOWN_COUNTRY_EN;
	}
}

// Helper to format date string
function formatDateString(dateStr: string, isLocalized: boolean): string {
	try {
		if (!dateStr || dateStr === "Invalid Date" || dateStr === "") {
			return isLocalized ? UNKNOWN_DATE_AR : UNKNOWN_DATE_EN;
		}
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) {
			return isLocalized ? UNKNOWN_DATE_AR : UNKNOWN_DATE_EN;
		}
		return date.toLocaleDateString(isLocalized ? "ar-SA" : "en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return isLocalized ? UNKNOWN_DATE_AR : UNKNOWN_DATE_EN;
	}
}

// Helper function to format time string
function formatTimeString(timeStr: string): string {
	try {
		if (!timeStr || timeStr === "Invalid Date" || timeStr === "") {
			return "";
		}
		if (timeStr.includes("AM") || timeStr.includes("PM")) {
			return timeStr;
		}
		const [hours, minutes] = timeStr.split(":");
		if (!(hours && minutes)) {
			return "";
		}
		const hour = Number.parseInt(hours, 10);
		const ampm = hour >= NOON_HOUR ? "PM" : "AM";
		const hour12 = hour % HOURS_PER_12HOUR_FORMAT || HOURS_PER_12HOUR_FORMAT;
		return `${hour12}:${minutes} ${ampm}`;
	} catch {
		return "";
	}
}

// Helper component for avatar section
function CustomerAvatar({
	customerName,
	isHoverCard,
}: {
	customerName: string | null;
	isHoverCard: boolean;
}) {
	const fallbackChar = customerName ? customerName.charAt(0).toUpperCase() : "";
	return (
		<Avatar
			className={
				isHoverCard ? "h-8 w-8 flex-shrink-0" : "h-10 w-10 flex-shrink-0"
			}
		>
			<AvatarFallback
				className={`bg-primary/10 text-primary ${isHoverCard ? "text-sm" : "text-base"}`}
			>
				{fallbackChar ? (
					fallbackChar
				) : (
					<User className={isHoverCard ? "h-4 w-4" : "h-5 w-5"} />
				)}
			</AvatarFallback>
		</Avatar>
	);
}

// Helper component for name and phone section
function CustomerNameAndPhone({
	customerName,
	formattedPhone,
	isHoverCard,
	isLocalized,
}: {
	customerName: string | null;
	formattedPhone: string;
	isHoverCard: boolean;
	isLocalized: boolean;
}) {
	return (
		<div
			className={`flex flex-1 flex-col items-center justify-center text-center ${isHoverCard ? "min-w-0 px-1" : ""}`}
		>
			{customerName ? (
				<div
					className={`font-medium ${isHoverCard ? "text-xs" : "text-sm"} w-full truncate`}
				>
					{customerName}
				</div>
			) : (
				<div
					className={`text-muted-foreground ${isHoverCard ? "text-xs" : "text-sm"} w-full truncate`}
				>
					{isLocalized ? "عميل غير معروف" : "Unknown Customer"}
				</div>
			)}

			<div
				className={`${isHoverCard ? "w-full scale-90" : "w-full"} mt-0.5 flex justify-center`}
			>
				<span
					className={`text-muted-foreground ${isHoverCard ? "text-xs" : "text-sm"} font-mono`}
				>
					{formattedPhone}
				</span>
			</div>
		</div>
	);
}

// Helper component to render customer header
function CustomerHeader({
	customerName,
	selectedConversationId,
	formattedPhone,
	isHoverCard,
	isLocalized,
}: {
	customerName: string | null;
	selectedConversationId: string;
	formattedPhone: string;
	isHoverCard: boolean;
	isLocalized: boolean;
}) {
	return (
		<div className={`flex items-center ${isHoverCard ? "gap-2" : "gap-3"}`}>
			<CustomerAvatar customerName={customerName} isHoverCard={isHoverCard} />
			<CustomerNameAndPhone
				customerName={customerName}
				formattedPhone={formattedPhone}
				isHoverCard={isHoverCard}
				isLocalized={isLocalized}
			/>
			<div
				className={`flex-shrink-0 ${isHoverCard ? "flex w-6 justify-center" : ""}`}
			>
				<InlineCopyBtn
					className="opacity-60 hover:opacity-100"
					isLocalized={isLocalized}
					text={selectedConversationId}
				/>
			</div>
		</div>
	);
}

// Helper component for a single stat row
function StatRow({
	icon: Icon,
	label,
	value,
	isHoverCard,
	isBadge = false,
	badgeVariant = "secondary",
}: {
	icon: typeof User;
	label: string;
	value: string | number;
	isHoverCard: boolean;
	isBadge?: boolean;
	badgeVariant?: "secondary" | "outline";
}) {
	return (
		<div
			className={`flex items-center justify-between text-xs ${isHoverCard ? "py-0" : "py-0.5"}`}
		>
			<div className="flex items-center gap-1">
				<Icon className={isHoverCard ? "h-2.5 w-2.5" : "h-3 w-3"} />
				<span>{label}</span>
			</div>
			{isBadge ? (
				<Badge className="h-4 px-1 text-[0.625rem]" variant={badgeVariant}>
					{value}
				</Badge>
			) : (
				<span className="text-[0.625rem] text-muted-foreground">{value}</span>
			)}
		</div>
	);
}

// Helper component to render stats
function CustomerStatsSection({
	isHoverCard,
	isLocalized,
	firstMessage,
	messageCount,
	lastMessage,
	customerReservations,
}: {
	isHoverCard: boolean;
	isLocalized: boolean;
	firstMessage: ConversationMessage | null;
	messageCount: number;
	lastMessage: ConversationMessage | null;
	customerReservations: Reservation[];
}) {
	return (
		<div className={`${isHoverCard ? "space-y-1 px-0.5" : "space-y-1 px-1"}`}>
			{/* Customer Since */}
			{!isHoverCard && firstMessage?.date && (
				<StatRow
					icon={User}
					isHoverCard={isHoverCard}
					label={isLocalized ? "عميل منذ" : "Customer since"}
					value={formatDateString(firstMessage.date, isLocalized)}
				/>
			)}

			{/* Messages */}
			<StatRow
				badgeVariant="secondary"
				icon={MessageCircle}
				isBadge
				isHoverCard={isHoverCard}
				label={isLocalized ? "الرسائل" : "Messages"}
				value={messageCount}
			/>

			{/* Last Message */}
			{lastMessage?.date && (
				<StatRow
					icon={Clock}
					isHoverCard={isHoverCard}
					label={isLocalized ? "آخر رسالة" : "Last message"}
					value={`${formatDateString(lastMessage.date, isLocalized)}${
						lastMessage?.time && formatTimeString(lastMessage.time)
							? ` ${formatTimeString(lastMessage.time)}`
							: ""
					}`}
				/>
			)}

			{/* Reservations count (summary in hover) */}
			{isHoverCard && (
				<StatRow
					badgeVariant="outline"
					icon={Calendar}
					isBadge
					isHoverCard={isHoverCard}
					label={isLocalized ? "الحجوزات" : "Reservations"}
					value={customerReservations.length}
				/>
			)}
		</div>
	);
}

// Helper function to calculate first message
function calculateFirstMessage(
	conversation: ConversationMessage[]
): ConversationMessage | null {
	if (conversation.length === 0) {
		return null;
	}
	const first = [...conversation].sort((a, b) => {
		const aTime = new Date(`${a.date} ${a.time}`);
		const bTime = new Date(`${b.date} ${b.time}`);
		return aTime.getTime() - bTime.getTime();
	})[0];
	return first ?? null;
}

// Helper to get joined date display
function getJoinedDateDisplayText(
	firstMessage: ConversationMessage | null,
	isLocalized: boolean
): string {
	if (!firstMessage?.date) {
		return isLocalized ? UNKNOWN_DATE_AR : UNKNOWN_DATE_EN;
	}
	return formatDateString(firstMessage.date, isLocalized);
}

// Helper component for footer section
function CustomerHeaderFooter({
	countryName,
	isLocalized,
	joinedDateDisplay,
}: {
	countryName: string;
	isLocalized: boolean;
	joinedDateDisplay: string;
}) {
	return (
		<div className="mt-2 flex items-center justify-between border-t pt-2 text-muted-foreground text-xs">
			<div className="flex min-w-0 items-center gap-1">
				<MapPin className="h-3 w-3" />
				<span className="truncate">{countryName}</span>
			</div>
			<div className="flex items-center gap-1">
				<CalendarDays className="h-3 w-3" />
				<span>
					{isLocalized ? "انضم" : "Joined"} {joinedDateDisplay}
				</span>
			</div>
		</div>
	);
}

// Helper component for reservations section
function ReservationsAccordion({
	accordionValue,
	customerReservations,
	isHoverCard,
	isLocalized,
	setAccordionValue,
}: {
	accordionValue: string;
	customerReservations: Reservation[];
	isHoverCard: boolean;
	isLocalized: boolean;
	setAccordionValue: (value: string) => void;
}) {
	if (customerReservations.length === 0) {
		return null;
	}

	return (
		<Accordion
			className="mt-2 w-full"
			collapsible
			onValueChange={setAccordionValue}
			type="single"
			value={accordionValue}
		>
			<AccordionItem className="border-b-0" value="reservations">
				<AccordionTrigger
					className={`${isHoverCard ? "px-0.5 py-0.5" : "px-1 py-1"} font-medium text-xs hover:no-underline`}
				>
					<div className="flex items-center gap-1">
						<Calendar className={isHoverCard ? "h-2.5 w-2.5" : "h-3 w-3"} />
						<span>{isLocalized ? "الحجوزات" : "Reservations"}</span>
						<Badge
							className="ml-auto h-4 px-1 text-[0.625rem]"
							variant="outline"
						>
							{customerReservations.length}
						</Badge>
					</div>
				</AccordionTrigger>
				<AccordionContent className={isHoverCard ? "pb-0.5" : "pb-1"}>
					<div className={isHoverCard ? "px-0.5" : "px-1"}>
						<CustomerReservationsGrid
							isLocalized={isLocalized}
							reservations={customerReservations}
						/>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

export const CustomerStatsCard = React.memo(function CustomerStats({
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

	const formattedPhone = formatPhoneForInput(selectedConversationId);

	// Country of phone number (for location display)
	const countryCode = React.useMemo(
		() => getCountryFromPhone(formattedPhone),
		[formattedPhone]
	);
	const countryName = React.useMemo(
		() => getCountryNameDisplay(countryCode, isLocalized),
		[countryCode, isLocalized]
	);

	// Calculate conversation stats
	const messageCount = conversation.length;
	const lastMessage = conversation.length > 0 ? conversation.at(-1) : null;

	// Get first message date for "customer since"
	const firstMessage = React.useMemo(
		() => calculateFirstMessage(conversation),
		[conversation]
	);

	const joinedDateDisplay = React.useMemo(
		() => getJoinedDateDisplayText(firstMessage, isLocalized),
		[firstMessage, isLocalized]
	);

	return (
		<div className={isHoverCard ? "" : "mb-2"}>
			<MagicCard
				className={`bg-background/90 ${isHoverCard ? "border-0 shadow-none" : ""}`}
				gradientColor="hsl(var(--muted-foreground) / 0.1)"
				gradientFrom="hsl(var(--primary))"
				gradientOpacity={0.6}
				gradientSize={200}
				gradientTo="hsl(var(--accent))"
			>
				<Card className="border-0 bg-transparent shadow-none">
					<CardContent className={isHoverCard ? "p-3" : "p-2"}>
						{/* Fixed Customer Info Section */}
						<div className={`${isHoverCard ? "space-y-1" : "space-y-2"}`}>
							{/* Header with Avatar on left, Name and Phone in center */}
							<CustomerHeader
								customerName={customerName}
								formattedPhone={formattedPhone}
								isHoverCard={isHoverCard}
								isLocalized={isLocalized}
								selectedConversationId={selectedConversationId}
							/>

							{/* Stats Section */}
							<CustomerStatsSection
								customerReservations={customerReservations}
								firstMessage={firstMessage}
								isHoverCard={isHoverCard}
								isLocalized={isLocalized}
								lastMessage={lastMessage ?? null}
								messageCount={messageCount}
							/>

							{/* Footer: Location (country) on left, Joined on right */}
							{isHoverCard && (
								<CustomerHeaderFooter
									countryName={countryName}
									isLocalized={isLocalized}
									joinedDateDisplay={joinedDateDisplay}
								/>
							)}
						</div>

						{/* Reservations Accordion */}
						<ReservationsAccordion
							accordionValue={accordionValue}
							customerReservations={customerReservations}
							isHoverCard={isHoverCard}
							isLocalized={isLocalized}
							setAccordionValue={setAccordionValue}
						/>
					</CardContent>
				</Card>
			</MagicCard>
		</div>
	);
});
