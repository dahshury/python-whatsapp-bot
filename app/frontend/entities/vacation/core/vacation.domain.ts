import type { Vacation } from '../types/vacation.types'
import { VacationDate, VacationDateRange } from '../value-objects'

export class VacationDomain {
	private _data: Vacation
	private _dateRange: VacationDateRange

	constructor(data: Vacation) {
		this._dateRange = new VacationDateRange({
			start: data.start,
			end: data.end,
		})
		this._data = data
	}

	update(start: string, end: string): void {
		const newDateRange = new VacationDateRange({ start, end })
		this._dateRange = newDateRange
		this._data = { ...this._data, start, end }
	}

	updateStartDate(start: string): void {
		this.update(start, this._data.end)
	}

	updateEndDate(end: string): void {
		this.update(this._data.start, end)
	}

	getDurationInDays(): number {
		return this._dateRange.getDurationInDays()
	}

	isActive(currentDate?: Date): boolean {
		const date = currentDate || new Date()
		const vacationDate = new VacationDate(date.toISOString())
		return this._dateRange.includes(vacationDate)
	}

	hasStarted(currentDate?: Date): boolean {
		const date = currentDate || new Date()
		const startDate = new VacationDate(this._data.start)
		const currentVacationDate = new VacationDate(date.toISOString())
		return !currentVacationDate.isBefore(startDate)
	}

	hasEnded(currentDate?: Date): boolean {
		const date = currentDate || new Date()
		const endDate = new VacationDate(this._data.end)
		const currentVacationDate = new VacationDate(date.toISOString())
		return currentVacationDate.isAfter(endDate)
	}

	get value(): Vacation {
		return this._data
	}

	get id(): string {
		return this._data.id
	}

	get start(): string {
		return this._data.start
	}

	get end(): string {
		return this._data.end
	}

	get startDate(): Date {
		return new VacationDate(this._data.start).toDate()
	}

	get endDate(): Date {
		return new VacationDate(this._data.end).toDate()
	}
}
