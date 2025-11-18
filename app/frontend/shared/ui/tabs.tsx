'use client'

import {
	Content as TabsContentPrimitive,
	List as TabsListPrimitive,
	Root as TabsRootPrimitive,
	Trigger as TabsTriggerPrimitive,
} from '@radix-ui/react-tabs'
import { cn } from '@shared/libs/utils'
import type * as React from 'react'

const Tabs = TabsRootPrimitive

const TabsList = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsListPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof TabsListPrimitive> | null>
}) => (
	<TabsListPrimitive
		className={cn(
			'inline-flex items-center justify-center rounded-lg bg-muted p-0.5 text-muted-foreground/70',
			className
		)}
		ref={ref}
		{...props}
	/>
)
TabsList.displayName = TabsListPrimitive.displayName

const TabsTrigger = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsTriggerPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof TabsTriggerPrimitive> | null>
}) => (
	<TabsTriggerPrimitive
		className={cn(
			'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-sm outline-offset-2 transition-all hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-black/5 data-[state=active]:shadow-sm',
			className
		)}
		ref={ref}
		{...props}
	/>
)
TabsTrigger.displayName = TabsTriggerPrimitive.displayName

const TabsContent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsContentPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof TabsContentPrimitive> | null>
}) => (
	<TabsContentPrimitive
		className={cn(
			'mt-2 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70',
			className
		)}
		ref={ref}
		{...props}
	/>
)
TabsContent.displayName = TabsContentPrimitive.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
