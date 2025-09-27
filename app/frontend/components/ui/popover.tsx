"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "@/lib/utils";

// Note: Popover should always use Radix primitives to preserve context for Portal.
// Theme overrides should customize styles via classNames rather than replacing Root/Trigger/Content components.

function Popover({
	modal = true,
	...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root modal={modal} {...props} />;
}
Popover.displayName = "Popover";

function PopoverTrigger(
	props: React.ComponentProps<typeof PopoverPrimitive.Trigger>,
) {
	return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverAnchor(
	props: React.ComponentProps<typeof PopoverPrimitive.Anchor>,
) {
	return <PopoverPrimitive.Anchor {...props} />;
}

const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
		className?: string | undefined;
		portal?: boolean | undefined;
	}
>(
	(
		{
			className,
			align = "center" as const,
			sideOffset = 4,
			portal = true,
			...props
		},
		ref: React.Ref<HTMLDivElement>,
	) => {
		const content = (
			<PopoverPrimitive.Content
				ref={ref}
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"z-[10000] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className,
				)}
				{...props}
			/>
		);

		if (portal) {
			return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
		}

		return content;
	},
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
