"use client";

import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentHijriDate } from "@/lib/hijri-utils";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

interface HijriDateDisplayProps {
	className?: string;
	showIcon?: boolean;
}

export function HijriDateDisplay({
	className,
	showIcon = true,
}: HijriDateDisplayProps) {
	const { isRTL } = useLanguage();
	const [hijriDate, setHijriDate] = useState<string | null>(null);

	useEffect(() => {
		// Update immediately
		setHijriDate(getCurrentHijriDate());

		// Update at midnight
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const timeUntilMidnight = tomorrow.getTime() - now.getTime();

		const midnightTimer = setTimeout(() => {
			setHijriDate(getCurrentHijriDate());

			// Set up daily updates
			const dailyInterval = setInterval(
				() => {
					setHijriDate(getCurrentHijriDate());
				},
				24 * 60 * 60 * 1000,
			); // 24 hours

			return () => clearInterval(dailyInterval);
		}, timeUntilMidnight);

		return () => clearTimeout(midnightTimer);
	}, []);

	if (!hijriDate) return null;

	return (
		<div
			className={cn(
				"flex items-center gap-2 text-sm text-muted-foreground",
				className,
			)}
		>
			{showIcon && <Calendar className="h-4 w-4" />}
			<span className={isRTL ? "font-arabic" : ""}>{hijriDate}</span>
		</div>
	);
}
