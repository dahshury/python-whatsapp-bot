"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

import {
	Highlight,
	HighlightItem,
	type HighlightItemProps,
	type HighlightProps,
} from "@/components/animate-ui/primitives/effects/highlight";
import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/lib/get-strict-context";

type TabsContextType = {
	value: string | undefined;
	setValue: (value: string) => void;
};

const [TabsProvider, useTabs] =
	getStrictContext<TabsContextType>("TabsContext");

type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

function Tabs(props: TabsProps) {
	const controlledStateProps: {
		value?: string;
		defaultValue?: string;
		onChange?: (value: string) => void;
	} = {};

	if (props.value !== undefined) {
		controlledStateProps.value = props.value;
	}
	if (props.defaultValue !== undefined) {
		controlledStateProps.defaultValue = props.defaultValue;
	}
	if (props.onValueChange !== undefined) {
		controlledStateProps.onChange = props.onValueChange;
	}

	const [value, setValue] = useControlledState(controlledStateProps);

	return (
		<TabsProvider value={{ value, setValue }}>
			<TabsPrimitive.Root
				data-slot="tabs"
				{...props}
				onValueChange={setValue}
			/>
		</TabsProvider>
	);
}

type TabsHighlightProps = Omit<HighlightProps, "controlledItems" | "value">;

function TabsHighlight({
	transition = { type: "spring", stiffness: 200, damping: 25 },
	...props
}: TabsHighlightProps) {
	const { value } = useTabs();

	const highlightProps: React.ComponentProps<typeof Highlight> = {
		controlledItems: true,
		transition,
		click: false,
		...props,
	};

	if (value !== undefined) {
		highlightProps.value = value;
	}

	return <Highlight {...highlightProps} />;
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>;

function TabsList(props: TabsListProps) {
	return <TabsPrimitive.List data-slot="tabs-list" {...props} />;
}

type TabsHighlightItemProps = HighlightItemProps & {
	value: string;
};

function TabsHighlightItem(props: TabsHighlightItemProps) {
	return <HighlightItem {...props} />;
}

type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;

function TabsTrigger(props: TabsTriggerProps) {
	return <TabsPrimitive.Trigger data-slot="tabs-trigger" {...props} />;
}

type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content> &
	HTMLMotionProps<"div">;

function TabsContent({
	value,
	forceMount,
	transition = { duration: 0.5, ease: "easeInOut" },
	...props
}: TabsContentProps) {
	const contentProps: React.ComponentProps<typeof TabsPrimitive.Content> = {
		asChild: true,
		value,
	};

	if (forceMount !== undefined) {
		contentProps.forceMount = forceMount;
	}

	return (
		<AnimatePresence mode="wait">
			<TabsPrimitive.Content {...contentProps}>
				<motion.div
					data-slot="tabs-content"
					layout
					layoutDependency={value}
					initial={{ opacity: 0, filter: "blur(4px)" }}
					animate={{ opacity: 1, filter: "blur(0px)" }}
					exit={{ opacity: 0, filter: "blur(4px)" }}
					transition={transition}
					{...props}
				/>
			</TabsPrimitive.Content>
		</AnimatePresence>
	);
}

type TabsContentsProps = HTMLMotionProps<"div"> & {
	children: React.ReactNode;
};

function TabsContents({
	transition = { type: "spring", stiffness: 200, damping: 30 },
	...props
}: TabsContentsProps) {
	const { value } = useTabs();

	return (
		<motion.div
			data-slot="tabs-contents"
			layout="size"
			layoutDependency={value}
			style={{ overflow: "hidden" }}
			transition={{ layout: transition }}
			{...props}
		/>
	);
}

export {
	Tabs,
	TabsHighlight,
	TabsHighlightItem,
	TabsList,
	TabsTrigger,
	TabsContent,
	TabsContents,
	type TabsProps,
	type TabsHighlightProps,
	type TabsHighlightItemProps,
	type TabsListProps,
	type TabsTriggerProps,
	type TabsContentProps,
	type TabsContentsProps,
};
