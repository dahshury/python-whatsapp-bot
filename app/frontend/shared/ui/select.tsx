"use client";

import {
	Content as SelectContent,
	Group as SelectGroup,
	Icon as SelectIcon,
	Item as SelectItem,
	ItemIndicator as SelectItemIndicator,
	ItemText as SelectItemText,
	Label as SelectLabel,
	Portal as SelectPortal,
	Root as SelectRoot,
	ScrollDownButton as SelectScrollDownButton,
	ScrollUpButton as SelectScrollUpButton,
	Separator as SelectSeparator,
	Trigger as SelectTrigger,
	Value as SelectValue,
	Viewport as SelectViewport,
} from "@radix-ui/react-select";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type * as React from "react";
import { useUiCompositeOverride } from "@/shared/libs/ui-registry";

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string
): React.ComponentType<TProps> | undefined {
	return ov[key] as unknown as React.ComponentType<TProps> | undefined;
}

function Select(props: React.ComponentProps<typeof SelectRoot>) {
	const OV = useUiCompositeOverride("Select");
	const Override = getOverride<React.ComponentProps<typeof SelectRoot>>(
		OV as unknown as Record<string, unknown>,
		"Select"
	);
	if (Override) {
		return <Override {...props} />;
	}
	return <SelectRoot {...props} />;
}

const SelectGroupComponent = SelectGroup;

const SelectValueComponent = SelectValue;

const SelectTriggerFunction = ({
	className,
	children,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectTrigger> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectTrigger> | null>;
}) => {
	const OV = useUiCompositeOverride("Select");
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof SelectTrigger>
	>(OV as unknown as Record<string, unknown>, "SelectTrigger");
	if (Override) {
		return (
			<Override className={className} {...props}>
				{children}
			</Override>
		);
	}
	return (
		<SelectTrigger
			className={cn(
				"flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1",
				className
			)}
			ref={ref}
			{...props}
		>
			{children}
			<SelectIcon asChild>
				<ChevronDown className="h-4 w-4 opacity-50" />
			</SelectIcon>
		</SelectTrigger>
	);
};
SelectTriggerFunction.displayName = SelectTrigger.displayName;

const SelectScrollUpButtonComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectScrollUpButton> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectScrollUpButton> | null>;
}) => (
	<SelectScrollUpButton
		className={cn(
			"flex cursor-default items-center justify-center py-1",
			className
		)}
		ref={ref}
		{...props}
	>
		<ChevronUp className="h-4 w-4" />
	</SelectScrollUpButton>
);
SelectScrollUpButtonComponent.displayName = SelectScrollUpButton.displayName;

const SelectScrollDownButtonComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectScrollDownButton> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectScrollDownButton> | null>;
}) => (
	<SelectScrollDownButton
		className={cn(
			"flex cursor-default items-center justify-center py-1",
			className
		)}
		ref={ref}
		{...props}
	>
		<ChevronDown className="h-4 w-4" />
	</SelectScrollDownButton>
);
SelectScrollDownButtonComponent.displayName =
	SelectScrollDownButton.displayName;

const SelectContentComponent = ({
	className,
	children,
	position = "popper",
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectContent> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectContent> | null>;
}) => {
	const OV = useUiCompositeOverride("Select");
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof SelectContent>
	>(OV as unknown as Record<string, unknown>, "SelectContent");
	if (Override) {
		return (
			<SelectPortal>
				<Override className={className} {...props} />
			</SelectPortal>
		);
	}
	return (
		<SelectPortal>
			<SelectContent
				className={cn(
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative max-h-[--radix-select-content-available-height] min-w-[8rem] origin-[--radix-select-content-transform-origin] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
					position === "popper" &&
						"data-[side=left]:-translate-x-1 data-[side=top]:-translate-y-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1",
					className
				)}
				position={position}
				ref={ref}
				{...props}
				style={{
					zIndex: Z_INDEX.SELECT,
					...(props as { style?: React.CSSProperties }).style,
				}}
			>
				<SelectScrollUpButtonComponent />
				<SelectViewport
					className={cn(
						"p-1",
						position === "popper" &&
							"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
					)}
				>
					{children}
				</SelectViewport>
				<SelectScrollDownButtonComponent />
			</SelectContent>
		</SelectPortal>
	);
};
SelectContentComponent.displayName = SelectContent.displayName;

const SelectLabelComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectLabel> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectLabel> | null>;
}) => (
	<SelectLabel
		className={cn("px-2 py-1.5 font-semibold text-sm", className)}
		ref={ref}
		{...props}
	/>
);
SelectLabelComponent.displayName = SelectLabel.displayName;

const SelectItemComponent = ({
	className,
	children,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectItem> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectItem> | null>;
}) => (
	<SelectItem
		className={cn(
			"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className
		)}
		ref={ref}
		{...props}
	>
		<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			<SelectItemIndicator>
				<Check className="h-4 w-4" />
			</SelectItemIndicator>
		</span>
		<SelectItemText>{children}</SelectItemText>
	</SelectItem>
);
SelectItemComponent.displayName = SelectItem.displayName;

const SelectSeparatorComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectSeparator> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectSeparator> | null>;
}) => (
	<SelectSeparator
		className={cn("-mx-1 my-1 h-px bg-muted", className)}
		ref={ref}
		{...props}
	/>
);
SelectSeparatorComponent.displayName = SelectSeparator.displayName;

export {
	Select,
	SelectContentComponent as SelectContent,
	SelectGroupComponent as SelectGroup,
	SelectItemComponent as SelectItem,
	SelectLabelComponent as SelectLabel,
	SelectScrollDownButtonComponent as SelectScrollDownButton,
	SelectScrollUpButtonComponent as SelectScrollUpButton,
	SelectSeparatorComponent as SelectSeparator,
	SelectTriggerFunction as SelectTrigger,
	SelectValueComponent as SelectValue,
};
