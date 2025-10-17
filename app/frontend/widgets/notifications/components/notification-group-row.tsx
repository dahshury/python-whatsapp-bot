"use client";

import { i18n } from "@shared/libs/i18n";
import type { GroupEntry } from "@shared/libs/notifications/types";
import { hashToHue } from "@shared/libs/notifications/utils";
import { Badge } from "@ui/badge";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Dot } from "@/shared/ui/dot";

// Color and animation constants
const HUE_OFFSET = 35;
const HUE_MODULO = 360;
const COLOR_SATURATION = "85%";
const LIGHT_START = "45%";
const LIGHT_END = "55%";
const ANIMATION_DURATION = 0.14;
const EASE_X1 = 0.45;
const EASE_Y1 = 0;
const EASE_X2 = 0.55;
const EASE_Y2 = 1;
const ANIMATION_EASE = [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] as const;
const MAX_BADGE_COUNT = 99;

type Props = {
	group: GroupEntry;
	onClick: (waId: string, date: string) => void;
	formatTimeAgo: (ts: number) => string;
	variants: Variants;
};

export function NotificationGroupRow({
	group,
	onClick,
	formatTimeAgo,
	variants,
}: Props) {
	const label = i18n.getMessage("new_message", false);
	const hue = hashToHue(group.waId);
	const start = `hsl(${hue} ${COLOR_SATURATION} ${LIGHT_START})`;
	const end = `hsl(${(hue + HUE_OFFSET) % HUE_MODULO} ${COLOR_SATURATION} ${LIGHT_END})`;
	const badgeStyle: React.CSSProperties = {
		backgroundImage: `linear-gradient(135deg, ${start}, ${end})`,
		color: "hsl(var(--primary-foreground))",
		borderColor: "transparent",
	};
	const countToShow =
		group.unreadCount > 0 ? group.unreadCount : group.totalCount;

	return (
		<motion.div
			className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
			key={`group:${group.waId}:${group.date}`}
			transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASE }}
			variants={variants}
		>
			<div className="relative flex items-start pe-12">
				<div className="flex-1 space-y-1">
					<button
						className="text-left text-foreground/80 after:absolute after:inset-0"
						onClick={() => onClick(group.waId, group.date)}
						type="button"
					>
						<span className="font-medium text-foreground">
							{label}: {group.customerName}
						</span>
					</button>
					<div className="text-muted-foreground text-xs">
						{formatTimeAgo(group.latest.timestamp)}
					</div>
				</div>
				<div className="-translate-y-1/2 absolute end-0 top-1/2 flex items-center gap-1">
					{group.unreadCount > 0 && (
						<>
							<span className="sr-only">
								{i18n.getMessage("unread", false)}
							</span>
							<Dot />
						</>
					)}
					<Badge
						className="min-w-6 rounded-full border px-2 py-0.5 font-semibold text-[0.625rem] shadow-sm"
						style={badgeStyle}
						variant="outline"
					>
						{countToShow > MAX_BADGE_COUNT ? "99+" : countToShow}
					</Badge>
				</div>
			</div>
		</motion.div>
	);
}
