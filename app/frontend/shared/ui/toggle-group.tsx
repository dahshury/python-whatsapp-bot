"use client";

import {
	Item as ToggleGroupItem,
	Root as ToggleGroupRoot,
} from "@radix-ui/react-toggle-group";
import { cn } from "@shared/libs/utils";
import type { VariantProps } from "class-variance-authority";
import {
	type ComponentPropsWithoutRef,
	createContext,
	type ElementRef,
	type RefObject,
	useContext,
} from "react";
import { toggleVariants } from "@/shared/ui/toggle";

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
	size: "default",
	variant: "default",
});

const ToggleGroup = ({
	className,
	variant,
	size,
	children,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof ToggleGroupRoot> &
	VariantProps<typeof toggleVariants> & {
		ref?: RefObject<ElementRef<typeof ToggleGroupRoot> | null>;
	}) => (
	<ToggleGroupRoot
		className={cn("flex items-center justify-center gap-1", className)}
		ref={ref}
		{...props}
	>
		<ToggleGroupContext.Provider value={{ variant, size }}>
			{children}
		</ToggleGroupContext.Provider>
	</ToggleGroupRoot>
);

ToggleGroup.displayName = ToggleGroupRoot.displayName;

const ToggleGroupItemComponent = ({
	className,
	children,
	variant,
	size,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof ToggleGroupItem> &
	VariantProps<typeof toggleVariants> & {
		ref?: RefObject<ElementRef<typeof ToggleGroupItem> | null>;
	}) => {
	const context = useContext(ToggleGroupContext);

	return (
		<ToggleGroupItem
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				className
			)}
			ref={ref}
			{...props}
		>
			{children}
		</ToggleGroupItem>
	);
};

ToggleGroupItemComponent.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItemComponent as ToggleGroupItem };
