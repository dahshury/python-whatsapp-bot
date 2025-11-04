'use client'

import {
	Root as SwitchRootPrimitive,
	Thumb as SwitchThumbPrimitive,
} from '@radix-ui/react-switch'
import { cn } from '@shared/libs/utils'
import type * as React from 'react'

const Switch = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SwitchRootPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof SwitchRootPrimitive> | null>
}) => (
	<SwitchRootPrimitive
		className={cn(
			'group peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-all duration-300 ease-in-out hover:ring-1 hover:ring-primary/10 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
			className
		)}
		{...props}
		ref={ref}
	>
		<SwitchThumbPrimitive
			className={cn(
				'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-300 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
			)}
		/>
	</SwitchRootPrimitive>
)
Switch.displayName = SwitchRootPrimitive.displayName

export { Switch }
