'use client'

import { cn } from '@shared/libs/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import {
	type MotionProps,
	type MotionStyle,
	type MotionValue,
	motion,
	useMotionValue,
	useSpring,
	useTransform,
} from 'motion/react'
import React, {
	type PropsWithChildren,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react'

export interface DockProps extends VariantProps<typeof dockVariants> {
	className?: string
	iconSize?: number
	iconMagnification?: number
	iconDistance?: number
	direction?: 'top' | 'middle' | 'bottom'
	children: ReactNode
	style?: React.CSSProperties
}

const DEFAULT_SIZE = 26 // smaller base for mobile; per-icon can override
const DEFAULT_MAGNIFICATION = 40
const DEFAULT_DISTANCE = 120

const dockVariants = cva(
	'mx-auto flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-2xl border px-2 py-1 backdrop-blur-md supports-backdrop-blur:bg-white/10 sm:h-10 sm:gap-2 md:h-12 supports-backdrop-blur:dark:bg-black/10'
)

const Dock = ({
	className,
	children,
	iconSize = DEFAULT_SIZE,
	iconMagnification = DEFAULT_MAGNIFICATION,
	iconDistance = DEFAULT_DISTANCE,
	direction = 'middle',
	style,
	ref,
	...props
}: DockProps & { ref?: RefObject<HTMLDivElement | null> }) => {
	const mouseX = useMotionValue(Number.POSITIVE_INFINITY)

	// REM-based sizing: derive px from root font-size and viewport
	const DEFAULT_ROOT_FONT_SIZE_PX = 16
	const SMALL_VIEWPORT_BREAKPOINT_PX = 640

	const [rootPx, setRootPx] = useState<number>(DEFAULT_ROOT_FONT_SIZE_PX)
	const [isSmall, setIsSmall] = useState<boolean>(true)
	useEffect(() => {
		const recompute = () => {
			try {
				const px = Number.parseFloat(
					getComputedStyle(document.documentElement).fontSize ||
						String(DEFAULT_ROOT_FONT_SIZE_PX)
				)
				setRootPx(Number.isFinite(px) ? px : DEFAULT_ROOT_FONT_SIZE_PX)
				setIsSmall(window.innerWidth < SMALL_VIEWPORT_BREAKPOINT_PX)
			} catch {
				// Font size computation failed - use default values
			}
		}
		recompute()
		window.addEventListener('resize', recompute)
		try {
			;(
				window as unknown as { visualViewport?: VisualViewport }
			).visualViewport?.addEventListener?.('resize', recompute as EventListener)
		} catch {
			// Visual viewport listener setup failed - continue without it
		}
		window.addEventListener('orientationchange', recompute)
		return () => {
			window.removeEventListener('resize', recompute)
			try {
				;(
					window as unknown as { visualViewport?: VisualViewport }
				).visualViewport?.removeEventListener?.(
					'resize',
					recompute as EventListener
				)
			} catch {
				// Visual viewport listener cleanup failed - continue cleanup
			}
			window.removeEventListener('orientationchange', recompute)
		}
	}, [])

	// If consumer didn't override sizing, use REM-based defaults per breakpoint
	const autoSizing =
		iconSize === DEFAULT_SIZE &&
		iconMagnification === DEFAULT_MAGNIFICATION &&
		iconDistance === DEFAULT_DISTANCE

	// REM-based sizing constants
	const BASE_REM_SMALL = 1.15
	const BASE_REM_LARGE = 1.35
	const MAG_REM_SMALL = 1.6
	const MAG_REM_LARGE = 1.9
	const DIST_REM_SMALL = 5.5
	const DIST_REM_LARGE = 7

	const baseRem = isSmall ? BASE_REM_SMALL : BASE_REM_LARGE // icon base height in rem
	const magRem = isSmall ? MAG_REM_SMALL : MAG_REM_LARGE // magnified height in rem
	const distRem = isSmall ? DIST_REM_SMALL : DIST_REM_LARGE // mouse influence distance in rem

	const effIconSize = autoSizing ? Math.round(baseRem * rootPx) : iconSize
	const effIconMagnification = autoSizing
		? Math.round(magRem * rootPx)
		: iconMagnification
	const effIconDistance = autoSizing
		? Math.round(distRem * rootPx)
		: iconDistance

	const renderChildren = () => {
		return React.Children.map(children, (child) => {
			if (
				React.isValidElement<DockIconProps>(child) &&
				child.type === DockIcon
			) {
				// Allow per-icon overrides while providing Dock-level defaults
				return React.cloneElement(child, {
					...child.props,
					mouseX,
					size: (child.props as DockIconProps).size ?? effIconSize,
					magnification:
						(child.props as DockIconProps).magnification ??
						effIconMagnification,
					distance: (child.props as DockIconProps).distance ?? effIconDistance,
				})
			}
			return child
		})
	}

	return (
		<motion.div
			onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
			onMouseMove={(e) => mouseX.set(e.pageX)}
			ref={ref}
			{...props}
			className={cn(dockVariants(), className, {
				'items-start': direction === 'top',
				'items-center': direction === 'middle',
				'items-end': direction === 'bottom',
			})}
			style={
				{
					...(style as MotionStyle | undefined),
					// Ensure content doesn't wrap and stays contained
					flexWrap: 'nowrap',
				} as MotionStyle
			}
			// Do not apply layout containment globally; we scope behaviors in drawer-specific layouts
		>
			{renderChildren()}
		</motion.div>
	)
}

Dock.displayName = 'Dock'

export interface DockIconProps
	extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, 'children'> {
	size?: number
	magnification?: number
	distance?: number
	mouseX?: MotionValue<number>
	className?: string
	children?: React.ReactNode
	props?: PropsWithChildren
	widthScale?: number
	paddingPx?: number
}

const DockIcon = ({
	size = DEFAULT_SIZE,
	magnification = DEFAULT_MAGNIFICATION,
	distance = DEFAULT_DISTANCE,
	mouseX,
	className,
	children,
	widthScale = 1,
	paddingPx,
	...props
}: DockIconProps) => {
	const ref = useRef<HTMLDivElement>(null)
	const MIN_PADDING_PX = 6
	const PADDING_SIZE_RATIO = 0.2
	const padding =
		paddingPx ?? Math.max(MIN_PADDING_PX, size * PADDING_SIZE_RATIO)
	const defaultMouseX = useMotionValue(Number.POSITIVE_INFINITY)

	const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
		const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
		return val - bounds.x - bounds.width / 2
	})

	const sizeTransform = useTransform(
		distanceCalc,
		[-distance, 0, distance],
		[size, magnification, size]
	)

	// Allow rectangular width while keeping height controlled by sizeTransform
	const widthTransform = useTransform(
		distanceCalc,
		[-distance, 0, distance],
		[size * widthScale, magnification * widthScale, size * widthScale]
	)

	const scaleSize = useSpring(sizeTransform, {
		mass: 0.1,
		stiffness: 150,
		damping: 12,
	})

	const scaleWidth = useSpring(widthTransform, {
		mass: 0.1,
		stiffness: 150,
		damping: 12,
	})

	return (
		<motion.div
			className={cn(
				'relative flex cursor-pointer items-center justify-center rounded-full',
				widthScale === 1 ? 'aspect-square' : '',
				'shrink-0', // Prevent icons from shrinking below their size
				className
			)}
			ref={ref}
			style={{
				width: scaleWidth,
				height: scaleSize,
				padding,
				flexShrink: 0, // Ensure icons don't shrink
				minWidth: 0, // Allow flex to work properly
				minHeight: 0,
			}}
			{...props}
		>
			{children}
		</motion.div>
	)
}

DockIcon.displayName = 'DockIcon'

export { Dock, DockIcon, dockVariants }
