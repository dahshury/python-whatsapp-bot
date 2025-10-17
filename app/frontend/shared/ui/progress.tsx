"use client";

import {
	Indicator as ProgressIndicator,
	Root as ProgressRoot,
} from "@radix-ui/react-progress";
import { cn } from "@shared/libs/utils";
import type { ComponentPropsWithoutRef, ElementRef, Ref } from "react";

const FULL_PERCENT = 100;

const Progress = ({
	className,
	value,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof ProgressRoot> & {
	ref?: Ref<ElementRef<typeof ProgressRoot> | null>;
}) => (
	<ProgressRoot
		className={cn(
			"relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
			className
		)}
		ref={ref}
		{...props}
	>
		<ProgressIndicator
			className="h-full w-full flex-1 bg-primary transition-all"
			style={{ transform: `translateX(-${FULL_PERCENT - (value || 0)}%)` }}
		/>
	</ProgressRoot>
);
Progress.displayName = ProgressRoot.displayName;

export { Progress };
