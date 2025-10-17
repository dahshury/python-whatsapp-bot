// Shared Framer Motion variants used across notifications UI

export const listVariants = {
	hidden: {
		transition: { staggerChildren: 0.0 },
	},
	shown: {
		transition: { staggerChildren: 0.015 },
	},
} as const;

export const itemVariants = {
	hidden: { opacity: 0, filter: "blur(6px)" },
	shown: { opacity: 1, filter: "blur(0px)" },
} as const;
