"use client";

import { cn } from "@shared/libs/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { useOnClickOutside } from "usehooks-ts";

interface Tab {
	title: string;
	icon: LucideIcon;
	type?: never;
}

interface Separator {
	type: "separator";
	title?: never;
	icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
	tabs: TabItem[];
	className?: string;
	activeColor?: string;
	onChange?: (index: number | null) => void;
	selectedIndex?: number | null;
}

const buttonVariants = {
	initial: {
		gap: 0,
		paddingLeft: ".25rem",
		paddingRight: ".25rem",
	},
	animate: (isSelected: boolean) => ({
		gap: isSelected ? ".25rem" : 0,
		paddingLeft: isSelected ? ".5rem" : ".25rem",
		paddingRight: isSelected ? ".5rem" : ".25rem",
	}),
};

const spanVariants = {
	initial: { width: 0, opacity: 0 },
	animate: { width: "auto", opacity: 1 },
	exit: { width: 0, opacity: 0 },
};

const transition = {
	delay: 0.1,
	type: "spring" as const,
	bounce: 0,
	duration: 0.6,
};

function isSeparator(item: TabItem): item is Separator {
	return (item as Separator).type === "separator";
}

function isTab(item: TabItem): item is Tab {
	return !isSeparator(item);
}

const SeparatorBar: React.FC = () => <div className="mx-0.5 h-3 w-px bg-border" aria-hidden="true" />;

export function ExpandableTabs({
	tabs,
	className,
	activeColor = "text-primary",
	onChange,
	selectedIndex,
}: ExpandableTabsProps) {
	const [hovered, setHovered] = React.useState<number | null>(null);
	const outsideClickRef = React.useRef<HTMLDivElement | null>(null);

	useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => {
		setHovered(null);
	});

	const handleSelect = (index: number) => {
		onChange?.(index);
	};

	const handleHover = (index: number) => {
		setHovered(index);
	};

	const handleLeave = () => {
		setHovered(null);
	};

	return (
		<div
			ref={outsideClickRef}
			className={cn("flex flex-wrap items-center gap-1 rounded-2xl border bg-background p-0.5 shadow-sm", className)}
		>
			{tabs.map((tab, index) => {
				if (isSeparator(tab)) {
					const prevTab = tabs[index - 1];
					const nextTab = tabs[index + 1];
					const prev = index > 0 && prevTab && isTab(prevTab) ? (prevTab as Tab) : undefined;
					const next = index < tabs.length - 1 && nextTab && isTab(nextTab) ? (nextTab as Tab) : undefined;
					const sepKey = `sep-${prev?.title ?? "start"}-${next?.title ?? "end"}`;
					return <SeparatorBar key={sepKey} />;
				}

				const t = tab as Tab;
				const Icon = t.icon;
				return (
					<motion.button
						key={t.title}
						variants={buttonVariants}
						initial={false}
						animate="animate"
						custom={hovered === index || selectedIndex === index}
						onClick={() => handleSelect(index)}
						onMouseEnter={() => handleHover(index)}
						onMouseLeave={handleLeave}
						transition={transition}
						className={cn(
							"relative flex items-center rounded-xl px-2 py-1 text-xs leading-none font-medium transition-colors duration-300",
							selectedIndex === index
								? cn("bg-muted", activeColor)
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						)}
					>
						<Icon size={10} />
						<AnimatePresence initial={false}>
							{(hovered === index || selectedIndex === index) && (
								<motion.span
									variants={spanVariants}
									initial="initial"
									animate="animate"
									exit="exit"
									transition={transition}
									className="overflow-hidden"
								>
									{t.title}
								</motion.span>
							)}
						</AnimatePresence>
					</motion.button>
				);
			})}
		</div>
	);
}
