'use client'

import dynamic from 'next/dynamic'
import React, {
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { i18n } from '@/shared/libs/i18n'
import { logger } from '@/shared/libs/logger'

// react-wordcloud uses window; load client-side only
const ReactWordcloud = dynamic(() => import('react-wordcloud'), {
	ssr: false,
}) as React.ComponentType<{
	words: WordItem[]
	callbacks?: Record<string, unknown>
	size?: [number, number]
	options?: Record<string, unknown>
}>

type WordItem = { text: string; value: number }

type WordCloudProps = {
	words: WordItem[]
	isLocalized: boolean
	className?: string
}

const WORD_CLOUD_FONT_SIZE_MIN = 14
const WORD_CLOUD_FONT_SIZE_MAX = 56
const WORD_CLOUD_PADDING = 1
const WORD_CLOUD_ROTATION_COUNT = 2
const WORD_CLOUD_NO_ROTATION_ANGLE = 0
const WORD_CLOUD_NO_ROTATION_ANGLES: [number, number] = [
	WORD_CLOUD_NO_ROTATION_ANGLE,
	WORD_CLOUD_NO_ROTATION_ANGLE,
]
const WORD_CLOUD_TRANSITION_DURATION_MS = 500
const MIN_RENDER_DIMENSION_PX = 10
const MIN_WORD_VALUE = 1

class SafeBoundary extends React.Component<
	PropsWithChildren<{ fallback: React.ReactNode }>,
	{ hasError: boolean }
> {
	constructor(props: PropsWithChildren<{ fallback: React.ReactNode }>) {
		super(props)
		this.state = { hasError: false }
	}
	static getDerivedStateFromError() {
		return { hasError: true }
	}
	componentDidCatch(error: unknown) {
		logger.error('[WordCloudChart] render failed', error)
	}
	render() {
		if (this.state.hasError) {
			return this.props.fallback
		}
		return this.props.children
	}
}

export function WordCloudChart({
	words,
	isLocalized,
	className,
}: WordCloudProps) {
	const options = useMemo(() => {
		const computed = getComputedStyle(document.documentElement)
		const fg = `hsl(${computed.getPropertyValue('--foreground')})`
		const c1 = `hsl(${computed.getPropertyValue('--chart-1')})`
		const c2 = `hsl(${computed.getPropertyValue('--chart-2')})`
		const c3 = `hsl(${computed.getPropertyValue('--chart-3')})`
		const c4 = `hsl(${computed.getPropertyValue('--chart-4')})`
		const c5 = `hsl(${computed.getPropertyValue('--chart-5')})`
		return {
			colors: [c1, c2, c3, c4, c5, fg],
			fontFamily: isLocalized
				? 'IBM Plex Sans Arabic, system-ui, sans-serif'
				: 'Inter, system-ui, sans-serif',
			fontSizes: [WORD_CLOUD_FONT_SIZE_MIN, WORD_CLOUD_FONT_SIZE_MAX] as [
				number,
				number,
			],
			fontStyle: 'normal' as const,
			fontWeight: 'bold' as const,
			padding: WORD_CLOUD_PADDING,
			rotations: WORD_CLOUD_ROTATION_COUNT,
			rotationAngles: WORD_CLOUD_NO_ROTATION_ANGLES,
			scale: 'sqrt' as const,
			spiral: 'rectangular' as const,
			transitionDuration: WORD_CLOUD_TRANSITION_DURATION_MS,
		}
	}, [isLocalized])

	const callbacks = useMemo(
		() => ({
			getWordTooltip: (word: WordItem) => `${word.text}: ${word.value}`,
		}),
		[]
	)

	const sizedWords = useMemo(
		() =>
			(Array.isArray(words) ? words : []).map((w: WordItem | undefined) => ({
				text: String(w?.text ?? ''),
				value: Math.max(MIN_WORD_VALUE, Number(w?.value) || MIN_WORD_VALUE),
			})),
		[words]
	)

	// Render only when container has size to avoid internal lib errors
	const containerRef = useRef<HTMLDivElement | null>(null)
	const [canRender, setCanRender] = useState(false)
	useEffect(() => {
		const el = containerRef.current
		if (!el) {
			return
		}
		const update = () => {
			const rect = el.getBoundingClientRect()
			setCanRender(
				rect.width > MIN_RENDER_DIMENSION_PX &&
					rect.height > MIN_RENDER_DIMENSION_PX
			)
		}
		update()
		// Use requestAnimationFrame to prevent ResizeObserver loop errors
		const ro = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				update()
			})
		})
		ro.observe(el)
		return () => ro.disconnect()
	}, [])

	const noData = (
		<div className="flex h-[18.75rem] items-center justify-center text-muted-foreground text-sm">
			{i18n.getMessage('chart_no_data', isLocalized)}
		</div>
	)

	return (
		<div className={className} ref={containerRef}>
			{ReactWordcloud ? (
				sizedWords.length > 0 && canRender ? (
					<SafeBoundary fallback={noData}>
						<ReactWordcloud
							callbacks={callbacks}
							options={options}
							words={sizedWords}
						/>
					</SafeBoundary>
				) : (
					noData
				)
			) : (
				<div className="flex h-[18.75rem] items-center justify-center text-muted-foreground text-sm">
					{i18n.getMessage('chart_loading', isLocalized)}
				</div>
			)}
		</div>
	)
}
