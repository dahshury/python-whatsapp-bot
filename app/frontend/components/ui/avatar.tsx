"use client";

import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	),
);
Avatar.displayName = "Avatar";

interface AvatarImageProps
	extends Omit<React.ComponentProps<typeof Image>, "src"> {
	alt: string;
	src: string;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
	({ className, alt, src, ...props }, ref) => (
		// eslint-disable-next-line @next/next/no-img-element
		<Image
			ref={ref as unknown as React.RefObject<HTMLImageElement>}
			alt={alt}
			src={src}
			fill
			className={cn("object-cover", className)}
			{...props}
		/>
	),
);
AvatarImage.displayName = "AvatarImage";

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"flex h-full w-full items-center justify-center rounded-full bg-muted",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	),
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
