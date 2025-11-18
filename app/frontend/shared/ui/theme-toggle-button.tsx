'use client'

import { i18n } from '@shared/libs/i18n'
import { toastService } from '@shared/libs/toast'
import { Button } from '@ui/button'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import React from 'react'
import { useLanguageStore } from '@/infrastructure/store/app-store'

import {
	type AnimationStart,
	type AnimationVariant,
	createAnimation,
} from './theme-animations'

const THEME_CHANGE_TOAST_DURATION_MS = 1500

type ThemeToggleAnimationProps = {
	variant?: AnimationVariant
	start?: AnimationStart
	showLabel?: boolean
	url?: string
}

export default function ThemeToggleButton({
	variant = 'circle-blur',
	start = 'top-left',
	showLabel = false,
	url = '',
}: ThemeToggleAnimationProps) {
	const { theme, setTheme } = useTheme()
	const { isLocalized } = useLanguageStore()

	const styleId = 'theme-transition-styles'

	const updateStyles = React.useCallback((css: string, _name: string) => {
		if (typeof window === 'undefined') {
			return
		}

		let styleElement = document.getElementById(styleId) as HTMLStyleElement

		if (!styleElement) {
			styleElement = document.createElement('style')
			styleElement.id = styleId
			document.head.appendChild(styleElement)
		}

		styleElement.textContent = css
	}, [])

	const toggleTheme = React.useCallback(() => {
		const animation = createAnimation(variant, start, url)

		updateStyles(animation.css, animation.name)

		if (typeof window === 'undefined') {
			return
		}

		const switchTheme = () => {
			const next = theme === 'light' ? 'dark' : 'light'
			setTheme(next)
			try {
				const title = i18n.getMessage('theme_changed', isLocalized)
				const desc =
					next === 'dark'
						? i18n.getMessage('theme_mode_dark', isLocalized)
						: i18n.getMessage('theme_mode_light', isLocalized)
				toastService.info(title, desc, THEME_CHANGE_TOAST_DURATION_MS)
			} catch {
				// Ignore errors when showing theme change toast notification
			}
		}

		if (!document.startViewTransition) {
			switchTheme()
			return
		}

		document.startViewTransition(switchTheme)
	}, [theme, setTheme, isLocalized, start, updateStyles, url, variant])

	const handleButtonPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			// Prevent popover from interpreting this as an outside interaction
			e.stopPropagation()
		},
		[]
	)

	const handleClick = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			// Avoid closing surrounding popovers/menus on rapid successive clicks
			e.preventDefault()
			e.stopPropagation()
			toggleTheme()
		},
		[toggleTheme]
	)

	return (
		<Button
			className="group relative h-9 w-9 p-0"
			name="Theme Toggle Button"
			onClick={handleClick}
			onPointerDown={handleButtonPointerDown}
			size="icon"
			variant="ghost"
		>
			<SunIcon className="dark:-rotate-90 size-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
			<MoonIcon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Theme Toggle </span>
			{showLabel && (
				<>
					<span className="-top-10 absolute hidden rounded-full border px-2 group-hover:block">
						{' '}
						variant = {variant}
					</span>
					<span className="-bottom-10 absolute hidden rounded-full border px-2 group-hover:block">
						{' '}
						start = {start}
					</span>
				</>
			)}
		</Button>
	)
}
