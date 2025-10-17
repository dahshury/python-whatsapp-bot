"use client";

import {
	Content as HoverCardContentPrimitive,
	Portal as HoverCardPortal,
	Root as HoverCardRoot,
	Trigger as HoverCardTriggerPrimitive,
} from "@radix-ui/react-hover-card";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import type { ComponentProps, ComponentType, ElementRef, Ref } from "react";
import { useUiCompositeOverride } from "@/shared/libs/ui-registry";

function HoverCard(props: ComponentProps<typeof HoverCardRoot>) {
	const OV = useUiCompositeOverride("HoverCard");
	const Override = OV.HoverCard as
		| ComponentType<ComponentProps<typeof HoverCardRoot>>
		| undefined;
	if (Override) {
		return <Override {...props} />;
	}
	return <HoverCardRoot {...props} />;
}

function HoverCardTrigger(
	props: ComponentProps<typeof HoverCardTriggerPrimitive>
) {
	const OV = useUiCompositeOverride("HoverCard");
	const Override = OV.HoverCardTrigger as
		| ComponentType<ComponentProps<typeof HoverCardTriggerPrimitive>>
		| undefined;
	if (Override) {
		return <Override {...props} />;
	}
	return <HoverCardTriggerPrimitive {...props} />;
}

const HoverCardContent = ({
	className,
	align = "center",
	sideOffset = 4,
	ref,
	...props
}: ComponentProps<typeof HoverCardContentPrimitive> & {
	ref?: Ref<ElementRef<typeof HoverCardContentPrimitive> | null>;
}) => {
	const OV = useUiCompositeOverride("HoverCard");
	const Override = OV.HoverCardContent as
		| ComponentType<ComponentProps<typeof HoverCardContentPrimitive>>
		| undefined;
	if (Override) {
		return (
			<Override
				className={cn(
					"w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none",
					className
				)}
				{...props}
			/>
		);
	}
	return (
		<HoverCardPortal>
			<HoverCardContentPrimitive
				align={align}
				className={cn(
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
					className
				)}
				ref={ref}
				sideOffset={sideOffset}
				style={{
					zIndex: Z_INDEX.DIALOG_CONTENT + 1,
					...((props as { style?: Record<string, unknown> }).style as Record<
						string,
						unknown
					>),
				}}
				{...props}
			/>
		</HoverCardPortal>
	);
};
HoverCardContent.displayName = HoverCardContentPrimitive.displayName;

export { HoverCard, HoverCardContent, HoverCardTrigger };
