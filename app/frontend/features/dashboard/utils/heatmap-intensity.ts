import { i18n } from '@shared/libs/i18n'
import {
	HEATMAP_INTENSITY_HIGH_THRESHOLD,
	HEATMAP_INTENSITY_LOW_THRESHOLD,
	HEATMAP_INTENSITY_MEDIUM_THRESHOLD,
	HEATMAP_INTENSITY_VERY_LOW_THRESHOLD,
} from '../dashboard/constants'

/**
 * Get CSS class string for heatmap cell intensity based on count ratio
 * @param count - Message count for the cell
 * @param maxCount - Maximum count across all cells
 * @returns CSS class string for styling
 */
export function getIntensity(count: number, maxCount: number): string {
	const intensity = count / maxCount
	if (intensity === 0) {
		return 'bg-muted/5 border-border/20 text-muted-foreground'
	}
	if (intensity < HEATMAP_INTENSITY_VERY_LOW_THRESHOLD) {
		return 'bg-chart-1/10 border-chart-1/20 text-chart-1'
	}
	if (intensity < HEATMAP_INTENSITY_LOW_THRESHOLD) {
		return 'bg-chart-1/25 border-chart-1/30 text-chart-1'
	}
	if (intensity < HEATMAP_INTENSITY_MEDIUM_THRESHOLD) {
		return 'bg-chart-1/50 border-chart-1/40 text-foreground'
	}
	if (intensity < HEATMAP_INTENSITY_HIGH_THRESHOLD) {
		return 'bg-chart-1/75 border-chart-1/50 text-white'
	}
	return 'bg-chart-1 border-chart-1 text-white'
}

/**
 * Get localized label for heatmap cell intensity level
 * @param count - Message count for the cell
 * @param maxCount - Maximum count across all cells
 * @param isLocalized - Whether to use localized messages
 * @returns Localized intensity label string
 */
export function getIntensityLabel(
	count: number,
	maxCount: number,
	isLocalized: boolean
): string {
	const intensity = count / maxCount
	if (intensity === 0) {
		return i18n.getMessage('msg_no_messages', isLocalized)
	}
	if (intensity < HEATMAP_INTENSITY_VERY_LOW_THRESHOLD) {
		return i18n.getMessage('msg_very_low', isLocalized)
	}
	if (intensity < HEATMAP_INTENSITY_LOW_THRESHOLD) {
		return i18n.getMessage('msg_low', isLocalized)
	}
	if (intensity < HEATMAP_INTENSITY_MEDIUM_THRESHOLD) {
		return i18n.getMessage('msg_medium', isLocalized)
	}
	if (intensity < HEATMAP_INTENSITY_HIGH_THRESHOLD) {
		return i18n.getMessage('msg_high', isLocalized)
	}
	return i18n.getMessage('msg_very_high', isLocalized)
}
