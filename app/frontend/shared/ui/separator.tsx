"use client";

import { Root as SeparatorRootPrimitive } from "@radix-ui/react-separator";
import { cn } from "@shared/libs/utils";
import type * as React from "react";

const Separator = ({
  className,
  orientation = "horizontal",
  decorative = true,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorRootPrimitive> & {
  ref?: React.RefObject<React.ElementRef<typeof SeparatorRootPrimitive> | null>;
}) => (
  <SeparatorRootPrimitive
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal"
        ? "h-[0.0625rem] w-full"
        : "h-full w-[0.0625rem]",
      className
    )}
    decorative={decorative}
    orientation={orientation}
    ref={ref}
    {...props}
  />
);
Separator.displayName = SeparatorRootPrimitive.displayName;

export { Separator };
