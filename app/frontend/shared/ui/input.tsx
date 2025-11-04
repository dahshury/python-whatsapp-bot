'use client'

import { useUiOverride } from '@shared/libs/ui-registry'
import { cn } from '@shared/libs/utils'
import type { ComponentProps } from 'react'

type InputProps = ComponentProps<'input'>

const BaseInput = ({ className, type, ref, ...props }: InputProps) => (
	<input
		className={cn(
			'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className
		)}
		ref={ref}
		type={type}
		{...props}
	/>
)
BaseInput.displayName = 'Input'

function Input(props: InputProps) {
	const Override = useUiOverride<InputProps>('Input', BaseInput)
	return <Override {...props} />
}

export { Input }
