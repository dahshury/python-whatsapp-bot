'use client'

import { Slot } from '@radix-ui/react-slot'
import { cn } from '@shared/libs/utils'
import type * as React from 'react'

interface ButtonGroupProps
	extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
	orientation?: 'horizontal' | 'vertical'
}

function ButtonGroup({
	className,
	orientation = 'horizontal',
	...props
}: ButtonGroupProps) {
	return (
		<fieldset
			className={cn(
				'flex',
				orientation === 'vertical' ? 'flex-col' : 'flex-row',
				className
			)}
			data-button-group
			data-orientation={orientation}
			{...props}
		/>
	)
}

interface ButtonGroupSeparatorProps
	extends React.HTMLAttributes<HTMLDivElement> {
	orientation?: 'horizontal' | 'vertical'
}

function ButtonGroupSeparator({
	className,
	orientation = 'vertical',
	...props
}: ButtonGroupSeparatorProps) {
	return (
		<div
			aria-hidden
			className={cn(
				'bg-border',
				orientation === 'vertical' ? 'h-px w-full' : 'h-full w-px',
				className
			)}
			{...props}
		/>
	)
}

interface ButtonGroupTextProps extends React.HTMLAttributes<HTMLSpanElement> {
	asChild?: boolean
}

function ButtonGroupText({
	asChild,
	className,
	...props
}: ButtonGroupTextProps) {
	const Comp: React.ElementType = asChild ? Slot : 'span'
	return (
		<Comp
			className={cn('px-2 text-muted-foreground text-sm', className)}
			{...props}
		/>
	)
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
