'use client'

import {
	Arrow as TooltipArrowPrimitive,
	Content as TooltipContentPrimitive,
	Portal as TooltipPortalPrimitive,
	Provider as TooltipProviderPrimitive,
	Root as TooltipRootPrimitive,
	Trigger as TooltipTriggerPrimitive,
} from '@radix-ui/react-tooltip'

import { cn } from '@shared/libs/utils'
import type * as React from 'react'

// Note: composite overrides are applied via theme registry; Tooltip always uses Radix primitives to preserve context

function TooltipProvider({
	delayDuration = 0,
	...props
}: React.ComponentProps<typeof TooltipProviderPrimitive>) {
	return (
		<TooltipProviderPrimitive
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	)
}

function Tooltip({
	...props
}: React.ComponentProps<typeof TooltipRootPrimitive>) {
	// Always render Radix Tooltip root to preserve context; overrides are applied to content/trigger via styles only
	return (
		<TooltipProvider>
			<TooltipRootPrimitive data-slot="tooltip" {...props} />
		</TooltipProvider>
	)
}

function TooltipTrigger({
	...props
}: React.ComponentProps<typeof TooltipTriggerPrimitive>) {
	// Keep Radix Trigger to maintain semantics
	return <TooltipTriggerPrimitive data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
	className,
	sideOffset = 4,
	showArrow = false,
	children,
	...props
}: React.ComponentProps<typeof TooltipContentPrimitive> & {
	showArrow?: boolean
}) {
	return (
		<TooltipPortalPrimitive>
			<TooltipContentPrimitive
				className={cn(
					'fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-w-70 animate-in rounded-md border bg-popover px-3 py-1.5 text-popover-foreground text-sm data-[state=closed]:animate-out',
					className
				)}
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				{...props}
				style={{ zIndex: 'var(--z-dialog-content-plus-1)' }}
			>
				{children}
				{showArrow && (
					<TooltipArrowPrimitive className="-my-px fill-popover drop-shadow-[0_1px_0_var(--border)]" />
				)}
			</TooltipContentPrimitive>
		</TooltipPortalPrimitive>
	)
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
