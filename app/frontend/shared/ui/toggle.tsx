"use client";

import { Root as ToggleRoot } from "@radix-ui/react-toggle";
import { cn } from "@shared/libs/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const toggleVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline:
					"border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
			},
			size: {
				default: "h-9 min-w-9 px-2",
				sm: "h-8 min-w-8 px-1.5",
				lg: "h-10 min-w-10 px-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

const Toggle = ({
	className,
	variant,
	size,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToggleRoot> &
	VariantProps<typeof toggleVariants> & {
		ref?: React.RefObject<React.ElementRef<typeof ToggleRoot> | null>;
	}) => (
	<ToggleRoot
		className={cn(toggleVariants({ variant, size, className }))}
		ref={ref}
		{...props}
	/>
);

Toggle.displayName = ToggleRoot.displayName;

export { Toggle, toggleVariants };
