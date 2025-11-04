'use client'

import { cn } from '@shared/libs/utils'
import { animate } from 'motion/react'
import type React from 'react'
import { memo, useCallback, useEffect, useRef } from 'react'

type GlowingEffectProps = {
	blur?: number
	inactiveZone?: number
	proximity?: number
	spread?: number
	variant?: 'default' | 'white'
	glow?: boolean
	className?: string
	disabled?: boolean
	movementDuration?: number
	borderWidth?: number
}

const GlowingEffect = memo(
	({
		blur = 0,
		inactiveZone = 0.7,
		proximity = 0,
		spread = 20,
		variant = 'default',
		glow = false,
		className,
		movementDuration = 2,
		borderWidth = 1,
		disabled = true,
	}: GlowingEffectProps) => {
		const containerRef = useRef<HTMLDivElement>(null)
		const lastPosition = useRef({ x: 0, y: 0 })
		const animationFrameRef = useRef<number>(0)

		const handleMove = useCallback(
			(e?: MouseEvent | { x: number; y: number }) => {
				if (!containerRef.current) {
					return
				}

				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current)
				}

				animationFrameRef.current = requestAnimationFrame(() => {
					const element = containerRef.current
					if (!element) {
						return
					}

					const { left, top, width, height } = element.getBoundingClientRect()
					const mouseX = e?.x ?? lastPosition.current.x
					const mouseY = e?.y ?? lastPosition.current.y

					if (e) {
						lastPosition.current = { x: mouseX, y: mouseY }
					}

					const CENTER_MULTIPLIER = 0.5
					const center = [
						left + width * CENTER_MULTIPLIER,
						top + height * CENTER_MULTIPLIER,
					]
					const distanceFromCenter = Math.hypot(
						mouseX - (center[0] ?? 0),
						mouseY - (center[1] ?? 0)
					)
					const INACTIVE_RADIUS_MULTIPLIER = 0.5
					const inactiveRadius =
						INACTIVE_RADIUS_MULTIPLIER * Math.min(width, height) * inactiveZone

					if (distanceFromCenter < inactiveRadius) {
						element.style.setProperty('--active', '0')
						return
					}

					const isActive =
						mouseX > left - proximity &&
						mouseX < left + width + proximity &&
						mouseY > top - proximity &&
						mouseY < top + height + proximity

					element.style.setProperty('--active', isActive ? '1' : '0')

					if (!isActive) {
						return
					}

					const currentAngle =
						Number.parseFloat(element.style.getPropertyValue('--start')) || 0
					// Angle calculation constants
					const DEGREES_IN_HALF_CIRCLE = 180
					const DEGREES_IN_FULL_CIRCLE = 360
					const ANGLE_OFFSET_DEGREES = 90

					const targetAngle =
						(DEGREES_IN_HALF_CIRCLE *
							Math.atan2(
								mouseY - (center[1] ?? 0),
								mouseX - (center[0] ?? 0)
							)) /
							Math.PI +
						ANGLE_OFFSET_DEGREES

					const angleDiff =
						((targetAngle - currentAngle + DEGREES_IN_HALF_CIRCLE) %
							DEGREES_IN_FULL_CIRCLE) -
						DEGREES_IN_HALF_CIRCLE
					const newAngle = currentAngle + angleDiff

					animate(currentAngle, newAngle, {
						duration: movementDuration,
						ease: (() => {
							// Cubic bezier curve values for smooth easing
							const CUBIC_BEZIER_X1 = 0.16
							const CUBIC_BEZIER_Y1 = 1
							const CUBIC_BEZIER_X2 = 0.3
							const CUBIC_BEZIER_Y2 = 1
							return [
								CUBIC_BEZIER_X1,
								CUBIC_BEZIER_Y1,
								CUBIC_BEZIER_X2,
								CUBIC_BEZIER_Y2,
							]
						})(),
						onUpdate: (value) => {
							element.style.setProperty('--start', String(value))
						},
					})
				})
			},
			[inactiveZone, proximity, movementDuration]
		)

		useEffect(() => {
			if (disabled) {
				return
			}

			const handleScroll = () => handleMove()
			const handlePointerMove = (e: PointerEvent) => handleMove(e)

			window.addEventListener('scroll', handleScroll, { passive: true })
			document.body.addEventListener('pointermove', handlePointerMove, {
				passive: true,
			})

			return () => {
				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current)
				}
				window.removeEventListener('scroll', handleScroll)
				document.body.removeEventListener('pointermove', handlePointerMove)
			}
		}, [handleMove, disabled])

		return (
			<>
				<div
					className={cn(
						'-inset-px pointer-events-none absolute hidden rounded-[inherit] border opacity-0 transition-opacity',
						glow && 'opacity-100',
						variant === 'white' && 'border-white',
						disabled && '!block'
					)}
				/>
				<div
					className={cn(
						'pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity',
						glow && 'opacity-100',
						blur > 0 && 'blur-[var(--blur)]',
						className,
						disabled && '!hidden'
					)}
					ref={containerRef}
					style={
						{
							'--blur': `${blur}px`,
							'--spread': spread,
							'--start': '0',
							'--active': '0',
							'--glowingeffect-border-width': `${borderWidth}px`,
							'--repeating-conic-gradient-times': '5',
							'--gradient':
								variant === 'white'
									? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
									: `radial-gradient(circle, #dd7bbb 10%, #dd7bbb00 20%),
                radial-gradient(circle at 40% 40%, #d79f1e 5%, #d79f1e00 15%),
                radial-gradient(circle at 60% 60%, #5a922c 10%, #5a922c00 20%), 
                radial-gradient(circle at 40% 60%, #4c7894 10%, #4c789400 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #dd7bbb 0%,
                  #d79f1e calc(25% / var(--repeating-conic-gradient-times)),
                  #5a922c calc(50% / var(--repeating-conic-gradient-times)), 
                  #4c7894 calc(75% / var(--repeating-conic-gradient-times)),
                  #dd7bbb calc(100% / var(--repeating-conic-gradient-times))
                )`,
						} as React.CSSProperties
					}
				>
					<div
						className={cn(
							'glow',
							'rounded-[inherit]',
							'after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-[""]',
							'after:[border:var(--glowingeffect-border-width)_solid_transparent]',
							'after:[background-attachment:fixed] after:[background:var(--gradient)]',
							'after:opacity-[var(--active)] after:transition-opacity after:duration-300',
							'after:[mask-clip:padding-box,border-box]',
							'after:[mask-composite:intersect]',
							'after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]'
						)}
					/>
				</div>
			</>
		)
	}
)

GlowingEffect.displayName = 'GlowingEffect'

export { GlowingEffect }
