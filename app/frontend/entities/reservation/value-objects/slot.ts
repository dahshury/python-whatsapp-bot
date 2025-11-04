import { normalizeToSlotBase } from '@/shared/libs/calendar/slot-utils'

export function toSlotBase(date: string, time: string): string {
	return normalizeToSlotBase(date, time)
}
