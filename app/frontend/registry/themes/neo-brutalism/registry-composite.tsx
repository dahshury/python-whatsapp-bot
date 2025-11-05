"use client";

import { cn } from "@shared/libs/utils";
import {
  type ComponentType,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import type { UiCompositeRegistryMap } from "@/shared/libs/ui-registry";

// Example: composite override for Popover and Tooltip parts
type AnyProps = Record<string, unknown> & { children?: ReactNode };

const Popover: Record<string, ComponentType<unknown>> = {
  Popover: (props: unknown) => {
    const { ...rest } = props as AnyProps;
    return <div data-neo-popover-root {...rest} />;
  },
  PopoverTrigger: (props: unknown) => {
    const { asChild, children, ...rest } = props as AnyProps & {
      asChild?: boolean;
    };
    if (asChild && isValidElement(children)) {
      // clone with data attribute using a generic index signature to satisfy types
      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        ...(rest as Record<string, unknown>),
        "data-neo-popover-trigger": true,
      });
    }
    return <button data-neo-popover-trigger type="button" {...rest} />;
  },
  PopoverContent: (props: unknown) => {
    const { className, ...rest } = props as AnyProps & { className?: string };
    return (
      <div
        className={cn(
          "rounded-md border-2 border-black bg-white p-4 text-black shadow-[6px_6px_0_0_#000] dark:border-white dark:bg-neutral-900 dark:text-white",
          className
        )}
        data-neo-popover-content
        {...rest}
      />
    );
  },
};

const Tooltip: Record<string, ComponentType<unknown>> = {
  Tooltip: (props: unknown) => {
    const rest = props as AnyProps;
    return <div data-neo-tooltip-root {...rest} />;
  },
  TooltipTrigger: (props: unknown) => {
    const { asChild, children, ...rest } = props as AnyProps & {
      asChild?: boolean;
    };
    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        ...(rest as Record<string, unknown>),
        "data-neo-tooltip-trigger": true,
      });
    }
    return <button data-neo-tooltip-trigger type="button" {...rest} />;
  },
  TooltipContent: (props: unknown) => {
    const { className, ...rest } = props as AnyProps & { className?: string };
    return (
      <div
        className={cn(
          "rounded-md border-2 border-black bg-white px-2 py-1 font-semibold text-black text-xs shadow-[4px_4px_0_0_#000] dark:border-white dark:bg-neutral-900 dark:text-white",
          className
        )}
        data-neo-tooltip-content
        {...rest}
      />
    );
  },
};

export const neoCompositeRegistry: UiCompositeRegistryMap = {
  Popover,
  Tooltip,
};
