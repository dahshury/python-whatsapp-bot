'use client'

import {
	CheckboxIndicator as CheckboxIndicatorPrimitive,
	Root as CheckboxRootPrimitive,
} from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/shared/libs/utils'

const Checkbox = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof CheckboxRootPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof CheckboxRootPrimitive> | null>
}) => (
	<CheckboxRootPrimitive
		className={cn(
			'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
			className
		)}
		{...props}
		ref={ref}
	>
		<CheckboxIndicatorPrimitive
			className={cn('flex items-center justify-center text-current')}
		>
			<Check className="h-4 w-4" />
		</CheckboxIndicatorPrimitive>
	</CheckboxRootPrimitive>
)
Checkbox.displayName = CheckboxRootPrimitive.displayName

export { Checkbox }
