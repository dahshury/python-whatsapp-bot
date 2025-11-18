'use client'

import { Item, Root } from '@radix-ui/react-toggle-group'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ElementRef, RefObject } from 'react'

import { cn } from '@/shared/libs/utils'

// Spacing constants for toggle group gap values
const SPACING_1 = 1
const SPACING_2 = 2
const SPACING_3 = 3
const SPACING_4 = 4

const toggleGroupVariants = cva(
	'inline-flex items-center justify-center rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline:
					'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
			},
			size: {
				default: 'h-10 px-3',
				sm: 'h-9 px-2.5 text-xs',
				lg: 'h-11 px-5',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
)

const ToggleGroup = ({
	className,
	variant,
	size,
	spacing = 0,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Root> &
	VariantProps<typeof toggleGroupVariants> & {
		spacing?: number
	} & { ref?: RefObject<ElementRef<typeof Root> | null> }) => {
	const getSpacingClass = (spacingValue: number): string => {
		if (spacingValue === SPACING_1) {
			return 'gap-1'
		}
		if (spacingValue === SPACING_2) {
			return 'gap-2'
		}
		if (spacingValue === SPACING_3) {
			return 'gap-3'
		}
		if (spacingValue === SPACING_4) {
			return 'gap-4'
		}
		return ''
	}

	const spacingClass = getSpacingClass(spacing)
	return (
		<Root
			className={cn(
				'inline-flex items-center justify-center rounded-md',
				spacingClass,
				className
			)}
			ref={ref}
			{...props}
		/>
	)
}

ToggleGroup.displayName = Root.displayName

const ToggleGroupItem = ({
	className,
	variant,
	size,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof Item> &
	VariantProps<typeof toggleGroupVariants> & {
		ref?: RefObject<ElementRef<typeof Item> | null>
	}) => (
	<Item
		className={cn(
			toggleGroupVariants({ variant, size }),
			// Connected appearance: first item rounded left, last item rounded right, middle items no rounding
			// Also remove right border from all but last item, and left border from all but first item
			'first:rounded-r-none first:rounded-l-md last:rounded-r-md last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none',
			variant === 'outline' && '[&:not(:last-child)]:border-r-0',
			className
		)}
		ref={ref}
		{...props}
	/>
)

ToggleGroupItem.displayName = Item.displayName

export { ToggleGroup, ToggleGroupItem }
