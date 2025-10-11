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
				"group/input flex flex-col rounded-md border border-input bg-background overflow-hidden",
				"transition-shadow focus-within:ring-1 focus-within:ring-ring focus-within:border-ring",
				className
			)}
			{...props}
		/>
	);
}

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
	align?: AddonAlign;
}

function InputGroupAddon({ align = "inline-start", className, ...props }: InputGroupAddonProps) {
	const base = "flex items-center gap-1.5 p-1 bg-background w-full";
	const alignCls =
		align === "inline-end"
			? "border-l justify-end"
			: align === "inline-start"
				? "border-r justify-start"
				: align === "block-end"
					? "border-t"
					: "border-b";
	return <div className={cn(base, alignCls, className)} {...props} />;
}

interface InputGroupTextProps extends React.HTMLAttributes<HTMLSpanElement> {
	asChild?: boolean;
}
function InputGroupText({ asChild, className, ...props }: InputGroupTextProps) {
	const Comp: React.ElementType = asChild ? Slot : "span";
	return <Comp className={cn("text-sm text-muted-foreground px-2", className)} {...props} />;
}

type InputGroupButtonSize = "xs" | "icon-xs" | "sm" | "icon-sm";

interface InputGroupButtonProps extends Omit<React.ComponentProps<typeof Button>, "size"> {
	size?: InputGroupButtonSize;
}

function InputGroupButton({ className, size = "xs", variant = "ghost", ...props }: InputGroupButtonProps) {
	const sizeCls =
		size === "xs"
			? "h-8 px-2 text-xs"
			: size === "icon-xs"
				? "h-8 w-8 p-0"
				: size === "icon-sm"
					? "h-9 w-9 p-0"
					: "h-9 px-3"; // sm

	return <Button variant={variant} className={cn("rounded-none", sizeCls, className)} {...props} />;
}

interface InputGroupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

function InputGroupInput({ className, ...props }: InputGroupInputProps) {
	return (
		<input
			data-slot="input-group-control"
			className={cn("flex h-9 w-full bg-transparent px-3 py-1 text-base outline-none md:text-sm", className)}
			{...props}
		/>
	);
}

interface InputGroupTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function InputGroupTextarea({ className, ...props }: InputGroupTextareaProps) {
	return (
		<textarea
			data-slot="input-group-control"
			className={cn(
				"flex field-sizing-content min-h-16 w-full resize-none bg-transparent px-3 py-2 text-base outline-none md:text-sm",
				className
			)}
			{...props}
		/>
	);
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea };
