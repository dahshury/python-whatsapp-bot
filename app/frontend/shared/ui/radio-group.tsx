"use client";

import {
  Indicator as RadioGroupIndicatorPrimitive,
  Item as RadioGroupItemPrimitive,
  Root as RadioGroupRootPrimitive,
} from "@radix-ui/react-radio-group";
import { cn } from "@shared/libs/utils";
import { Circle } from "lucide-react";
import type * as React from "react";
import { useUiCompositeOverride } from "@/shared/libs/ui-registry";

function getOverride<TProps>(
  ov: Record<string, unknown>,
  key: string
): React.ComponentType<TProps> | undefined {
  return ov[key] as unknown as React.ComponentType<TProps> | undefined;
}

const RadioGroup = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupRootPrimitive> & {
  ref?: React.RefObject<React.ElementRef<
    typeof RadioGroupRootPrimitive
  > | null>;
}) => {
  const OV = useUiCompositeOverride("RadioGroup");
  const Override = getOverride<
    React.ComponentPropsWithoutRef<typeof RadioGroupRootPrimitive>
  >(OV as unknown as Record<string, unknown>, "RadioGroup");
  if (Override) {
    return <Override className={className} {...props} />;
  }
  return (
    <RadioGroupRootPrimitive
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
};
RadioGroup.displayName = RadioGroupRootPrimitive.displayName;

const RadioGroupItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupItemPrimitive> & {
  ref?: React.RefObject<React.ElementRef<
    typeof RadioGroupItemPrimitive
  > | null>;
}) => {
  const OV = useUiCompositeOverride("RadioGroup");
  const Override = getOverride<
    React.ComponentPropsWithoutRef<typeof RadioGroupItemPrimitive>
  >(OV as unknown as Record<string, unknown>, "RadioGroupItem");
  if (Override) {
    return <Override className={className} {...props} />;
  }
  return (
    <RadioGroupItemPrimitive
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    >
      <RadioGroupIndicatorPrimitive className="flex items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-primary" />
      </RadioGroupIndicatorPrimitive>
    </RadioGroupItemPrimitive>
  );
};
RadioGroupItem.displayName = RadioGroupItemPrimitive.displayName;

export { RadioGroup, RadioGroupItem };
