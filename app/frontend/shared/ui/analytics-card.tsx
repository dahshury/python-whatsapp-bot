'use client'

import { motion } from 'framer-motion'
import type * as React from 'react'

import { cn } from '@/shared/libs/utils'

// --- PROPS INTERFACE ---
// Defines the shape of data required by the component for type safety and clarity.
export type AnalyticsCardProps = {
	title: string
	totalAmount: string
	icon: React.ReactNode
	data: {
		label: string
		value: number
		successValue?: number
		maxValue?: number // Optional max value for scaling bars (defaults to 100)
	}[]
	className?: string
}

/**
 * A responsive and theme-adaptive card for displaying analytics with an animated bar chart.
 * Built with TypeScript, Tailwind CSS, and Framer Motion.
 */
const PERCENT_MAX = 100
const PERCENT_MIN = 0
const PERCENT_MULTIPLIER = 100
const GRID_ITEMS_THRESHOLD_4 = 4
const GRID_ITEMS_THRESHOLD_3 = 3
const GRID_ITEMS_THRESHOLD_2 = 2
const DEFAULT_MAX_VALUE = 100
const ANIMATION_DURATION_SECONDS = 0.8
const ANIMATION_DELAY_INCREMENT_SECONDS = 0.1
const SUCCESS_ANIMATION_DELAY_OFFSET_SECONDS = 0.2
const DECIMAL_PLACES = 0
// Cubic Bezier easing function for smooth animation curves
// Values represent a smooth easing curve with control points at (0.22, 1) and (0.36, 1)
const EASE_CURVE_CP1_X = 0.22
const EASE_CURVE_CP1_Y = 1
const EASE_CURVE_CP2_X = 0.36
const EASE_CURVE_CP2_Y = 1
const ANIMATION_EASE_CURVE = [
	EASE_CURVE_CP1_X,
	EASE_CURVE_CP1_Y,
	EASE_CURVE_CP2_X,
	EASE_CURVE_CP2_Y,
] as const

const clampPercent = (value?: number) => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return PERCENT_MIN
	}
	return Math.min(PERCENT_MAX, Math.max(PERCENT_MIN, value))
}

const getGridColumnsClass = (itemsCount: number) => {
	if (itemsCount >= GRID_ITEMS_THRESHOLD_4) {
		return 'grid-cols-2 sm:grid-cols-4'
	}
	if (itemsCount === GRID_ITEMS_THRESHOLD_3) {
		return 'grid-cols-1 sm:grid-cols-3'
	}
	if (itemsCount === GRID_ITEMS_THRESHOLD_2) {
		return 'grid-cols-1 sm:grid-cols-2'
	}
	return 'grid-cols-1'
}

export const AnalyticsCard = ({
	title,
	totalAmount,
	icon,
	data = [],
	className,
	isLocalized = false,
}: AnalyticsCardProps & { isLocalized?: boolean }) => {
	const locale = isLocalized ? 'ar-SA' : 'en-US'
	return (
		<div
			className={cn(
				'w-full rounded-2xl border bg-card p-6 text-card-foreground shadow-sm',
				className
			)}
		>
			{/* --- CARD HEADER --- */}
			<div className="flex items-start justify-between">
				<h3 className="font-medium text-lg text-muted-foreground">{title}</h3>
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
					{icon}
				</div>
			</div>

			{/* --- MAIN VALUE --- */}
			<div className="my-4">
				<h2 className="font-bold text-4xl tracking-tight">{totalAmount}</h2>
			</div>

			{/* --- ANIMATED BAR CHART --- */}
			<section
				aria-label="Analytics chart"
				className={cn('grid gap-4', getGridColumnsClass(data.length || 1))}
			>
				{data.map((item, index) => {
					const maxValue = item.maxValue ?? DEFAULT_MAX_VALUE
					const normalizedValue =
						maxValue > PERCENT_MIN
							? (item.value / maxValue) * PERCENT_MULTIPLIER
							: PERCENT_MIN
					const barHeight = clampPercent(normalizedValue)
					const successValue = item.successValue
						? clampPercent(item.successValue)
						: PERCENT_MIN
					// Success height is relative to the bar height, not the normalized value
					const successHeight =
						barHeight > PERCENT_MIN &&
						successValue > PERCENT_MIN &&
						maxValue === DEFAULT_MAX_VALUE
							? Math.min(
									PERCENT_MAX,
									(successValue / item.value) * PERCENT_MULTIPLIER
								)
							: PERCENT_MIN

					// Format display value: if maxValue is 100, show as percentage, otherwise show as number
					const displayValue =
						maxValue === DEFAULT_MAX_VALUE
							? `${item.value.toFixed(DECIMAL_PLACES)}%`
							: item.value.toLocaleString(locale)

					return (
						<div
							className="flex flex-col items-center gap-2 text-center"
							key={`${item.label}-${index}`}
						>
							<div
								aria-label={`${item.label}: ${displayValue}`}
								aria-valuemax={maxValue}
								aria-valuemin={PERCENT_MIN}
								aria-valuenow={item.value}
								className="relative flex h-32 w-full items-end overflow-hidden rounded-lg bg-muted/60"
								role="progressbar"
							>
								<motion.div
									animate={{ height: `${barHeight}%` }}
									className="relative w-full rounded-t-md bg-primary/40 p-2"
									initial={{ height: '0%' }}
									transition={{
										duration: ANIMATION_DURATION_SECONDS,
										delay: index * ANIMATION_DELAY_INCREMENT_SECONDS,
										ease: ANIMATION_EASE_CURVE,
									}}
								>
									{successValue > PERCENT_MIN && barHeight > PERCENT_MIN && (
										<motion.div
											animate={{ height: `${successHeight}%` }}
											aria-label={`${item.label} success: ${successValue}%`}
											className="absolute right-0 bottom-0 left-0 rounded-t-md bg-chart-1 p-2"
											initial={{ height: '0%' }}
											transition={{
												duration: ANIMATION_DURATION_SECONDS,
												delay:
													index * ANIMATION_DELAY_INCREMENT_SECONDS +
													SUCCESS_ANIMATION_DELAY_OFFSET_SECONDS,
												ease: ANIMATION_EASE_CURVE,
											}}
										>
											<span className="-translate-x-1/2 absolute bottom-2 left-1/2 font-semibold text-white text-xs">
												{successValue.toFixed(DECIMAL_PLACES)}%
											</span>
										</motion.div>
									)}
									<div className="-translate-x-1/2 absolute top-1.5 left-1/2 h-1 w-1/3 rounded-full bg-background/50" />
									<span className="-translate-x-1/2 absolute bottom-2 left-1/2 font-semibold text-primary-foreground text-xs">
										{displayValue}
									</span>
								</motion.div>
							</div>
							<span className="font-medium text-muted-foreground text-sm">
								{item.label}
							</span>
						</div>
					)
				})}
			</section>
		</div>
	)
}
