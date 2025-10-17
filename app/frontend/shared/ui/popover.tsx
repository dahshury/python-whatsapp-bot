"use client";

import {
	Anchor as PopoverAnchor,
	Content as PopoverContentPrimitive,
	Portal as PopoverPortal,
	Root as PopoverRoot,
	Trigger as PopoverTriggerPrimitive,
} from "@radix-ui/react-popover";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import type { ComponentPropsWithoutRef, ElementRef, Ref } from "react";

// Note: Popover should always use Radix primitives to preserve context for Portal.
// Theme overrides should customize styles via classNames rather than replacing Root/Trigger/Content components.

function Popover({
	modal = true,
	...props
}: ComponentPropsWithoutRef<typeof PopoverRoot>) {
	return <PopoverRoot modal={modal} {...props} />;
}
Popover.displayName = "Popover";

function PopoverTrigger(
	props: ComponentPropsWithoutRef<typeof PopoverTriggerPrimitive>
) {
	return <PopoverTriggerPrimitive {...props} />;
}

function PopoverAnchorComponent(
	props: ComponentPropsWithoutRef<typeof PopoverAnchor>
) {
	return <PopoverAnchor {...props} />;
}

const PopoverContent = ({
	className,
	align = "center" as const,
	sideOffset = 4,
	portal = true,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof PopoverContentPrimitive> & {
	className?: string | undefined;
	portal?: boolean | undefined;
} & {
	ref?: Ref<ElementRef<typeof PopoverContentPrimitive> | null>;
}) => {
	const content = (
		<PopoverContentPrimitive
			align={align}
			ref={ref}
			sideOffset={sideOffset}
			{...props}
			className={cn(
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
				className
			)}
			style={{
				zIndex: Z_INDEX.POPOVER,
				...((props as { style?: Record<string, unknown> }).style as Record<
					string,
					unknown
				>),
			}}
		/>
	);

	if (portal) {
		return <PopoverPortal>{content}</PopoverPortal>;
	}

	return content;
};
PopoverContent.displayName = PopoverContentPrimitive.displayName;

export {
	Popover,
	PopoverAnchorComponent as PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
};
