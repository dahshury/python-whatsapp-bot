"use client";

import {
	CheckboxItem,
	Content,
	Group,
	Item,
	ItemIndicator,
	Label,
	Portal,
	RadioGroup,
	RadioItem,
	Root,
	Separator,
	Sub,
	SubContent as SubContentPrimitive,
	SubTrigger as SubTriggerPrimitive,
	Trigger,
} from "@radix-ui/react-context-menu";
import { cn } from "@shared/libs/utils";
import { Check, ChevronRight, Circle } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef, RefObject } from "react";

const ContextMenu = Root;

const ContextMenuTrigger = Trigger;

const ContextMenuGroup = Group;

const ContextMenuPortal = Portal;

const ContextMenuSub = Sub;

const ContextMenuRadioGroup = RadioGroup;

const ContextMenuSubTrigger = ({
	className,
	inset,
	children,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof SubTriggerPrimitive> & {
	inset?: boolean;
} & {
	ref?: RefObject<ElementRef<typeof SubTriggerPrimitive> | null>;
}) => (
	<SubTriggerPrimitive
		className={cn(
			"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
			inset && "pl-8",
			className
		)}
		ref={ref}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto h-4 w-4" />
	</SubTriggerPrimitive>
);
ContextMenuSubTrigger.displayName = SubTriggerPrimitive.displayName;

const ContextMenuSubContent = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof SubContentPrimitive> & {
	ref?: RefObject<ElementRef<typeof SubContentPrimitive> | null>;
}) => (
	<SubContentPrimitive
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 min-w-[8rem] origin-[--radix-context-menu-content-transform-origin] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in",
			className
		)}
		ref={ref}
		{...props}
	/>
);
ContextMenuSubContent.displayName = SubContentPrimitive.displayName;

const ContextMenuContent = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Content> & {
	ref?: RefObject<ElementRef<typeof Content> | null>;
}) => (
	<Portal>
		<Content
			className={cn(
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-[--radix-context-menu-content-available-height] min-w-[8rem] origin-[--radix-context-menu-content-transform-origin] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
				className
			)}
			ref={ref}
			{...props}
		/>
	</Portal>
);
ContextMenuContent.displayName = Content.displayName;

const ContextMenuItem = ({
	className,
	inset,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Item> & {
	inset?: boolean;
} & {
	ref?: RefObject<ElementRef<typeof Item> | null>;
}) => (
	<Item
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			inset && "pl-8",
			className
		)}
		ref={ref}
		{...props}
	/>
);
ContextMenuItem.displayName = Item.displayName;

const ContextMenuCheckboxItem = ({
	className,
	children,
	checked,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof CheckboxItem> & {
	ref?: RefObject<ElementRef<typeof CheckboxItem> | null>;
}) => (
	<CheckboxItem
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className
		)}
		ref={ref}
		{...(checked !== undefined ? { checked } : {})}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<ItemIndicator>
				<Check className="h-4 w-4" />
			</ItemIndicator>
		</span>
		{children}
	</CheckboxItem>
);
ContextMenuCheckboxItem.displayName = CheckboxItem.displayName;

const ContextMenuRadioItem = ({
	className,
	children,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof RadioItem> & {
	ref?: RefObject<ElementRef<typeof RadioItem> | null>;
}) => (
	<RadioItem
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className
		)}
		ref={ref}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<ItemIndicator>
				<Circle className="h-4 w-4 fill-current" />
			</ItemIndicator>
		</span>
		{children}
	</RadioItem>
);
ContextMenuRadioItem.displayName = RadioItem.displayName;

const ContextMenuLabel = ({
	className,
	inset,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Label> & {
	inset?: boolean;
} & {
	ref?: RefObject<ElementRef<typeof Label> | null>;
}) => (
	<Label
		className={cn(
			"px-2 py-1.5 font-semibold text-foreground text-sm",
			inset && "pl-8",
			className
		)}
		ref={ref}
		{...props}
	/>
);
ContextMenuLabel.displayName = Label.displayName;

const ContextMenuSeparator = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Separator> & {
	ref?: RefObject<ElementRef<typeof Separator> | null>;
}) => (
	<Separator
		className={cn("-mx-1 my-1 h-px bg-border", className)}
		ref={ref}
		{...props}
	/>
);
ContextMenuSeparator.displayName = Separator.displayName;

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
};
