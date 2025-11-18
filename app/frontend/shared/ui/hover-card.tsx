'use client'

import {
	Content as HoverCardContentPrimitive,
	Portal as HoverCardPortalPrimitive,
	Root as HoverCardRootPrimitive,
	Trigger as HoverCardTriggerPrimitive,
} from '@radix-ui/react-hover-card'
import { cn } from '@shared/libs/utils'
import type {
	ComponentProps,
	ComponentPropsWithoutRef,
	ComponentType,
	CSSProperties,
	ElementRef,
	RefObject,
} from 'react'
import { useUiCompositeOverride } from '@/shared/libs/ui-registry'

function HoverCard(props: ComponentProps<typeof HoverCardRootPrimitive>) {
	const OV = useUiCompositeOverride('HoverCard')
	const Override = OV.HoverCard as
		| ComponentType<ComponentProps<typeof HoverCardRootPrimitive>>
		| undefined
	if (Override) {
		return <Override {...props} />
	}
	return <HoverCardRootPrimitive {...props} />
}

function HoverCardTrigger(
	props: ComponentProps<typeof HoverCardTriggerPrimitive>
) {
	const OV = useUiCompositeOverride('HoverCard')
	const Override = OV.HoverCardTrigger as
		| ComponentType<ComponentProps<typeof HoverCardTriggerPrimitive>>
		| undefined
	if (Override) {
		return <Override {...props} />
	}
	return <HoverCardTriggerPrimitive {...props} />
}

const HoverCardContent = ({
	className,
	align = 'center',
	sideOffset = 4,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof HoverCardContentPrimitive> & {
	ref?: RefObject<ElementRef<typeof HoverCardContentPrimitive> | null>
}) => {
	const OV = useUiCompositeOverride('HoverCard')
	const Override = OV.HoverCardContent as
		| ComponentType<ComponentPropsWithoutRef<typeof HoverCardContentPrimitive>>
		| undefined
	if (Override) {
		return (
			<Override
				className={cn(
					'w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none',
					className
				)}
				{...props}
			/>
		)
	}
	return (
		<HoverCardPortalPrimitive>
			<HoverCardContentPrimitive
				align={align}
				className={cn(
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
					className
				)}
				ref={ref}
				sideOffset={sideOffset}
				style={{
					zIndex: 'var(--z-dialog-content-plus-1)',
					...(props as { style?: CSSProperties }).style,
				}}
				{...props}
			/>
		</HoverCardPortalPrimitive>
	)
}
HoverCardContent.displayName = HoverCardContentPrimitive.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
