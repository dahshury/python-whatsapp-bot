"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>;

const BaseLabel = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
	({ className, ...props }, ref) => (
		<LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
	)
);
BaseLabel.displayName = LabelPrimitive.Root.displayName;

function Label(props: LabelProps) {
	const Override = useUiOverride<LabelProps>("Label", BaseLabel);
	return <Override {...props} />;
}

export { Label };
