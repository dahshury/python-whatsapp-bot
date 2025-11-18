import {
	Content as NavigationMenuContentPrimitive,
	Indicator as NavigationMenuIndicatorPrimitive,
	Item as NavigationMenuItemPrimitive,
	Link as NavigationMenuLinkPrimitive,
	List as NavigationMenuListPrimitive,
	Root as NavigationMenuRootPrimitive,
	Trigger as NavigationMenuTriggerPrimitive,
	Viewport as NavigationMenuViewportPrimitive,
} from '@radix-ui/react-navigation-menu'
import { cn } from '@shared/libs/utils'
import { cva } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import type * as React from 'react'
import { useUiCompositeOverride } from '@/shared/libs/ui-registry'

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string
): React.ComponentType<TProps> | undefined {
	return ov[key] as unknown as React.ComponentType<TProps> | undefined
}

const NavigationMenu = ({
	className,
	children,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuRootPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof NavigationMenuRootPrimitive
	> | null>
}) => {
	const OV = useUiCompositeOverride('NavigationMenu')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof NavigationMenuRootPrimitive>
	>(OV, 'NavigationMenu')
	if (Override) {
		return (
			<Override className={className} {...props}>
				{children}
			</Override>
		)
	}
	return (
		<NavigationMenuRootPrimitive
			className={cn(
				'relative z-10 flex max-w-max flex-1 items-center justify-center',
				className
			)}
			ref={ref}
			{...props}
		>
			{children}
			<NavigationMenuViewport />
		</NavigationMenuRootPrimitive>
	)
}
NavigationMenu.displayName = NavigationMenuRootPrimitive.displayName

const NavigationMenuList = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuListPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof NavigationMenuListPrimitive
	> | null>
}) => (
	<NavigationMenuListPrimitive
		className={cn(
			'group flex flex-1 list-none items-center justify-center space-x-1',
			className
		)}
		ref={ref}
		{...props}
	/>
)
NavigationMenuList.displayName = NavigationMenuListPrimitive.displayName

const NavigationMenuItem = NavigationMenuItemPrimitive

const navigationMenuTriggerStyle = cva(
	'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50'
)

const NavigationMenuTrigger = ({
	className,
	children,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuTriggerPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof NavigationMenuTriggerPrimitive
	> | null>
}) => {
	const OV = useUiCompositeOverride('NavigationMenu')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof NavigationMenuTriggerPrimitive>
	>(OV, 'NavigationMenuTrigger')
	if (Override) {
		return (
			<Override className={className} {...props}>
				{children}
			</Override>
		)
	}
	return (
		<NavigationMenuTriggerPrimitive
			className={cn(navigationMenuTriggerStyle(), 'group', className)}
			ref={ref}
			{...props}
		>
			{children}{' '}
			<ChevronDown
				aria-hidden="true"
				className="relative top-[0.0625rem] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
			/>
		</NavigationMenuTriggerPrimitive>
	)
}
NavigationMenuTrigger.displayName = NavigationMenuTriggerPrimitive.displayName

const NavigationMenuContent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuContentPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof NavigationMenuContentPrimitive
	> | null>
}) => {
	const OV = useUiCompositeOverride('NavigationMenu')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof NavigationMenuContentPrimitive>
	>(OV, 'NavigationMenuContent')
	if (Override) {
		return <Override className={className} {...props} />
	}
	return (
		<NavigationMenuContentPrimitive
			className={cn(
				'data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out md:absolute md:w-auto',
				className
			)}
			ref={ref}
			{...props}
		/>
	)
}
NavigationMenuContent.displayName = NavigationMenuContentPrimitive.displayName

const NavigationMenuLink = NavigationMenuLinkPrimitive

const NavigationMenuViewport = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuViewportPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof NavigationMenuViewportPrimitive
	> | null>
}) => {
	const OV = useUiCompositeOverride('NavigationMenu')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof NavigationMenuViewportPrimitive>
	>(OV, 'NavigationMenuViewport')
	if (Override) {
		return <Override className={className} {...props} />
	}
	return (
		<div className={cn('absolute top-full left-0 flex justify-center')}>
			<NavigationMenuViewportPrimitive
				className={cn(
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top-center overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in md:w-[var(--radix-navigation-menu-viewport-width)]',
					className
				)}
				ref={ref}
				{...props}
			/>
		</div>
	)
}
NavigationMenuViewport.displayName = NavigationMenuViewportPrimitive.displayName

const NavigationMenuIndicator = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuIndicatorPrimitive> & {
	ref?: React.RefObject<React.ElementRef<
		typeof NavigationMenuIndicatorPrimitive
	> | null>
}) => {
	const OV = useUiCompositeOverride('NavigationMenu')
	const Override = getOverride<
		React.ComponentPropsWithoutRef<typeof NavigationMenuIndicatorPrimitive>
	>(OV, 'NavigationMenuIndicator')
	if (Override) {
		return <Override className={className} {...props} />
	}
	return (
		<NavigationMenuIndicatorPrimitive
			className={cn(
				'data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=visible]:animate-in',
				className
			)}
			ref={ref}
			style={{ zIndex: 'var(--z-navigation-indicator)' }}
			{...props}
		>
			<div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
		</NavigationMenuIndicatorPrimitive>
	)
}
NavigationMenuIndicator.displayName =
	NavigationMenuIndicatorPrimitive.displayName

export {
	navigationMenuTriggerStyle,
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuContent,
	NavigationMenuTrigger,
	NavigationMenuLink,
	NavigationMenuIndicator,
	NavigationMenuViewport,
}
