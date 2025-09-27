"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import * as React from "react";
import { useUiCompositeOverride } from "@/lib/ui-registry";
import { cn } from "@/lib/utils";

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string,
): React.ComponentType<TProps> | undefined {
	return ov[key] as unknown as React.ComponentType<TProps> | undefined;
}

const RadioGroup = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
	const OV = useUiCompositeOverride("RadioGroup");
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
	>(OV as unknown as Record<string, unknown>, "RadioGroup");
	if (Override) {
		return <Override className={className} {...props} />;
	}
	return (
		<RadioGroupPrimitive.Root
			className={cn("grid gap-2", className)}
			{...props}
			ref={ref}
		/>
	);
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
	const OV = useUiCompositeOverride("RadioGroup");
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
	>(OV as unknown as Record<string, unknown>, "RadioGroupItem");
	if (Override) {
		return <Override className={className} {...props} />;
	}
	return (
		<RadioGroupPrimitive.Item
			ref={ref}
			className={cn(
				"aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
				<Circle className="h-3.5 w-3.5 fill-primary" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
