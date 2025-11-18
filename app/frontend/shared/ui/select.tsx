'use client'

import {
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
} from '@radix-ui/react-icons'
import {
	Content as SelectContentPrimitive,
	Group as SelectGroupPrimitive,
	Icon as SelectIconPrimitive,
	ItemIndicator as SelectItemIndicatorPrimitive,
	Item as SelectItemPrimitive,
	ItemText as SelectItemTextPrimitive,
	Label as SelectLabelPrimitive,
	Portal as SelectPortalPrimitive,
	Root as SelectRootPrimitive,
	ScrollDownButton as SelectScrollDownButtonPrimitive,
	ScrollUpButton as SelectScrollUpButtonPrimitive,
	Separator as SelectSeparatorPrimitive,
	Trigger as SelectTriggerPrimitive,
	Value as SelectValuePrimitive,
	Viewport as SelectViewportPrimitive,
} from '@radix-ui/react-select'
import { cn } from '@shared/libs/utils'
import type * as React from 'react'
import { useUiCompositeOverride } from '@/shared/libs/ui-registry'

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string
): React.ComponentType<TProps> | undefined {
	return ov[key] as unknown as React.ComponentType<TProps> | undefined
}

function Select(props: React.ComponentProps<typeof SelectRootPrimitive>) {
	const OV = useUiCompositeOverride('Select')
	const Override = getOverride<
		React.ComponentProps<typeof SelectRootPrimitive>
	>(OV as unknown as Record<string, unknown>, 'Select')
	if (Override) {
		return <Override {...props} />
	}
	return <SelectRootPrimitive {...props} />
}

const SelectGroup = SelectGroupPrimitive

const SelectValue = SelectValuePrimitive

const SelectTrigger = ({
	className,
	children,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectTriggerPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectTriggerPrimitive> | null>
}) => {
	const OV = useUiCompositeOverride('Select')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof SelectTriggerPrimitive>
	>(OV as unknown as Record<string, unknown>, 'SelectTrigger')
	if (Override) {
		return (
			<Override className={className} {...props}>
				{children}
			</Override>
		)
	}
	return (
		<SelectTriggerPrimitive
			className={cn(
				'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-start text-foreground text-sm shadow-black/5 shadow-sm focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground/70 [&>span]:min-w-0',
				className
			)}
			ref={ref}
			{...props}
		>
			{children}
			<SelectIconPrimitive asChild>
				<ChevronDownIcon
					className="shrink-0 text-muted-foreground/80"
					height={16}
					width={16}
				/>
			</SelectIconPrimitive>
		</SelectTriggerPrimitive>
	)
}
SelectTrigger.displayName = SelectTriggerPrimitive.displayName

const SelectScrollUpButton = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectScrollUpButtonPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof SelectScrollUpButtonPrimitive
	> | null>
}) => (
	<SelectScrollUpButtonPrimitive
		className={cn(
			'flex cursor-default items-center justify-center py-1',
			className
		)}
		ref={ref}
		{...props}
	>
		<ChevronUpIcon height={16} width={16} />
	</SelectScrollUpButtonPrimitive>
)
SelectScrollUpButton.displayName = SelectScrollUpButtonPrimitive.displayName

const SelectScrollDownButton = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectScrollDownButtonPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof SelectScrollDownButtonPrimitive
	> | null>
}) => (
	<SelectScrollDownButtonPrimitive
		className={cn(
			'flex cursor-default items-center justify-center py-1',
			className
		)}
		ref={ref}
		{...props}
	>
		<ChevronDownIcon height={16} width={16} />
	</SelectScrollDownButtonPrimitive>
)
SelectScrollDownButton.displayName = SelectScrollDownButtonPrimitive.displayName

const SelectContent = ({
	className,
	children,
	position = 'popper',
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectContentPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectContentPrimitive> | null>
}) => {
	const OV = useUiCompositeOverride('Select')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof SelectContentPrimitive>
	>(OV as unknown as Record<string, unknown>, 'SelectContent')
	if (Override) {
		return (
			<SelectPortalPrimitive>
				<Override className={className} {...props} />
			</SelectPortalPrimitive>
		)
	}
	return (
		<SelectPortalPrimitive>
			<SelectContentPrimitive
				className={cn(
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-lg border border-input bg-popover text-popover-foreground shadow-black/5 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in [&_[role=group]]:py-1',
					position === 'popper' &&
						'data-[side=left]:-translate-x-1 data-[side=top]:-translate-y-1 w-full min-w-[var(--radix-select-trigger-width)] data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1',
					className
				)}
				position={position}
				ref={ref}
				{...props}
				style={{
					zIndex: 'var(--z-select)',
					...(props as { style?: React.CSSProperties }).style,
				}}
			>
				<SelectScrollUpButton />
				<SelectViewportPrimitive
					className={cn(
						'p-1',
						position === 'popper' && 'h-[var(--radix-select-trigger-height)]'
					)}
				>
					{children}
				</SelectViewportPrimitive>
				<SelectScrollDownButton />
			</SelectContentPrimitive>
		</SelectPortalPrimitive>
	)
}
SelectContent.displayName = SelectContentPrimitive.displayName

const SelectLabel = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectLabelPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectLabelPrimitive> | null>
}) => (
	<SelectLabelPrimitive
		className={cn(
			'py-1.5 ps-8 pe-2 font-medium text-muted-foreground text-xs',
			className
		)}
		ref={ref}
		{...props}
	/>
)
SelectLabel.displayName = SelectLabelPrimitive.displayName

const SelectItem = ({
	className,
	children,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectItemPrimitive> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectItemPrimitive> | null>
}) => (
	<SelectItemPrimitive
		className={cn(
			'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 ps-8 pe-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className
		)}
		ref={ref}
		{...props}
	>
		<span className="absolute start-2 flex size-3.5 items-center justify-center">
			<SelectItemIndicatorPrimitive>
				<CheckIcon height={16} width={16} />
			</SelectItemIndicatorPrimitive>
		</span>

		<SelectItemTextPrimitive>{children}</SelectItemTextPrimitive>
	</SelectItemPrimitive>
)
SelectItem.displayName = SelectItemPrimitive.displayName

const SelectSeparator = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectSeparatorPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof SelectSeparatorPrimitive
	> | null>
}) => (
	<SelectSeparatorPrimitive
		className={cn('-mx-1 my-1 h-px bg-border', className)}
		ref={ref}
		{...props}
	/>
)
SelectSeparator.displayName = SelectSeparatorPrimitive.displayName

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
}
