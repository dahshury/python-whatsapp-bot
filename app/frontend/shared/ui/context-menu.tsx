"use client";

import {
  CheckboxItem as ContextMenuCheckboxItemPrimitive,
  Content as ContextMenuContentPrimitive,
  Group as ContextMenuGroupPrimitive,
  ItemIndicator as ContextMenuItemIndicatorPrimitive,
  Item as ContextMenuItemPrimitive,
  Label as ContextMenuLabelPrimitive,
  Portal as ContextMenuPortalPrimitive,
  RadioGroup as ContextMenuRadioGroupPrimitive,
  RadioItem as ContextMenuRadioItemPrimitive,
  Root as ContextMenuRootPrimitive,
  Separator as ContextMenuSeparatorPrimitive,
  SubContent as ContextMenuSubContentPrimitive,
  Sub as ContextMenuSubPrimitive,
  SubTrigger as ContextMenuSubTriggerPrimitive,
  Trigger as ContextMenuTriggerPrimitive,
} from "@radix-ui/react-context-menu";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import { Check, ChevronRight, Circle } from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  ElementRef,
  HTMLAttributes,
  RefObject,
} from "react";

const ContextMenu = ContextMenuRootPrimitive;

const ContextMenuTrigger = ContextMenuTriggerPrimitive;

const ContextMenuGroup = ContextMenuGroupPrimitive;

const ContextMenuPortal = ContextMenuPortalPrimitive;

const ContextMenuSub = ContextMenuSubPrimitive;

const ContextMenuRadioGroup = ContextMenuRadioGroupPrimitive;

const ContextMenuSubTrigger = ({
  className,
  inset,
  children,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuSubTriggerPrimitive> & {
  inset?: boolean;
} & {
  ref?: RefObject<ElementRef<typeof ContextMenuSubTriggerPrimitive> | null>;
}) => (
  <ContextMenuSubTriggerPrimitive
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
  </ContextMenuSubTriggerPrimitive>
);
ContextMenuSubTrigger.displayName = ContextMenuSubTriggerPrimitive.displayName;

const ContextMenuSubContent = ({
  className,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuSubContentPrimitive> & {
  ref?: RefObject<ElementRef<typeof ContextMenuSubContentPrimitive> | null>;
}) => (
  <ContextMenuSubContentPrimitive
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 min-w-[8rem] origin-[--radix-context-menu-content-transform-origin] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    ref={ref}
    style={{
      zIndex: Z_INDEX.CONTEXT_MENU,
      ...(props as { style?: React.CSSProperties }).style,
    }}
    {...props}
  />
);
ContextMenuSubContent.displayName = ContextMenuSubContentPrimitive.displayName;

const ContextMenuContent = ({
  className,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuContentPrimitive> & {
  ref?: RefObject<ElementRef<typeof ContextMenuContentPrimitive> | null>;
}) => (
  <ContextMenuPortalPrimitive>
    <ContextMenuContentPrimitive
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-[--radix-context-menu-content-available-height] min-w-[8rem] origin-[--radix-context-menu-content-transform-origin] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      ref={ref}
      style={{
        zIndex: Z_INDEX.CONTEXT_MENU,
        ...(props as { style?: React.CSSProperties }).style,
      }}
      {...props}
    />
  </ContextMenuPortalPrimitive>
);
ContextMenuContent.displayName = ContextMenuContentPrimitive.displayName;

const ContextMenuItem = ({
  className,
  inset,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuItemPrimitive> & {
  inset?: boolean;
} & {
  ref?: RefObject<ElementRef<typeof ContextMenuItemPrimitive> | null>;
}) => (
  <ContextMenuItemPrimitive
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    ref={ref}
    {...props}
  />
);
ContextMenuItem.displayName = ContextMenuItemPrimitive.displayName;

const ContextMenuCheckboxItem = ({
  className,
  children,
  checked,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuCheckboxItemPrimitive> & {
  ref?: RefObject<ElementRef<typeof ContextMenuCheckboxItemPrimitive> | null>;
}) => (
  <ContextMenuCheckboxItemPrimitive
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    ref={ref}
    {...(checked !== undefined ? { checked } : {})}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuItemIndicatorPrimitive>
        <Check className="h-4 w-4" />
      </ContextMenuItemIndicatorPrimitive>
    </span>
    {children}
  </ContextMenuCheckboxItemPrimitive>
);
ContextMenuCheckboxItem.displayName =
  ContextMenuCheckboxItemPrimitive.displayName;

const ContextMenuRadioItem = ({
  className,
  children,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuRadioItemPrimitive> & {
  ref?: RefObject<ElementRef<typeof ContextMenuRadioItemPrimitive> | null>;
}) => (
  <ContextMenuRadioItemPrimitive
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuItemIndicatorPrimitive>
        <Circle className="h-4 w-4 fill-current" />
      </ContextMenuItemIndicatorPrimitive>
    </span>
    {children}
  </ContextMenuRadioItemPrimitive>
);
ContextMenuRadioItem.displayName = ContextMenuRadioItemPrimitive.displayName;

const ContextMenuLabel = ({
  className,
  inset,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuLabelPrimitive> & {
  inset?: boolean;
} & {
  ref?: RefObject<ElementRef<typeof ContextMenuLabelPrimitive> | null>;
}) => (
  <ContextMenuLabelPrimitive
    className={cn(
      "px-2 py-1.5 font-semibold text-foreground text-sm",
      inset && "pl-8",
      className
    )}
    ref={ref}
    {...props}
  />
);
ContextMenuLabel.displayName = ContextMenuLabelPrimitive.displayName;

const ContextMenuSeparator = ({
  className,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuSeparatorPrimitive> & {
  ref?: RefObject<ElementRef<typeof ContextMenuSeparatorPrimitive> | null>;
}) => (
  <ContextMenuSeparatorPrimitive
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    ref={ref}
    {...props}
  />
);
ContextMenuSeparator.displayName = ContextMenuSeparatorPrimitive.displayName;

const ContextMenuShortcut = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-muted-foreground text-xs tracking-widest",
      className
    )}
    {...props}
  />
);
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
