"use client";

import {
  Indicator as ProgressIndicatorPrimitive,
  Root as ProgressRootPrimitive,
} from "@radix-ui/react-progress";
import { cn } from "@shared/libs/utils";
import type * as React from "react";

const Progress = ({
  className,
  value,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressRootPrimitive> & {
  ref?: React.RefObject<React.ElementRef<typeof ProgressRootPrimitive> | null>;
}) => (
  <ProgressRootPrimitive
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    ref={ref}
    {...props}
  >
    <ProgressIndicatorPrimitive
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{
        transform: (() => {
          const PERCENTAGE_MAX = 100;
          return `translateX(-${PERCENTAGE_MAX - (value || 0)}%)`;
        })(),
      }}
    />
  </ProgressRootPrimitive>
);
Progress.displayName = ProgressRootPrimitive.displayName;

export { Progress };
