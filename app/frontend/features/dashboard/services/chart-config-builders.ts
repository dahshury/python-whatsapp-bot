import { i18n } from '@/shared/libs/i18n'
import type { ChartConfig } from '@/shared/ui/chart'

/**
 * Build chart configuration for type distribution chart
 */
export function buildTypeDistributionChartConfig(
	isLocalized: boolean
): ChartConfig {
	return {
		current: {
			label: i18n.getMessage('period_current', isLocalized),
			color: 'hsl(var(--chart-1))',
		},
		previous: {
			label: i18n.getMessage('period_previous', isLocalized),
			color: 'hsl(var(--chart-2))',
		},
	}
}

/**
 * Build chart configuration for time slots chart
 */
export function buildTimeSlotsChartConfig(isLocalized: boolean): ChartConfig {
	return {
		count: {
			label: i18n.getMessage('dashboard_reservations', isLocalized),
			color: 'hsl(var(--chart-1))',
		},
	}
}

/**
 * Build chart configuration for weekly activity chart
 */
export function buildWeeklyActivityChartConfig(
	isLocalized: boolean
): ChartConfig {
	return {
		reservations: {
			label: i18n.getMessage('dashboard_reservations', isLocalized),
			color: 'hsl(var(--chart-1))',
		},
		cancellations: {
			label: i18n.getMessage('kpi_cancellations', isLocalized),
			color: 'hsl(var(--chart-2))',
		},
	}
}
