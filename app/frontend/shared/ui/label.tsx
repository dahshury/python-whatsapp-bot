"use client";

import { Root as LabelRoot } from "@radix-ui/react-label";
import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef, Ref } from "react";

const labelVariants = cva(
	"font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

type LabelProps = ComponentPropsWithoutRef<typeof LabelRoot> &
	VariantProps<typeof labelVariants>;

const BaseLabel = ({
	className,
	ref,
	...props
}: LabelProps & {
	ref?: Ref<ElementRef<typeof LabelRoot> | null>;
}) => (
	<LabelRoot className={cn(labelVariants(), className)} ref={ref} {...props} />
);
BaseLabel.displayName = LabelRoot.displayName;

function Label(props: LabelProps) {
	const Override = useUiOverride<LabelProps>("Label", BaseLabel);
	return <Override {...props} />;
}

export { Label };
