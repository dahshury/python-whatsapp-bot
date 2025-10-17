"use client";

import { Root as SeparatorRoot } from "@radix-ui/react-separator";
import { cn } from "@shared/libs/utils";
import type * as React from "react";

const Separator = ({
	className,
	orientation = "horizontal",
	decorative = true,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SeparatorRoot> & {
	ref?: React.RefObject<React.ElementRef<typeof SeparatorRoot> | null>;
}) => (
	<SeparatorRoot
		className={cn(
			"shrink-0 bg-border",
			orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
			className
		)}
		decorative={decorative}
		orientation={orientation}
		ref={ref}
		{...props}
	/>
);
Separator.displayName = SeparatorRoot.displayName;

export { Separator };
