'use client'

import {
	Close as DialogClosePrimitive,
	Content as DialogContentPrimitive,
	Description as DialogDescriptionPrimitive,
	Overlay as DialogOverlayPrimitive,
	Portal as DialogPortalPrimitive,
	Root as DialogRootPrimitive,
	Title as DialogTitlePrimitive,
	Trigger as DialogTriggerPrimitive,
} from '@radix-ui/react-dialog'
import { cn } from '@shared/libs/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type * as React from 'react'
import { useUiCompositeOverride } from '@/shared/libs/ui-registry'

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string
): React.ComponentType<TProps> | undefined {
	return ov[key] as unknown as React.ComponentType<TProps> | undefined
}

function Sheet(props: React.ComponentProps<typeof DialogRootPrimitive>) {
	const OV = useUiCompositeOverride('Sheet')
	const Override = getOverride<
		React.ComponentProps<typeof DialogRootPrimitive>
	>(OV as unknown as Record<string, unknown>, 'Sheet')
	if (Override) {
		return <Override {...props} />
	}
	return <DialogRootPrimitive {...props} />
}

function SheetTrigger(
	props: React.ComponentProps<typeof DialogTriggerPrimitive>
) {
	const OV = useUiCompositeOverride('Sheet')
	const Override = getOverride<
		React.ComponentProps<typeof DialogTriggerPrimitive>
	>(OV as unknown as Record<string, unknown>, 'SheetTrigger')
	if (Override) {
		return <Override {...props} />
	}
	return <DialogTriggerPrimitive {...props} />
}

function SheetClose(props: React.ComponentProps<typeof DialogClosePrimitive>) {
	const OV = useUiCompositeOverride('Sheet')
	const Override = getOverride<
		React.ComponentProps<typeof DialogClosePrimitive>
	>(OV as unknown as Record<string, unknown>, 'SheetClose')
	if (Override) {
		return <Override {...props} />
	}
	return <DialogClosePrimitive {...props} />
}

function SheetPortal(
	props: React.ComponentProps<typeof DialogPortalPrimitive>
) {
	const OV = useUiCompositeOverride('Sheet')
	const Override = getOverride<
		React.ComponentProps<typeof DialogPortalPrimitive>
	>(OV as unknown as Record<string, unknown>, 'SheetPortal')
	if (Override) {
		return <Override {...props} />
	}
	return <DialogPortalPrimitive {...props} />
}

const SheetOverlay = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogOverlayPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof DialogOverlayPrimitive> | null>
}) => {
	const OV = useUiCompositeOverride('Sheet')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof DialogOverlayPrimitive>
	>(OV as unknown as Record<string, unknown>, 'SheetOverlay')
	if (Override) {
		return <Override className={className} {...props} />
	}
	return (
		<DialogOverlayPrimitive
			className={cn(
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in',
				className
			)}
			{...props}
			ref={ref}
		/>
	)
}
SheetOverlay.displayName = DialogOverlayPrimitive.displayName

const sheetVariants = cva(
	'fixed gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-300 data-[state=open]:duration-500',
	{
		variants: {
			side: {
				top: 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b',
				bottom:
					'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t',
				left: 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
				right:
					'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
			},
		},
		defaultVariants: {
			side: 'right',
		},
	}
)

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof DialogContentPrimitive>,
		VariantProps<typeof sheetVariants> {}

const SheetContent = ({
	side = 'right',
	className,
	children,
	ref,
	...props
}: SheetContentProps & {
	ref?: React.RefObject<React.ElementRef<typeof DialogContentPrimitive> | null>
}) => {
	const OV = useUiCompositeOverride('Sheet')
	const Override = getOverride<SheetContentProps>(
		OV as unknown as Record<string, unknown>,
		'SheetContent'
	)
	if (Override) {
		return (
			<SheetPortal>
				<SheetOverlay />
				<Override
					className={cn(sheetVariants({ side }), className)}
					side={side}
					{...props}
				>
					{children}
				</Override>
			</SheetPortal>
		)
	}
	return (
		<SheetPortal>
			<SheetOverlay />
			<DialogContentPrimitive
				className={cn(sheetVariants({ side }), className)}
				ref={ref}
				{...props}
			>
				<DialogClosePrimitive className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</DialogClosePrimitive>
				{children}
			</DialogContentPrimitive>
		</SheetPortal>
	)
}
SheetContent.displayName = DialogContentPrimitive.displayName

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col space-y-2 text-center sm:text-left',
			className
		)}
		{...props}
	/>
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
			className
		)}
		{...props}
	/>
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogTitlePrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof DialogTitlePrimitive> | null>
}) => (
	<DialogTitlePrimitive
		className={cn('font-semibold text-foreground text-lg', className)}
		ref={ref}
		{...props}
	/>
)
SheetTitle.displayName = DialogTitlePrimitive.displayName

const SheetDescription = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogDescriptionPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof DialogDescriptionPrimitive
	> | null>
}) => (
	<DialogDescriptionPrimitive
		className={cn('text-muted-foreground text-sm', className)}
		ref={ref}
		{...props}
	/>
)
SheetDescription.displayName = DialogDescriptionPrimitive.displayName

export {
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
