import {
	ACTIVE_BAR_OPACITY,
	INACTIVE_BAR_OPACITY,
} from '@/features/dashboard/utils/chart-constants'
import type { useThemeColors } from '@/shared/libs/hooks/use-theme-colors'

/**
 * Get bar fill opacity based on active index
 */
export function getBarFillOpacity(
	activeIndex: number | null,
	index: number
): number {
	return activeIndex === null || activeIndex === index
		? ACTIVE_BAR_OPACITY
		: INACTIVE_BAR_OPACITY
}

/**
 * Get chart colors array from theme colors
 */
export function getChartColors(themeColors: ReturnType<typeof useThemeColors>) {
	return [
		themeColors.primary,
		themeColors.secondary,
		themeColors.tertiary,
		themeColors.quaternary,
		themeColors.quinary,
		themeColors.primary,
		themeColors.secondary,
		themeColors.tertiary,
		themeColors.quaternary,
		themeColors.quinary,
	]
}

/**
 * Get tooltip style from theme colors
 */
export function getTooltipStyle(
	themeColors: ReturnType<typeof useThemeColors>
) {
	return {
		backgroundColor: themeColors.card,
		border: `1px solid ${themeColors.border}`,
		borderRadius: '8px',
		fontSize: '12px',
		color: themeColors.foreground,
	}
}
