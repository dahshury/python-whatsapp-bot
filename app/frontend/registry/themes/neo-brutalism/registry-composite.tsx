"use client";

import * as React from "react";
import type { UiCompositeRegistryMap } from "@/lib/ui-registry";
import { cn } from "@/lib/utils";

// Example: composite override for Popover and Tooltip parts
type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

const Popover = {
	Popover: ({ modal = true, ...props }: AnyProps) => (
		<div data-neo-popover-root {...props} />
	),
	PopoverTrigger: ({
		asChild,
		children,
		...rest
	}: AnyProps & { asChild?: boolean }) => {
		if (asChild && React.isValidElement(children)) {
			// clone with data attribute using a generic index signature to satisfy types
			return React.cloneElement(
				children as React.ReactElement<Record<string, unknown>>,
				{
					...(rest as Record<string, unknown>),
					"data-neo-popover-trigger": true,
				},
			);
		}
		return <button type="button" data-neo-popover-trigger {...rest} />;
	},
	PopoverContent: ({
		className,
		...props
	}: AnyProps & { className?: string }) => (
		<div
			data-neo-popover-content
			className={cn(
				"rounded-md border-2 border-black bg-white p-4 text-black shadow-[6px_6px_0_0_#000] dark:bg-neutral-900 dark:text-white dark:border-white",
				className,
			)}
			{...props}
		/>
	),
};

const Tooltip = {
	Tooltip: (props: AnyProps) => <div data-neo-tooltip-root {...props} />,
	TooltipTrigger: ({
		asChild,
		children,
		...rest
	}: AnyProps & { asChild?: boolean }) => {
		if (asChild && React.isValidElement(children)) {
			return React.cloneElement(
				children as React.ReactElement<Record<string, unknown>>,
				{
					...(rest as Record<string, unknown>),
					"data-neo-tooltip-trigger": true,
				},
			);
		}
		return <button type="button" data-neo-tooltip-trigger {...rest} />;
	},
	TooltipContent: ({
		className,
		...props
	}: AnyProps & { className?: string }) => (
		<div
			data-neo-tooltip-content
			className={cn(
				"rounded-md border-2 border-black bg-white px-2 py-1 text-xs font-semibold text-black shadow-[4px_4px_0_0_#000] dark:bg-neutral-900 dark:text-white dark:border-white",
				className,
			)}
			{...props}
		/>
	),
};

export const neoCompositeRegistry: UiCompositeRegistryMap = {
	Popover,
	Tooltip,
};
