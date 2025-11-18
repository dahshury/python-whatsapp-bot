import { getValidRange } from '@shared/libs/calendar/calendar-config'
import { useEffect } from 'react'

type CalendarApiLike = { setOption?: (name: string, value: unknown) => void }

export function useValidRangeEffect(
	getApi: () => CalendarApiLike | undefined,
	freeRoam: boolean,
	currentView: string
) {
	useEffect(() => {
		const api = getApi?.()
		if (!api) {
			return
		}
		const lower = (currentView || '').toLowerCase()
		const isMultiMonth = lower === 'multimonthyear'
		if (freeRoam || isMultiMonth) {
			api.setOption?.('validRange', undefined)
		} else {
			api.setOption?.('validRange', getValidRange(false))
		}
	}, [getApi, freeRoam, currentView])
}
