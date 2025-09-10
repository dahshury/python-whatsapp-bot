"use client";

/**
 * @author: @dorian_baffier
 * @description: Toolbar
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
	Bell,
	CircleUserRound,
	Edit2,
	FileDown,
	Frame,
	Layers,
	Lock,
	type LucideIcon,
	MousePointer2,
	Move,
	Palette,
	Shapes,
	Share2,
	SlidersHorizontal,
} from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import * as React from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolbarItem {
	id: string;
	title: string;
	icon: LucideIcon;
	type?: never;
}

interface ToolbarProps {
	className?: string;
}

const buttonVariants: Variants = {
	initial: {
		gap: 0,
		paddingLeft: ".5rem",
		paddingRight: ".5rem",
	},
	animate: (isSelected: boolean) => ({
		gap: isSelected ? ".5rem" : 0,
		paddingLeft: isSelected ? "1rem" : ".5rem",
		paddingRight: isSelected ? "1rem" : ".5rem",
	}),
};

const spanVariants: Variants = {
	initial: { width: 0, opacity: 0 },
	animate: { width: "auto", opacity: 1 },
	exit: { width: 0, opacity: 0 },
};

const notificationVariants: Variants = {
	initial: { opacity: 0, y: 10 },
	animate: { opacity: 1, y: -10 },
	exit: { opacity: 0, y: -20 },
};

const lineVariants: Variants = {
	initial: { scaleX: 0, x: "-50%" },
	animate: {
		scaleX: 1,
		x: "0%",
		transition: { duration: 0.2, ease: "easeOut" },
	},
	exit: {
		scaleX: 0,
		x: "50%",
		transition: { duration: 0.2, ease: "easeIn" },
	},
};

const transition = { type: "spring" as const, bounce: 0, duration: 0.4 };

export function Toolbar({ className }: ToolbarProps) {
	const [selected, setSelected] = React.useState<string | null>("select");
	const [isToggled, setIsToggled] = React.useState(false);
	const [activeNotification, setActiveNotification] = React.useState<
		string | null
	>(null);
	const outsideClickRef = React.useRef(null);

	const toolbarItems: ToolbarItem[] = [
		{ id: "select", title: "Select", icon: MousePointer2 },
		{ id: "move", title: "Move", icon: Move },
		{ id: "shapes", title: "Shapes", icon: Shapes },
		{ id: "layers", title: "Layers", icon: Layers },
		{ id: "frame", title: "Frame", icon: Frame },
		{ id: "properties", title: "Properties", icon: SlidersHorizontal },
		{ id: "export", title: "Export", icon: FileDown },
		{ id: "share", title: "Share", icon: Share2 },
		{ id: "notifications", title: "Notifications", icon: Bell },
		{ id: "profile", title: "Profile", icon: CircleUserRound },
		{ id: "appearance", title: "Appearance", icon: Palette },
	];

	const handleItemClick = (itemId: string) => {
		setSelected(selected === itemId ? null : itemId);
		setActiveNotification(itemId);
		setTimeout(() => setActiveNotification(null), 1500);
	};

	return (
		<div className="space-y-2">
			<div
				ref={outsideClickRef}
				className={cn(
					"flex items-center gap-3 p-2 relative",
					"bg-background",
					"border rounded-xl",
					"transition-all duration-200",
					className,
				)}
			>
				<AnimatePresence>
					{activeNotification && (
						<motion.div
							variants={notificationVariants}
							initial="initial"
							animate="animate"
							exit="exit"
							transition={{ duration: 0.3 }}
							className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-50"
						>
							<div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs">
								{
									toolbarItems.find((item) => item.id === activeNotification)
										?.title
								}{" "}
								clicked!
							</div>
							<motion.div
								variants={lineVariants}
								initial="initial"
								animate="animate"
								exit="exit"
								className="absolute -bottom-1 left-1/2 w-full h-[2px] bg-primary origin-left"
							/>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="flex items-center gap-2">
					{toolbarItems.map((item) => (
						<motion.button
							key={item.id}
							variants={buttonVariants}
							initial={false}
							animate="animate"
							custom={selected === item.id}
							onClick={() => handleItemClick(item.id)}
							transition={transition}
							className={cn(
								"relative flex items-center rounded-none px-3 py-2",
								"text-sm font-medium transition-colors duration-300",
								selected === item.id
									? "bg-[#1F9CFE] text-white rounded-lg"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<item.icon
								size={16}
								className={cn(selected === item.id && "text-white")}
							/>
							<AnimatePresence initial={false}>
								{selected === item.id && (
									<motion.span
										variants={spanVariants}
										initial="initial"
										animate="animate"
										exit="exit"
										transition={transition}
										className="overflow-hidden"
									>
										{item.title}
									</motion.span>
								)}
							</AnimatePresence>
						</motion.button>
					))}

					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setIsToggled(!isToggled)}
						className={cn(
							"flex items-center gap-2 px-4 py-2",
							"rounded-xl border shadow-sm transition-all duration-200",
							"hover:shadow-md active:border-primary/50",
							isToggled
								? [
										"bg-[#1F9CFE] text-white",
										"border-[#1F9CFE]/30",
										"hover:bg-[#1F9CFE]/90",
										"hover:border-[#1F9CFE]/40",
									]
								: [
										"bg-background text-muted-foreground",
										"border-border/30",
										"hover:bg-muted",
										"hover:text-foreground",
										"hover:border-border/40",
									],
						)}
					>
						{isToggled ? (
							<Edit2 className="w-3.5 h-3.5" />
						) : (
							<Lock className="w-3.5 h-3.5" />
						)}
						<span className="text-sm font-medium">
							{isToggled ? "On" : "Off"}
						</span>
					</motion.button>
				</div>
			</div>
		</div>
	);
}

// Lightweight toolbar without animations for simple use-cases
export interface SimpleToolbarItem {
	id: string;
	title?: string;
	icon?: LucideIcon;
	tooltipTitle?: string;
	tooltipDescription?: string;
	tooltipIcon?: LucideIcon;
}

export function MiniToolbar({
	items,
	value,
	onChange,
	className,
	compact = true,
}: {
	items: SimpleToolbarItem[];
	value: string;
	onChange: (id: string) => void;
	className?: string;
	compact?: boolean;
}) {
	const containerHeight = compact ? "h-[1.6rem]" : "h-9";
	// Make buttons match container height exactly to avoid vertical mismatch
	const buttonHeight = "h-full";
	const iconSize = compact ? "h-[0.85rem] w-[0.85rem]" : "h-4 w-4";

	return (
		<div
			className={cn(
				"inline-flex items-center rounded-theme border divide-x bg-background",
				containerHeight,
				className,
			)}
		>
			{items.map((item) => {
				const isActive = value === item.id;
				const ButtonIcon = item.icon;
				const contentProvided =
					Boolean(item.tooltipTitle) || Boolean(item.tooltipDescription);
				const TooltipIcon = item.tooltipIcon || ButtonIcon;

				const buttonEl = (
					<button
						key={item.id}
						type="button"
						aria-pressed={isActive}
						onClick={() => onChange(item.id)}
						className={cn(
							"relative flex items-center gap-1 px-2 no-underline focus:outline-none focus:ring-0 transition-none",
							buttonHeight,
							isActive
								? "bg-accent text-accent-foreground rounded-theme"
								: "bg-transparent text-muted-foreground",
						)}
					>
						{ButtonIcon ? <ButtonIcon className={iconSize} /> : null}
						<AnimatePresence initial={false}>
							{isActive && item.title && (
								<motion.span
									variants={spanVariants}
									initial="initial"
									animate="animate"
									exit="exit"
									transition={{
										type: "tween",
										duration: 0.15,
										ease: "easeOut",
									}}
									className="overflow-hidden text-[0.72rem] leading-none"
								>
									{item.title}
								</motion.span>
							)}
						</AnimatePresence>
					</button>
				);

				return contentProvided ? (
					<Tooltip key={item.id}>
						<TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
						<TooltipContent className="py-3" sideOffset={6}>
							<div className="flex gap-3">
								{TooltipIcon ? (
									<TooltipIcon
										className="mt-0.5 shrink-0 opacity-60"
										size={16}
										aria-hidden="true"
									/>
								) : null}
								<div className="space-y-1">
									<p className="text-[13px] font-medium">
										{item.tooltipTitle || item.title || item.id}
									</p>
									{item.tooltipDescription ? (
										<p className="text-muted-foreground text-xs">
											{item.tooltipDescription}
										</p>
									) : null}
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
				) : (
					buttonEl
				);
			})}
		</div>
	);
}
