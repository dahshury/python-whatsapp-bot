import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

export interface StablePopoverButtonProps extends ButtonProps {
	children: React.ReactNode;
}

/**
 * A stable button component specifically designed for use with PopoverTrigger.
 * This component prevents flashing/flickering issues when used as a trigger for Popover components.
 */
export const StablePopoverButton = React.forwardRef<
	HTMLButtonElement,
	StablePopoverButtonProps
>(({ className, children, ...props }, ref) => {
	return (
		<Button
			ref={ref}
			className={cn(
				// Disable all transitions and animations
				"transition-none",
				"combobox-trigger-stable",
				className,
			)}
			{...props}
		>
			{children}
		</Button>
	);
});

StablePopoverButton.displayName = "StablePopoverButton";
