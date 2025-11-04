import { to24h } from '@shared/libs/utils'
import { getWindowProperty } from './window-utils'
import { computeSlotBase } from './compute-slot-base'
import { reflowSlot } from './reflow-slot'

type CalendarEventDetail = {
	type: string
	data: { id?: string | number; [key: string]: unknown }
}

export function createRealtimeHandler(api: { getEventById?: (id: string) => any; addEvent?: (e: any) => void; getEvents?: () => unknown[] }, opts?: { suppressMs?: number }) {
	const SUPPRESS_MS = typeof opts?.suppressMs === 'number' ? opts?.suppressMs : 1000
	return (ev: Event) => {
		const detail: CalendarEventDetail = (ev as CustomEvent).detail || { type: '', data: {} }
		const { type, data } = detail
		try {
			if (!(type && data)) {
				return
			}
			if (type === 'reservation_created') {
				const existing = api.getEventById?.(String(data.id))
				if (!existing) {
					const baseTime = to24h(String((data as any).time_slot || '00:00')).slice(0, 5)
					const start = `${(data as any).date}T${baseTime}:00`
					const startDate = new Date(start)
					api.addEvent?.({
						id: String(data.id),
						title: String(((data as any)?.customer_name) || ((data as any)?.wa_id) || ''),
						start,
						end: new Date(startDate.getTime() + 20 * 60 * 1000),
						extendedProps: {
							type: Number((data as any).type ?? 0),
							cancelled: false,
							waId: (data as any).wa_id || (data as any).waId,
							wa_id: (data as any).wa_id || (data as any).waId,
							reservationId: String(data.id),
							slotDate: (data as any).date,
							slotTime: baseTime,
						},
					})
				}
				reflowSlot(api, String((data as any).date), to24h(String((data as any).time_slot || '00:00')).slice(0, 5))
			} else if (type === 'reservation_updated' || type === 'reservation_reinstated') {
				const localMoves = getWindowProperty<Map<string, number> | undefined>('__calendarLocalMoves', undefined)
				const ts = localMoves?.get(String((data as any).id))
				if (ts && Date.now() - ts < SUPPRESS_MS) {
					return
				}
				const evObj = api.getEventById?.(String((data as any).id))
				const startBase = to24h(String((data as any).time_slot || '00:00')).slice(0, 5)
				const start = `${(data as any).date}T${startBase}:00`
				if (evObj) {
					try { evObj.setProp?.('title', String(((data as any)?.customer_name) || ((data as any)?.wa_id) || '')) } catch { /* noop */ }
					try { evObj.setExtendedProp?.('type', Number((data as any).type ?? 0)) } catch { /* noop */ }
					try { evObj.setExtendedProp?.('cancelled', false) } catch { /* noop */ }
					try { evObj.setExtendedProp?.('waId', (data as any).wa_id || evObj?.extendedProps?.waId || evObj?.extendedProps?.wa_id) } catch { /* noop */ }
					try { evObj.setExtendedProp?.('wa_id', (data as any).wa_id || evObj?.extendedProps?.wa_id || evObj?.extendedProps?.waId) } catch { /* noop */ }
					try { evObj.setExtendedProp?.('slotDate', (data as any).date) } catch { /* noop */ }
					try { evObj.setExtendedProp?.('slotTime', startBase) } catch { /* noop */ }
					try {
						const startDate = new Date(start)
						const endDate = new Date(startDate.getTime() + 20 * 60 * 1000)
						const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0)
						;(window as any).__suppressEventChangeDepth = currentDepth + 1
						evObj.setDates?.(startDate, endDate)
					} catch { /* noop */ } finally {
						try {
							const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0)
							if (currentDepth > 0) (window as any).__suppressEventChangeDepth = currentDepth - 1
						} catch { /* noop */ }
					}
				} else {
					api.addEvent?.({
						id: String((data as any).id),
						title: String(((data as any)?.customer_name) || ((data as any)?.wa_id) || ''),
						start,
						end: new Date(new Date(start).getTime() + 20 * 60 * 1000),
						extendedProps: {
							type: Number((data as any).type ?? 0),
							cancelled: false,
							waId: (data as any).wa_id || (data as any).waId,
							wa_id: (data as any).wa_id || (data as any).waId,
							reservationId: String((data as any).id),
							slotDate: (data as any).date,
							slotTime: startBase,
						},
					})
				}
				reflowSlot(api, String((data as any).date), startBase)
			} else if (type === 'reservation_cancelled') {
				const evObj = api.getEventById?.(String((data as any).id))
				try {
					const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0)
					;(window as any).__suppressEventChangeDepth = currentDepth + 1
					evObj?.setExtendedProp?.('cancelled', true)
					try { evObj?.remove?.() } catch { /* noop */ }
					setTimeout(() => {
						try {
							const d = getWindowProperty('__suppressEventChangeDepth', 0)
							if (d > 0) (window as any).__suppressEventChangeDepth = d - 1
						} catch { /* noop */ }
					}, 0)
				} catch { /* noop */ }
				try {
					reflowSlot(api, String((data as any).date), computeSlotBase(String((data as any).date), String((data as any).time_slot || '00:00')))
				} catch { /* noop */ }
			}
		} catch { /* noop */ }
	}
}


