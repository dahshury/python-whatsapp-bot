"use client";

import { cn } from "@shared/libs/utils";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

export interface MenuBarItem {
	icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
	label: string;
	onClick?: () => void;
	disabled?: boolean;
}

interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
	items: MenuBarItem[];
	menuClassName?: string;
	buttonClassName?: string;
	iconWrapperClassName?: string;
}

const springConfig = {
	duration: 0.3,
	ease: "easeInOut" as const,
};

export function MenuBar({
	items,
	className,
	menuClassName,
	buttonClassName,
	iconWrapperClassName,
	...props
}: MenuBarProps) {
	const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const [tooltipPosition, setTooltipPosition] = React.useState({
		left: 0,
		width: 0,
	});
	const tooltipRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (activeIndex !== null && menuRef.current && tooltipRef.current) {
			const menuItem = menuRef.current.children[activeIndex] as HTMLElement;
			const menuRect = menuRef.current.getBoundingClientRect();
			const itemRect = menuItem.getBoundingClientRect();
			const tooltipRect = tooltipRef.current.getBoundingClientRect();

			const left = itemRect.left - menuRect.left + (itemRect.width - tooltipRect.width) / 2;

			setTooltipPosition({
				left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
				width: tooltipRect.width,
			});
		}
	}, [activeIndex]);

	return (
		<div className={cn("relative bottom-menu-scope", className)} {...props}>
			<AnimatePresence>
				{activeIndex !== null && (
					<motion.div
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						transition={springConfig}
						className="absolute left-0 right-0 -top-[31px] pointer-events-none z-50"
					>
						<motion.div
							ref={tooltipRef}
							className={cn(
								"h-7 px-3 rounded-lg inline-flex justify-center items-center overflow-hidden",
								"bg-background/95 backdrop-blur",
								"border border-border/50",
								"shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
								"dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
							)}
							initial={{ x: tooltipPosition.left }}
							animate={{ x: tooltipPosition.left }}
							transition={springConfig}
							style={{ width: "auto" }}
						>
							<p className="text-[13px] font-medium leading-tight whitespace-nowrap">{items[activeIndex]?.label}</p>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<div
				ref={menuRef}
				className={cn(
					"h-10 px-1.5 inline-flex justify-center items-center gap-[3px] overflow-hidden z-10",
					"rounded-full bg-background/95 backdrop-blur",
					"border border-border/50",
					"shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.1)]",
					"dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_-4px_rgba(0,0,0,0.2)]",
					menuClassName
				)}
			>
				{items.map((item, index) => (
					<button
						type="button"
						key={`${item.label}-${index}`}
						className={cn(
							"w-[1.6rem] h-[1.6rem] px-2 py-1 rounded-full flex justify-center items-center gap-2 hover:bg-muted/80 transition-colors",
							item.disabled ? "opacity-50 cursor-not-allowed" : "",
							buttonClassName
						)}
						onClick={item.disabled ? undefined : item.onClick}
						onMouseEnter={() => setActiveIndex(index)}
						onMouseLeave={() => setActiveIndex(null)}
						disabled={item.disabled}
					>
						<div className="flex justify-center items-center">
							<div
								className={cn(
									"w-[1.125rem] h-[1.125rem] flex justify-center items-center overflow-hidden",
									iconWrapperClassName
								)}
							>
								<item.icon className="w-full h-full" />
							</div>
						</div>
						<span className="sr-only">{item.label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
