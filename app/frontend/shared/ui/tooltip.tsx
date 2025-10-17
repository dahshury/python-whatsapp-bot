"use client";

import {
	Arrow as TooltipArrow,
	Content as TooltipContent,
	Portal as TooltipPortal,
	Provider as TooltipProvider,
	Root as TooltipRoot,
	Trigger as TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { Z_INDEX } from "@shared/libs/ui/z-index";

import { cn } from "@shared/libs/utils";
import type * as React from "react";

// Note: Tooltip uses Radix primitives to preserve context. Theme customization should be done via styles/classNames only.

function TooltipProviderComponent({
	delayDuration = 0,
	...props
}: React.ComponentProps<typeof TooltipProvider>) {
	return (
		<TooltipProvider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	);
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipRoot>) {
	// Always render Radix Tooltip root to preserve context
	return (
		<TooltipProviderComponent>
			<TooltipRoot data-slot="tooltip" {...props} />
		</TooltipProviderComponent>
	);
}

function TooltipTriggerComponent({
	...props
}: React.ComponentProps<typeof TooltipTrigger>) {
	// Keep Radix Trigger to maintain semantics
	return <TooltipTrigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContentComponent({
	className,
	sideOffset = 4,
	showArrow = false,
	children,
	...props
}: React.ComponentProps<typeof TooltipContent> & {
	showArrow?: boolean;
}) {
	return (
		<TooltipPortal>
			<TooltipContent
				className={cn(
					"fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-w-70 animate-in rounded-md border bg-popover px-3 py-1.5 text-popover-foreground text-sm data-[state=closed]:animate-out",
					className
				)}
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				{...props}
				style={{ zIndex: Z_INDEX.DIALOG_CONTENT + 1 }}
			>
				{children}
				{showArrow && (
					<TooltipArrow className="-my-px fill-popover drop-shadow-[0_1px_0_var(--border)]" />
				)}
			</TooltipContent>
		</TooltipPortal>
	);
}

export {
	Tooltip,
	TooltipContentComponent as TooltipContent,
	TooltipProviderComponent as TooltipProvider,
	TooltipTriggerComponent as TooltipTrigger,
};
