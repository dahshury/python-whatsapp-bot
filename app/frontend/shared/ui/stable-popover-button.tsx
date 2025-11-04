import { cn } from '@shared/libs/utils'
import { Button, type buttonVariants } from '@ui/button'
import type { VariantProps } from 'class-variance-authority'
import type * as React from 'react'

type ButtonProps = React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}

export interface StablePopoverButtonProps extends ButtonProps {
	children: React.ReactNode
}

/**
 * A stable button component specifically designed for use with PopoverTrigger.
 * This component prevents flashing/flickering issues when used as a trigger for Popover components.
 */
export const StablePopoverButton = ({
	className,
	children,
	ref,
	...props
}: StablePopoverButtonProps & {
	ref?: React.RefObject<HTMLButtonElement | null>
}) => {
	return (
		<Button
			className={cn(
				// Disable all transitions and animations
				'transition-none',
				'combobox-trigger-stable',
				className
			)}
			ref={ref}
			{...props}
		>
			{children}
		</Button>
	)
}

StablePopoverButton.displayName = 'StablePopoverButton'
