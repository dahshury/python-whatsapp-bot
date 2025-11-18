import { useEffect } from 'react'

type CalendarApiLike = {
	setOption?: (name: string, value: unknown) => void
	updateSize?: () => void
}

type SlotTimes = { slotMinTime: string; slotMaxTime: string }

export function useSlotTimesEffect(
	getApi: () => CalendarApiLike | undefined,
	slotTimes: SlotTimes
) {
	useEffect(() => {
		const api = getApi()
		if (!api) {
			return
		}
		const run = () => {
			api.setOption?.('slotMinTime', slotTimes.slotMinTime)
			api.setOption?.('slotMaxTime', slotTimes.slotMaxTime)
		}
		// No batchRendering available on our ApiLike; call directly
		run()
		requestAnimationFrame(() => {
			api.updateSize?.()
		})
	}, [getApi, slotTimes])
}
