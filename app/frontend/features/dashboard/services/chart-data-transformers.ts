import type {
	CustomerSegment,
	DayOfWeekData,
	FunnelData,
	MonthlyTrend,
	TimeSlotData,
	TypeDistribution,
} from '@/features/dashboard/types'
import { i18n } from '@/shared/libs/i18n'
import type { ChartConfig } from '@/shared/ui/chart'
import {
	getSlotTypeLabel,
	translateCustomerSegment,
	translateDayName,
	translateFunnelStage,
} from '../utils/translations'

/**
 * Transform type distribution with translated labels
 */
export function transformTypeDistribution(
	typeDistribution: TypeDistribution[],
	isLocalized: boolean
) {
	return typeDistribution.map((type) => ({
		...type,
		label:
			type.type === 0
				? i18n.getMessage('appt_checkup', isLocalized)
				: i18n.getMessage('appt_followup', isLocalized),
	}))
}

/**
 * Previous period comparison derived from monthlyTrends: take last two months as proxy
 */
export function calculatePreviousPeriodDistribution(
	monthlyTrends: MonthlyTrend[],
	transformedTypeDistribution: Array<{
		type: number
		label: string
		count?: number
	}>
): Array<{ type: number; label: string; count?: number }> {
	try {
		if (!Array.isArray(monthlyTrends) || monthlyTrends.length < 2) {
			return [] as Array<{ type: number; label: string; count?: number }>
		}
		// Fallback heuristic: assume checkup ~ 0 type, followup ~ 1 type weights from current distribution
		const last = monthlyTrends.at(-1)
		const prev = monthlyTrends.at(-2)
		if (!(last && prev)) {
			return [] as Array<{ type: number; label: string; count?: number }>
		}
		const totalNow = Math.max(
			1,
			transformedTypeDistribution.reduce((s, t) => s + (t.count || 0), 0)
		)
		const nowWeights = transformedTypeDistribution.map(
			(t) => (t.count || 0) / totalNow
		)
		const estimate = (total: number) =>
			transformedTypeDistribution.map((t, idx) => ({
				type: t.type,
				label: t.label,
				count: Math.round((total || 0) * (nowWeights[idx] || 0)),
			}))
		return estimate(prev.reservations)
	} catch {
		return [] as Array<{ type: number; label: string; count?: number }>
	}
}

/**
 * Combined dataset for dual bar chart: current vs previous for each label
 */
export function buildTypeDistributionWithPrevious(
	transformedTypeDistribution: Array<{
		type: number
		label: string
		count?: number
	}>,
	prevTypeDistribution: Array<{ type: number; label: string; count?: number }>
): Array<{ label: string; current: number; previous: number }> {
	const map = new Map<
		number,
		{ label: string; current: number; previous: number }
	>()
	for (const t of transformedTypeDistribution) {
		map.set(t.type, { label: t.label, current: t.count || 0, previous: 0 })
	}
	for (const previousEntry of prevTypeDistribution) {
		const entry = map.get(previousEntry.type) || {
			label: previousEntry.label,
			current: 0,
			previous: 0,
		}
		entry.previous = previousEntry.count || 0
		map.set(previousEntry.type, entry)
	}
	return Array.from(map.values())
}

/**
 * Transform day of week data with translated day names
 */
export function transformDayOfWeekData(
	dayOfWeekData: DayOfWeekData[],
	isLocalized: boolean
) {
	return dayOfWeekData.map((data) => ({
		...data,
		day: translateDayName(data.day, isLocalized, false),
	}))
}

/**
 * Transform time slots with translated types
 */
export function transformTimeSlots(
	timeSlots: TimeSlotData[],
	isLocalized: boolean
) {
	return timeSlots.map((slot) => ({
		...slot,
		typeLabel: getSlotTypeLabel(slot.type, isLocalized),
	}))
}

/**
 * Sort funnel data from highest to lowest count then translate stage names
 */
export function transformFunnelData(
	funnelData: FunnelData[],
	isLocalized: boolean
) {
	const sortedFunnel = [...funnelData].sort((a, b) => b.count - a.count)

	return sortedFunnel.map((stage) => ({
		...stage,
		stage: translateFunnelStage(stage.stage, isLocalized),
	}))
}

/**
 * Transform customer segments with translated names
 */
export function transformCustomerSegments(
	customerSegments: CustomerSegment[],
	isLocalized: boolean
) {
	return customerSegments.map((segment) => ({
		...segment,
		segment: translateCustomerSegment(segment.segment, isLocalized),
	}))
}

/**
 * Convert value to CSS variable key format
 */
function toVarKey(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

/**
 * Build segment chart items for pie chart
 */
export function buildSegmentChartItems(
	transformedCustomerSegments: Array<{ segment: string; count: number }>
) {
	return transformedCustomerSegments.map((entry) => {
		const key = toVarKey(entry.segment)
		return {
			key,
			name: key,
			segment: entry.segment,
			count: entry.count,
			fill: `var(--color-${key})`,
		}
	})
}

/**
 * Build segment chart configuration
 */
export function buildSegmentChartConfig(
	segmentItems: Array<{ key: string; segment: string }>
): ChartConfig {
	const colorVars = [
		'hsl(var(--chart-1))',
		'hsl(var(--chart-2))',
		'hsl(var(--chart-3))',
		'hsl(var(--chart-4))',
		'hsl(var(--chart-5))',
	]
	const config: ChartConfig = {}
	segmentItems.forEach((item, index) => {
		const color = colorVars[index % colorVars.length]
		if (color) {
			config[item.key] = {
				label: item.segment,
				color,
			}
		}
	})
	return config
}
