import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'
import { VacationDate } from './vacation-date.vo'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MILLISECONDS_PER_DAY =
	MILLISECONDS_PER_SECOND *
	SECONDS_PER_MINUTE *
	MINUTES_PER_HOUR *
	HOURS_PER_DAY

type DateRange = {
	start: string
	end: string
}

export class VacationDateRange extends ValueObject<DateRange> {
	private readonly _start: VacationDate
	private readonly _end: VacationDate

	constructor(value: DateRange) {
		super(value)
		this._start = new VacationDate(value.start)
		this._end = new VacationDate(value.end)
	}

	protected validate(value: DateRange): void {
		const start = new VacationDate(value.start)
		const end = new VacationDate(value.end)

		if (end.isBefore(start)) {
			throw BaseError.validation('Vacation end date must be after start date')
		}
	}

	get start(): string {
		return this._start.value
	}

	get end(): string {
		return this._end.value
	}

	getDurationInDays(): number {
		const startMs = this._start.toDate().getTime()
		const endMs = this._end.toDate().getTime()
		return Math.ceil((endMs - startMs) / MILLISECONDS_PER_DAY)
	}

	includes(date: VacationDate): boolean {
		return !(date.isBefore(this._start) || date.isAfter(this._end))
	}
}

export default VacationDateRange
