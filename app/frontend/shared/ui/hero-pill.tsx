import { cn } from "@shared/libs/utils";
import type * as React from "react";

interface HeroPillProps extends React.HTMLAttributes<HTMLDivElement> {
	icon?: React.ReactNode;
	text: string;
	className?: string;
	/**
	 * @default true
	 */
	animate?: boolean;
}

export function HeroPill({
	icon,
	text,
	className,
	animate = true,
	...props
}: HeroPillProps) {
	return (
		<div
			className={cn("mb-1", animate && "animate-slide-up-fade", className)}
			{...props}
		>
			<p className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-background px-3 py-1 font-medium text-foreground text-xs shadow-black/[.12] shadow-sm transition-colors hover:bg-accent/80 dark:bg-accent">
				{icon && (
					<span className="mr-2 flex shrink-0 border-border border-r pr-2">
						{icon}
					</span>
				)}
				{text}
			</p>
		</div>
	);
}

export function StarIcon() {
	return (
		<svg
			className="transition-transform duration-300 group-hover:scale-110"
			fill="none"
			height={12}
			width={12}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Star icon</title>
			<path
				className="fill-zinc-500"
				d="M6.958.713a1 1 0 0 0-1.916 0l-.999 3.33-3.33 1a1 1 0 0 0 0 1.915l3.33.999 1 3.33a1 1 0 0 0 1.915 0l.999-3.33 3.33-1a1 1 0 0 0 0-1.915l-3.33-.999-1-3.33Z"
			/>
		</svg>
	);
}
