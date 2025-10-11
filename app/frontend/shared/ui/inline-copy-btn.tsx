"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { type HTMLAttributes, useState } from "react";

interface InlineCopyBtnProps extends HTMLAttributes<HTMLButtonElement> {
	text: string;
	className?: string;
	isLocalized?: boolean;
}

export function InlineCopyBtn({ text, className, isLocalized = false, ...props }: InlineCopyBtnProps) {
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
			className={cn("relative h-4 w-4 p-0 hover:bg-accent/50 transition-colors duration-200", className)}
			onClick={copyToClipboard}
			aria-label={copied ? i18n.getMessage("copied", isLocalized) : i18n.getMessage("copy", isLocalized)}
			{...props}
		>
			<span className="sr-only">
				{copied ? i18n.getMessage("copied", isLocalized) : i18n.getMessage("copy", isLocalized)}
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
