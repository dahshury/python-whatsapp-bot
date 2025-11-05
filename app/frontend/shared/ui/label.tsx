"use client";

import { Root as LabelRootPrimitive } from "@radix-ui/react-label";
import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const labelVariants = cva(
  "font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelRootPrimitive> &
  VariantProps<typeof labelVariants>;

const BaseLabel = ({
  className,
  ref,
  ...props
}: LabelProps & {
  ref?: React.RefObject<React.ElementRef<typeof LabelRootPrimitive> | null>;
}) => (
  <LabelRootPrimitive
    className={cn(labelVariants(), className)}
    ref={ref}
    {...props}
  />
);
BaseLabel.displayName = LabelRootPrimitive.displayName;

function Label(props: LabelProps) {
  const Override = useUiOverride<LabelProps>("Label", BaseLabel);
  return <Override {...props} />;
}

export { Label };
