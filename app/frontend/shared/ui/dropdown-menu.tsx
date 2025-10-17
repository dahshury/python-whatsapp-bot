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
} from "@radix-ui/react-dropdown-menu";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import { Check, ChevronRight, Circle } from "lucide-react";
import type {
	ComponentPropsWithoutRef,
	CSSProperties,
	ElementRef,
	HTMLAttributes,
	RefObject,
} from "react";

const DropdownMenu = Root;

const DropdownMenuTrigger = Trigger;

const DropdownMenuGroup = Group;

const DropdownMenuPortal = Portal;

const DropdownMenuSub = Sub;

const DropdownMenuRadioGroup = RadioGroup;

const DropdownMenuSubTrigger = ({
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
			"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
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
DropdownMenuSubTrigger.displayName = SubTriggerPrimitive.displayName;

const DropdownMenuSubContent = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof SubContentPrimitive> & {
	ref?: RefObject<ElementRef<typeof SubContentPrimitive> | null>;
}) => (
	<SubContentPrimitive
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in",
			className
		)}
		ref={ref}
		style={{
			zIndex: Z_INDEX.ENHANCED_OVERLAY,
			...(props as { style?: CSSProperties }).style,
		}}
		{...props}
	/>
);
DropdownMenuSubContent.displayName = SubContentPrimitive.displayName;

const DropdownMenuContent = ({
	className,
	sideOffset = 4,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Content> & {
	ref?: RefObject<ElementRef<typeof Content> | null>;
}) => (
	<Portal>
		<Content
			className={cn(
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
				className
			)}
			onCloseAutoFocus={(e: Event) => e.preventDefault()}
			onEscapeKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
			ref={ref}
			sideOffset={sideOffset}
			style={{
				zIndex: Z_INDEX.ENHANCED_OVERLAY,
				...(props as { style?: CSSProperties }).style,
			}}
			{...props}
		/>
	</Portal>
);
DropdownMenuContent.displayName = Content.displayName;

const DropdownMenuItem = ({
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
			"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			inset && "pl-8",
			className
		)}
		ref={ref}
		{...props}
	/>
);
DropdownMenuItem.displayName = Item.displayName;

const DropdownMenuCheckboxItem = ({
	className,
	children,
	checked = false,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof CheckboxItem> & {
	ref?: RefObject<ElementRef<typeof CheckboxItem> | null>;
}) => (
	<CheckboxItem
		checked={checked}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className
		)}
		ref={ref}
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
DropdownMenuCheckboxItem.displayName = CheckboxItem.displayName;

const DropdownMenuRadioItem = ({
	className,
	children,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof RadioItem> & {
	ref?: RefObject<ElementRef<typeof RadioItem> | null>;
}) => (
	<RadioItem
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className
		)}
		ref={ref}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<ItemIndicator>
				<Circle className="h-2 w-2 fill-current" />
			</ItemIndicator>
		</span>
		{children}
	</RadioItem>
);
DropdownMenuRadioItem.displayName = RadioItem.displayName;

const DropdownMenuLabel = ({
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
			"px-2 py-1.5 font-semibold text-sm",
			inset && "pl-8",
			className
		)}
		ref={ref}
		{...props}
	/>
);
DropdownMenuLabel.displayName = Label.displayName;

const DropdownMenuSeparator = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Separator> & {
	ref?: RefObject<ElementRef<typeof Separator> | null>;
}) => (
	<Separator
		className={cn("-mx-1 my-1 h-px bg-muted", className)}
		ref={ref}
		{...props}
	/>
);
DropdownMenuSeparator.displayName = Separator.displayName;

const DropdownMenuShortcut = ({
	className,
	...props
}: HTMLAttributes<HTMLSpanElement>) => (
	<span
		className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
		{...props}
	/>
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
