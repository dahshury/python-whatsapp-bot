"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Z_INDEX } from "@shared/libs/ui/z-index";

import { cn } from "@shared/libs/utils";
import * as React from "react";

// Note: Popover should always use Radix primitives to preserve context for Portal.
// Theme overrides should customize styles via classNames rather than replacing Root/Trigger/Content components.

function Popover({ modal = true, ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root modal={modal} {...props} />;
}
Popover.displayName = "Popover";

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverAnchor(props: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
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
		{ className, align = "center" as const, sideOffset = 4, portal = true, ...props },
		ref: React.Ref<HTMLDivElement>
	) => {
		const content = (
			<PopoverPrimitive.Content
				ref={ref}
				align={align}
				sideOffset={sideOffset}
				{...props}
				className={cn(
					"w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className
				)}
				style={{
					zIndex: Z_INDEX.POPOVER,
					...(props as { style?: React.CSSProperties }).style,
				}}
			/>
		);

		if (portal) {
			return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
		}

		return content;
	}
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
