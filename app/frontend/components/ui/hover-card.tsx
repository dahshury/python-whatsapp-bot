"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as React from "react";
import { useUiCompositeOverride } from "@/lib/ui-registry";
import { cn } from "@/lib/utils";

function HoverCard(
	props: React.ComponentProps<typeof HoverCardPrimitive.Root>,
) {
	const OV = useUiCompositeOverride("HoverCard");
	const Override = OV.HoverCard as
		| React.ComponentType<React.ComponentProps<typeof HoverCardPrimitive.Root>>
		| undefined;
	if (Override) return <Override {...props} />;
	return <HoverCardPrimitive.Root {...props} />;
}

function HoverCardTrigger(
	props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>,
) {
	const OV = useUiCompositeOverride("HoverCard");
	const Override = OV.HoverCardTrigger as
		| React.ComponentType<
				React.ComponentProps<typeof HoverCardPrimitive.Trigger>
		  >
		| undefined;
	if (Override) return <Override {...props} />;
	return <HoverCardPrimitive.Trigger {...props} />;
}

const HoverCardContent = React.forwardRef<
	React.ElementRef<typeof HoverCardPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
	const OV = useUiCompositeOverride("HoverCard");
	const Override = OV.HoverCardContent as
		| React.ComponentType<
				React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
		  >
		| undefined;
	if (Override) {
		return (
			<Override
				className={cn(
					"w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none",
					className,
				)}
				{...props}
			/>
		);
	}
	return (
		<HoverCardPrimitive.Content
			ref={ref}
			align={align}
			sideOffset={sideOffset}
			className={cn(
				"w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				className,
			)}
			{...props}
		/>
	);
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
