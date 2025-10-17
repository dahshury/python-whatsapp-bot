"use client";

import { i18n } from "@shared/libs/i18n";
import type { NotificationItem } from "@shared/libs/notifications/types";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Dot } from "@/shared/ui/dot";

// Animation constants
const ANIMATION_DURATION = 0.14;
const EASE_X1 = 0.45;
const EASE_Y1 = 0;
const EASE_X2 = 0.55;
const EASE_Y2 = 1;
const ANIMATION_EASE = [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] as const;

type Props = {
	notification: NotificationItem;
	onClick: (n: NotificationItem) => void;
	formatTimeAgo: (ts: number) => string;
	variants: Variants;
};

export function NotificationItemRow({
	notification,
	onClick,
	formatTimeAgo,
	variants,
}: Props) {
	return (
		<motion.div
			className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
			key={notification.id}
			transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASE }}
			variants={variants}
		>
			<div className="relative flex items-start pe-3">
				<div className="flex-1 space-y-1">
					<button
						className="text-left text-foreground/80 after:absolute after:inset-0"
						onClick={() => onClick(notification)}
						type="button"
					>
						<span className="font-medium text-foreground">
							{notification.text}
						</span>
					</button>
					<div className="text-muted-foreground text-xs">
						{formatTimeAgo(notification.timestamp)}
					</div>
				</div>
				{notification.unread && (
					<div className="absolute end-0 self-center">
						<span className="sr-only">{i18n.getMessage("unread", false)}</span>
						<Dot />
					</div>
				)}
			</div>
		</motion.div>
	);
}
