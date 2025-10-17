"use client";

import { cn } from "@shared/libs/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { type FC, type RefObject, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";

type Tab = {
	title: string;
	icon: LucideIcon;
	type?: never;
};

type Separator = {
	type: "separator";
	title?: never;
	icon?: never;
};

type TabItem = Tab | Separator;

type ExpandableTabsProps = {
	tabs: TabItem[];
	className?: string;
	activeColor?: string;
	onChange?: (index: number | null) => void;
	selectedIndex?: number | null;
};

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

type TabRenderContext = {
	selectedIndex: number | null | undefined;
	hovered: number | null;
	activeColor: string;
	onSelect: (idx: number) => void;
	onHover: (idx: number) => void;
	onLeave: () => void;
};

const renderTabButton = (
	tab: Tab,
	tabIndex: number,
	context: TabRenderContext
) => (
	<motion.button
		animate="animate"
		className={cn(
			"relative flex items-center rounded-xl px-2 py-1 font-medium text-xs leading-none transition-colors duration-300",
			context.selectedIndex === tabIndex
				? cn("bg-muted", context.activeColor)
				: "text-muted-foreground hover:bg-muted hover:text-foreground"
		)}
		custom={context.hovered === tabIndex || context.selectedIndex === tabIndex}
		initial={false}
		key={tab.title}
		onClick={() => context.onSelect(tabIndex)}
		onMouseEnter={() => context.onHover(tabIndex)}
		onMouseLeave={context.onLeave}
		transition={transition}
		variants={buttonVariants}
	>
		<tab.icon size={10} />
		<AnimatePresence initial={false}>
			{(context.hovered === tabIndex || context.selectedIndex === tabIndex) && (
				<motion.span
					animate="animate"
					className="overflow-hidden"
					exit="exit"
					initial="initial"
					transition={transition}
					variants={spanVariants}
				>
					{tab.title}
				</motion.span>
			)}
		</AnimatePresence>
	</motion.button>
);

const renderSeparator = (tabIndex: number, tabs: TabItem[]) => {
	const prevTab = tabs[tabIndex - 1];
	const nextTab = tabs[tabIndex + 1];
	const prev =
		tabIndex > 0 && prevTab && isTab(prevTab) ? (prevTab as Tab) : undefined;
	const next =
		tabIndex < tabs.length - 1 && nextTab && isTab(nextTab)
			? (nextTab as Tab)
			: undefined;
	const sepKey = `sep-${prev?.title ?? "start"}-${next?.title ?? "end"}`;
	return <SeparatorBar key={sepKey} />;
};

const renderTabItem = (
	tab: TabItem,
	tabIndex: number,
	context: TabRenderContext,
	tabs: TabItem[]
) => {
	if (isSeparator(tab)) {
		return renderSeparator(tabIndex, tabs);
	}

	return renderTabButton(tab as Tab, tabIndex, context);
};

const SeparatorBar: FC = () => (
	<div aria-hidden="true" className="mx-0.5 h-3 w-px bg-border" />
);

export function ExpandableTabs({
	tabs,
	className,
	activeColor = "text-primary",
	onChange,
	selectedIndex,
}: ExpandableTabsProps) {
	const [hovered, setHovered] = useState<number | null>(null);
	const outsideClickRef = useRef<HTMLDivElement | null>(null);

	useOnClickOutside(outsideClickRef as RefObject<HTMLElement>, () => {
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

	const renderContext: TabRenderContext = {
		selectedIndex,
		hovered,
		activeColor,
		onSelect: handleSelect,
		onHover: handleHover,
		onLeave: handleLeave,
	};

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-1 rounded-2xl border bg-background p-0.5 shadow-sm",
				className
			)}
			ref={outsideClickRef}
		>
			{tabs.map((tab, index) => renderTabItem(tab, index, renderContext, tabs))}
		</div>
	);
}
