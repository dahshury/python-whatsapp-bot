'use client'

import {
	Fallback as AvatarFallbackPrimitive,
	Image as AvatarImagePrimitive,
	Root as AvatarRootPrimitive,
} from '@radix-ui/react-avatar'
import type { ComponentPropsWithoutRef, ComponentRef, RefObject } from 'react'

import { cn } from '@/shared/libs/utils'

const Avatar = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof AvatarRootPrimitive> & {
	ref?: RefObject<ComponentRef<typeof AvatarRootPrimitive> | null>
}) => (
	<AvatarRootPrimitive
		className={cn(
			'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
			className
		)}
		ref={ref}
		{...props}
	/>
)

Avatar.displayName = AvatarRootPrimitive.displayName

const AvatarImage = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof AvatarImagePrimitive> & {
	ref?: RefObject<ComponentRef<typeof AvatarImagePrimitive> | null>
}) => (
	<AvatarImagePrimitive
		className={cn('aspect-square h-full w-full', className)}
		ref={ref}
		{...props}
	/>
)

AvatarImage.displayName = AvatarImagePrimitive.displayName

const AvatarFallback = ({
	className,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof AvatarFallbackPrimitive> & {
	ref?: RefObject<ComponentRef<typeof AvatarFallbackPrimitive> | null>
}) => (
	<AvatarFallbackPrimitive
		className={cn(
			'flex h-full w-full items-center justify-center rounded-full bg-muted',
			className
		)}
		ref={ref}
		{...props}
	/>
)

AvatarFallback.displayName = AvatarFallbackPrimitive.displayName

export { Avatar, AvatarImage, AvatarFallback }
