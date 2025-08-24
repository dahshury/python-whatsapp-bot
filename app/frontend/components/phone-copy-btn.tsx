"use client";

import { Check, Copy, Phone } from "lucide-react";
import { motion } from "motion/react";
import { type HTMLAttributes, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhoneCopyBtnProps extends HTMLAttributes<HTMLDivElement> {
	phoneNumber: string;
	className?: string;
	size?: "sm" | "md" | "lg";
	showLabel?: boolean;
	isRTL?: boolean;
}

export function PhoneCopyBtn({
	phoneNumber,
	className,
	size = "sm",
	showLabel = true,
	isRTL = false,
	...props
}: PhoneCopyBtnProps) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = () => {
		navigator.clipboard.writeText(phoneNumber);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const formatPhoneNumber = (phone: string) => {
		// Remove any non-digit characters except +
		const cleaned = phone.replace(/[^\d+]/g, "");

		// If it starts with +, format as international
		if (cleaned.startsWith("+")) {
			return cleaned;
		}

		// If it's a long number without +, assume it's international
		if (cleaned.length > 10) {
			return `+${cleaned}`;
		}

		return cleaned;
	};

	const formattedPhone = formatPhoneNumber(phoneNumber);

	const sizeClasses = {
		sm: {
			container: "text-xs",
			icon: "h-3 w-3",
			button: "h-6 w-6",
			gap: "gap-1",
		},
		md: {
			container: "text-sm",
			icon: "h-4 w-4",
			button: "h-8 w-8",
			gap: "gap-2",
		},
		lg: {
			container: "text-base",
			icon: "h-5 w-5",
			button: "h-10 w-10",
			gap: "gap-3",
		},
	};

	const currentSize = sizeClasses[size];

	return (
		<div
			className={cn(
				"flex items-center justify-between py-1",
				currentSize.container,
				className,
			)}
			{...props}
		>
			{showLabel && (
				<div className={cn("flex items-center", currentSize.gap)}>
					<Phone className={currentSize.icon} />
					<span>{isRTL ? "رقم الهاتف" : "Phone"}</span>
				</div>
			)}

			<div className={cn("flex items-center", currentSize.gap)}>
				<span className="text-muted-foreground font-mono text-xs">
					{formattedPhone}
				</span>
				<Button
					variant="ghost"
					size="icon"
					className={cn("relative rounded-md", currentSize.button)}
					onClick={copyToClipboard}
					aria-label={
						copied
							? isRTL
								? "تم النسخ"
								: "Copied"
							: isRTL
								? "نسخ رقم الهاتف"
								: "Copy phone number"
					}
				>
					<span className="sr-only">
						{copied ? (isRTL ? "تم النسخ" : "Copied") : isRTL ? "نسخ" : "Copy"}
					</span>
					<motion.div
						initial={false}
						animate={{ scale: copied ? 0 : 1 }}
						transition={{ duration: 0.2 }}
					>
						<Copy className={currentSize.icon} />
					</motion.div>
					<motion.div
						className="absolute inset-0 m-auto"
						initial={false}
						animate={{ scale: copied ? 1 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<Check className={cn(currentSize.icon, "text-green-500")} />
					</motion.div>
				</Button>
			</div>
		</div>
	);
}
