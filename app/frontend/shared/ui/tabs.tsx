"use client";

import {
	Content as TabsContent,
	List as TabsList,
	Root as TabsRoot,
	Trigger as TabsTrigger,
} from "@radix-ui/react-tabs";
import { cn } from "@shared/libs/utils";
import type * as React from "react";

const Tabs = TabsRoot;

const TabsListComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsList> & {
	ref?: React.RefObject<React.ElementRef<typeof TabsList> | null>;
}) => (
	<TabsList
		className={cn(
			"inline-flex items-center justify-center rounded-lg bg-muted p-0.5 text-muted-foreground/70",
			className
		)}
		ref={ref}
		{...props}
	/>
);
TabsListComponent.displayName = TabsList.displayName;

const TabsTriggerComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsTrigger> & {
	ref?: React.RefObject<React.ElementRef<typeof TabsTrigger> | null>;
}) => (
	<TabsTrigger
		className={cn(
			"inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-sm outline-offset-2 transition-all hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-black/5 data-[state=active]:shadow-sm",
			className
		)}
		ref={ref}
		{...props}
	/>
);
TabsTriggerComponent.displayName = TabsTrigger.displayName;

const TabsContentComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsContent> & {
	ref?: React.RefObject<React.ElementRef<typeof TabsContent> | null>;
}) => (
	<TabsContent
		className={cn(
			"mt-2 rounded-md border px-4 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			className
		)}
		ref={ref}
		{...props}
	/>
);
TabsContentComponent.displayName = TabsContent.displayName;

export {
	Tabs,
	TabsContentComponent as TabsContent,
	TabsListComponent as TabsList,
	TabsTriggerComponent as TabsTrigger,
};
