import { motion } from 'framer-motion'
import {
	WORD_BAR_ACTIVE_DURATION_S,
	WORD_BAR_INACTIVE_DURATION_S,
	WORD_LABEL_EXIT_OFFSET_PX,
	WORD_LABEL_FADE_DURATION_S,
	WORD_LABEL_RAISE_OFFSET_PX,
} from '../../dashboard/constants'

export type WordCustomBarProps = {
	fill?: string
	x?: number
	y?: number
	width?: number
	height?: number
	index?: number
	activeIndex?: number | null
	value?: number | string
	setActiveIndex?: (index: number | null) => void
}

/**
 * Monochrome custom bar shape for Most Common Words chart
 * Provides animated bar with expand/collapse behavior on hover
 */
export function WordCustomBar(props: WordCustomBarProps) {
	const {
		fill,
		x,
		y,
		width,
		height,
		index,
		activeIndex,
		value,
		setActiveIndex,
	} = props
	const xPos = Number(x || 0)
	const realWidth = Number(width || 0)
	const isActive = index === activeIndex
	const collapsedWidth = 2
	const barX = isActive ? xPos : xPos + (realWidth - collapsedWidth) / 2
	const textX = xPos + realWidth / 2
	return (
		// biome-ignore lint/a11y/useSemanticElements: SVG g elements use role="button" for accessibility
		<g
			aria-label={`Word bar ${index !== undefined ? index + 1 : 0}, value: ${value}`}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					setActiveIndex?.(index ?? null)
				}
			}}
			onMouseEnter={() => setActiveIndex?.(index ?? null)}
			role="button"
			tabIndex={0}
		>
			<motion.rect
				animate={{ width: isActive ? realWidth : collapsedWidth, x: barX }}
				fill={fill}
				height={height}
				initial={{ width: collapsedWidth, x: barX }}
				transition={{
					duration: isActive
						? WORD_BAR_ACTIVE_DURATION_S
						: WORD_BAR_INACTIVE_DURATION_S,
					type: 'spring',
				}}
				y={y}
			/>
			{isActive && (
				<motion.text
					animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
					className="font-mono text-xs"
					exit={{
						opacity: 0,
						y: WORD_LABEL_EXIT_OFFSET_PX,
						filter: 'blur(3px)',
					}}
					fill={fill}
					initial={{
						opacity: 0,
						y: WORD_LABEL_EXIT_OFFSET_PX,
						filter: 'blur(3px)',
					}}
					key={index}
					textAnchor="middle"
					transition={{ duration: WORD_LABEL_FADE_DURATION_S }}
					x={textX}
					y={Number(y) - WORD_LABEL_RAISE_OFFSET_PX}
				>
					{value}
				</motion.text>
			)}
		</g>
	)
}
