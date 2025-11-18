'use client'

import { useMemo } from 'react'
import { useAppConfigQuery } from '@/features/app-config'
import { DEFAULT_CALENDAR_VIEW_VALUES } from '@/shared/constants/calendar-views'
import { getCalendarViewOptions } from '../services/calendar-view-options'

const sanitizeAllowedViews = (views?: string[] | null): string[] => {
	if (!views || views.length === 0) {
		return [...DEFAULT_CALENDAR_VIEW_VALUES]
	}
	const allowedSet = new Set(DEFAULT_CALENDAR_VIEW_VALUES)
	const filtered = views.filter((view) => allowedSet.has(view))
	if (filtered.length === 0) {
		return [...DEFAULT_CALENDAR_VIEW_VALUES]
	}
	return Array.from(new Set(filtered))
}

export const useCalendarViewOptionsFiltered = (isLocalized: boolean) => {
	const { data } = useAppConfigQuery()

	const allowedValues = useMemo(
		() => sanitizeAllowedViews(data?.availableCalendarViews),
		[data?.availableCalendarViews]
	)

	const options = useMemo(() => {
		const base = getCalendarViewOptions(isLocalized)
		const allowedSet = new Set(allowedValues)
		return base.filter((option) => allowedSet.has(option.value))
	}, [isLocalized, allowedValues])

	return {
		options,
		allowedValues,
	}
}
