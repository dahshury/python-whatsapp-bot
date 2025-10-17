"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	return (
		<AnimatePresence mode="wait">
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="flex min-h-0 flex-1 flex-col"
				exit={{ opacity: 0, y: -8 }}
				initial={{ opacity: 0, y: 8 }}
				key={pathname}
				transition={{ duration: 0.18, ease: "easeOut" }}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}
