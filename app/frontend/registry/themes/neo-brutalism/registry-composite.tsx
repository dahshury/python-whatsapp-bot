"use client";

import { cn } from "@shared/libs/utils";
import * as React from "react";
import type { UiCompositeRegistryMap } from "@/shared/libs/ui-registry";

// Example: composite override for Popover and Tooltip parts
type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

const Popover: Record<string, React.ComponentType<unknown>> = {
	Popover: (props: unknown) => {
		const { ...rest } = props as AnyProps;
		return <div data-neo-popover-root {...rest} />;
	},
	PopoverTrigger: (props: unknown) => {
		const { asChild, children, ...rest } = props as AnyProps & {
			asChild?: boolean;
		};
		if (asChild && React.isValidElement(children)) {
			// clone with data attribute using a generic index signature to satisfy types
			return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
				...(rest as Record<string, unknown>),
				"data-neo-popover-trigger": true,
			});
		}
		return <button type="button" data-neo-popover-trigger {...rest} />;
	},
	PopoverContent: (props: unknown) => {
		const { className, ...rest } = props as AnyProps & { className?: string };
		return (
			<div
				data-neo-popover-content
				className={cn(
					"rounded-md border-2 border-black bg-white p-4 text-black shadow-[6px_6px_0_0_#000] dark:bg-neutral-900 dark:text-white dark:border-white",
					className
				)}
				{...rest}
			/>
		);
	},
};

const Tooltip: Record<string, React.ComponentType<unknown>> = {
	Tooltip: (props: unknown) => {
		const rest = props as AnyProps;
		return <div data-neo-tooltip-root {...rest} />;
	},
	TooltipTrigger: (props: unknown) => {
		const { asChild, children, ...rest } = props as AnyProps & {
			asChild?: boolean;
		};
		if (asChild && React.isValidElement(children)) {
			return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
				...(rest as Record<string, unknown>),
				"data-neo-tooltip-trigger": true,
			});
		}
		return <button type="button" data-neo-tooltip-trigger {...rest} />;
	},
	TooltipContent: (props: unknown) => {
		const { className, ...rest } = props as AnyProps & { className?: string };
		return (
			<div
				data-neo-tooltip-content
				className={cn(
					"rounded-md border-2 border-black bg-white px-2 py-1 text-xs font-semibold text-black shadow-[4px_4px_0_0_#000] dark:bg-neutral-900 dark:text-white dark:border-white",
					className
				)}
				{...rest}
			/>
		);
	},
};

export const neoCompositeRegistry: UiCompositeRegistryMap = {
	Popover,
	Tooltip,
};
