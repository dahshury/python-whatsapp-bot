import {
	MAX_DAY_OF_WEEK,
	MIN_DAY_OF_WEEK,
} from '@/shared/constants/days-of-week'
import { ValueObject } from '@/shared/domain'

export type SlotDurationValue = {
	hours: number
	dayOfWeek?: number | null
}

const normalizeDay = (day?: number | null): number | null => {
	if (day === null || day === undefined) {
		return null
	}
	if (
		!Number.isInteger(day) ||
		day < MIN_DAY_OF_WEEK ||
		day > MAX_DAY_OF_WEEK
	) {
		return null
	}
	return day
}

export class SlotDurationVO extends ValueObject<SlotDurationValue> {
	constructor(value: SlotDurationValue) {
		super({
			hours: Math.trunc(value.hours),
			dayOfWeek: normalizeDay(value.dayOfWeek),
		})
	}

	static forDay(value: { dayOfWeek: number; hours: number }): SlotDurationVO {
		return new SlotDurationVO({
			hours: value.hours,
			dayOfWeek: value.dayOfWeek,
		})
	}

	protected validate(value: SlotDurationValue): void {
		if (
			!Number.isInteger(value.hours) ||
			value.hours <= 0 ||
			value.hours > 24
		) {
			throw new Error('Slot duration must be between 1 and 24 hours')
		}
		if (
			value.dayOfWeek !== null &&
			value.dayOfWeek !== undefined &&
			(!Number.isInteger(value.dayOfWeek) ||
				value.dayOfWeek < MIN_DAY_OF_WEEK ||
				value.dayOfWeek > MAX_DAY_OF_WEEK)
		) {
			throw new Error('Day of week must be between 0 and 6')
		}
	}
}
