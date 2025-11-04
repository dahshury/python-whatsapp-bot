import { cn } from '@shared/libs/utils'
import type * as React from 'react'

const Empty = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>
}) => (
	<div
		className={cn('flex flex-col items-center justify-center py-12', className)}
		ref={ref}
		{...props}
	/>
)

Empty.displayName = 'Empty'

const EmptyHeader = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>
}) => (
	<div
		className={cn('flex flex-col items-center gap-3 text-center', className)}
		ref={ref}
		{...props}
	/>
)

EmptyHeader.displayName = 'EmptyHeader'

const EmptyMedia = ({
	className,
	ref,
	variant,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>
	variant?: 'icon' | 'image'
}) => (
	<div
		className={cn(
			'flex items-center justify-center',
			variant === 'icon' && 'text-muted-foreground',
			className
		)}
		ref={ref}
		{...props}
	/>
)

EmptyMedia.displayName = 'EmptyMedia'

const EmptyTitle = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
	ref?: React.RefObject<HTMLHeadingElement | null>
}) => (
	<h3
		className={cn('font-semibold text-foreground text-lg', className)}
		ref={ref}
		{...props}
	/>
)

EmptyTitle.displayName = 'EmptyTitle'

const EmptyDescription = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
	ref?: React.RefObject<HTMLParagraphElement | null>
}) => (
	<p
		className={cn('max-w-sm text-muted-foreground text-sm', className)}
		ref={ref}
		{...props}
	/>
)

EmptyDescription.displayName = 'EmptyDescription'

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription }
