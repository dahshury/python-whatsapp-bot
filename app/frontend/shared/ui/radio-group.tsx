"use client";

import {
	Indicator as RadioGroupIndicator,
	Item as RadioGroupItem,
	Root as RadioGroupRoot,
} from "@radix-ui/react-radio-group";
import { cn } from "@shared/libs/utils";
import { Circle } from "lucide-react";
import type {
	ComponentPropsWithoutRef,
	ComponentType,
	ElementRef,
	Ref,
} from "react";
import { useUiCompositeOverride } from "@/shared/libs/ui-registry";

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string
): ComponentType<TProps> | undefined {
	return ov[key] as unknown as ComponentType<TProps> | undefined;
}

const RadioGroup = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof RadioGroupRoot> & {
	ref?: Ref<ElementRef<typeof RadioGroupRoot> | null>;
}) => {
	const OV = useUiCompositeOverride("RadioGroup");
	const Override = getOverride<ComponentPropsWithoutRef<typeof RadioGroupRoot>>(
		OV as unknown as Record<string, unknown>,
		"RadioGroup"
	);
	if (Override) {
		return <Override className={className} {...props} />;
	}
	return (
		<RadioGroupRoot
			className={cn("grid gap-2", className)}
			{...props}
			ref={ref}
		/>
	);
};
RadioGroup.displayName = RadioGroupRoot.displayName;

const RadioGroupItemComponent = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof RadioGroupItem> & {
	ref?: Ref<ElementRef<typeof RadioGroupItem> | null>;
}) => {
	const OV = useUiCompositeOverride("RadioGroup");
	const Override = getOverride<ComponentPropsWithoutRef<typeof RadioGroupItem>>(
		OV as unknown as Record<string, unknown>,
		"RadioGroupItem"
	);
	if (Override) {
		return <Override className={className} {...props} />;
	}
	return (
		<RadioGroupItem
			className={cn(
				"aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			ref={ref}
			{...props}
		>
			<RadioGroupIndicator className="flex items-center justify-center">
				<Circle className="h-3.5 w-3.5 fill-primary" />
			</RadioGroupIndicator>
		</RadioGroupItem>
	);
};
RadioGroupItemComponent.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItemComponent as RadioGroupItem };
