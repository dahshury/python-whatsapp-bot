"use client";

import { Fallback, Image, Root } from "@radix-ui/react-avatar";
import { cn } from "@shared/libs/utils";
import type { ComponentPropsWithoutRef, ElementRef, RefObject } from "react";

const Avatar = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Root> & {
	ref?: RefObject<ElementRef<typeof Root> | null>;
}) => (
	<Root
		className={cn(
			"relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
			className
		)}
		ref={ref}
		{...props}
	/>
);
Avatar.displayName = Root.displayName;

const AvatarImage = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Image> & {
	ref?: RefObject<ElementRef<typeof Image> | null>;
}) => (
	<Image
		className={cn("aspect-square h-full w-full", className)}
		ref={ref}
		{...props}
	/>
);
AvatarImage.displayName = Image.displayName;

const AvatarFallback = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Fallback> & {
	ref?: RefObject<ElementRef<typeof Fallback> | null>;
}) => (
	<Fallback
		className={cn(
			"flex h-full w-full items-center justify-center rounded-full bg-muted",
			className
		)}
		ref={ref}
		{...props}
	/>
);
AvatarFallback.displayName = Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };
