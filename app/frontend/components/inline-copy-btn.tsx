"use client";

import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { type HTMLAttributes, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineCopyBtnProps extends HTMLAttributes<HTMLButtonElement> {
	text: string;
	className?: string;
	isRTL?: boolean;
}

export function InlineCopyBtn({
	text,
	className,
	isRTL = false,
	...props
}: InlineCopyBtnProps) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering parent button (collapsible trigger)
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			className={cn(
				"relative h-4 w-4 p-0 hover:bg-accent/50 transition-colors duration-200",
				className,
			)}
			onClick={copyToClipboard}
			aria-label={
				copied ? (isRTL ? "تم النسخ" : "Copied") : isRTL ? "نسخ" : "Copy"
			}
			{...props}
		>
			<span className="sr-only">
				{copied ? (isRTL ? "تم النسخ" : "Copied") : isRTL ? "نسخ" : "Copy"}
			</span>
			<motion.div
				initial={false}
				animate={{ scale: copied ? 0 : 1 }}
				transition={{ duration: 0.2 }}
				className="flex items-center justify-center"
			>
				<Copy className="h-3 w-3" />
			</motion.div>
			<motion.div
				className="absolute inset-0 flex items-center justify-center"
				initial={false}
				animate={{ scale: copied ? 1 : 0 }}
				transition={{ duration: 0.2 }}
			>
				<Check className="h-3 w-3 text-green-500" />
			</motion.div>
		</Button>
	);
}
