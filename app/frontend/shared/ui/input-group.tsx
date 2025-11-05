"use client";

import { Slot } from "@radix-ui/react-slot";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import type * as React from "react";

type AddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

function InputGroup({ className, ...props }: InputGroupProps) {
  return (
    <div
      className={cn(
        "group/input flex flex-col overflow-hidden rounded-md border border-input bg-background",
        "transition-shadow focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        className
      )}
      {...props}
    />
  );
}

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: AddonAlign;
}

function InputGroupAddon({
  align = "inline-start",
  className,
  ...props
}: InputGroupAddonProps) {
  const base = "flex items-center gap-1.5 p-1 bg-background w-full";
  const getAlignCls = () => {
    if (align === "inline-end") {
      return "border-l justify-end";
    }
    if (align === "inline-start") {
      return "border-r justify-start";
    }
    if (align === "block-end") {
      return "border-t";
    }
    return "border-b";
  };
  const alignCls = getAlignCls();
  return <div className={cn(base, alignCls, className)} {...props} />;
}

interface InputGroupTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}
function InputGroupText({ asChild, className, ...props }: InputGroupTextProps) {
  const Comp: React.ElementType = asChild ? Slot : "span";
  return (
    <Comp
      className={cn("px-2 text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

type InputGroupButtonSize = "xs" | "icon-xs" | "sm" | "icon-sm";

interface InputGroupButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "size"> {
  size?: InputGroupButtonSize;
}

function InputGroupButton({
  className,
  size = "xs",
  variant = "ghost",
  ...props
}: InputGroupButtonProps) {
  const getSizeCls = () => {
    if (size === "xs") {
      return "h-8 px-2 text-xs";
    }
    if (size === "icon-xs") {
      return "h-8 w-8 p-0";
    }
    if (size === "icon-sm") {
      return "h-9 w-9 p-0";
    }
    return "h-9 px-3"; // sm
  };
  const sizeCls = getSizeCls();

  return (
    <Button
      className={cn("rounded-none", sizeCls, className)}
      variant={variant}
      {...props}
    />
  );
}

interface InputGroupInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

function InputGroupInput({ className, ...props }: InputGroupInputProps) {
  return (
    <input
      className={cn(
        "flex h-9 w-full bg-transparent px-3 py-1 text-base outline-none md:text-sm",
        className
      )}
      data-slot="input-group-control"
      {...props}
    />
  );
}

interface InputGroupTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function InputGroupTextarea({ className, ...props }: InputGroupTextareaProps) {
  return (
    <textarea
      className={cn(
        "field-sizing-content flex min-h-16 w-full resize-none bg-transparent px-3 py-2 text-base outline-none md:text-sm",
        className
      )}
      data-slot="input-group-control"
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};
