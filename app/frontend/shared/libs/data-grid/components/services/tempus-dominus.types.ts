export type TempusFormat = 'date' | 'datetime' | 'time' | undefined

export type TempusTheme = 'dark' | 'light'

export type TempusDominusOptions = {
	display: {
		components: {
			calendar: boolean
			date: boolean
			month: boolean
			year: boolean
			decades: boolean
			clock: boolean
			hours: boolean
			minutes: boolean
			seconds: boolean
		}
		theme: TempusTheme
		buttons: { today: boolean; clear: boolean; close: boolean }
		placement: 'bottom' | 'top' | 'auto'
		keepOpen: boolean
	}
	restrictions: {
		minDate?: Date
		maxDate?: Date
		disabledDates?: Date[]
		daysOfWeekDisabled?: number[]
		enabledHours?: number[]
	}
	localization: {
		locale: string
		format: string
		hourCycle: 'h12' | 'h23'
	}
	container?: HTMLElement
	stepping: number
}

export type TempusDominusFacade = {
	init(
		input: HTMLInputElement,
		opts: {
			format: TempusFormat
			restrictions: {
				minDate?: Date
				maxDate?: Date
				disabledDates?: Date[]
				daysOfWeekDisabled?: number[]
				enabledHours?: number[]
			}
			theme: TempusTheme
			locale?: string
			steppingMinutes?: number
		}
	): Promise<void>
	show(): void
	hide(): void
	toggle(): void
	setValue(date?: Date): void
	getPicked(): Date | undefined
	subscribe(event: unknown, handler: (e: unknown) => void): () => void
	dispose(): void
}
