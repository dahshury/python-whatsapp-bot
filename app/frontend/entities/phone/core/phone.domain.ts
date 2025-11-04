import { BaseError } from '@/shared/libs/errors/base-error'
import type { PhoneOption } from '../types/phone.types'
import { CountryCode, PhoneNumber } from '../value-objects'

export class PhoneDomain {
	private readonly _number: PhoneNumber
	private readonly _name: string
	private readonly _country: CountryCode
	private readonly _label: string
	private readonly _id?: string | undefined
	private readonly _displayNumber?: string | undefined

	constructor(input: PhoneOption) {
		this._number = new PhoneNumber(input.number)
		this._country = new CountryCode(input.country)

		if (!input.name?.trim()) {
			throw BaseError.validation('Phone contact name is required')
		}
		if (!input.label?.trim()) {
			throw BaseError.validation('Phone label is required')
		}

		this._name = input.name
		this._label = input.label
		this._id = input.id ?? undefined
		this._displayNumber = input.displayNumber ?? undefined
	}

	updateDisplayNumber(displayNumber: string): PhoneDomain {
		const option: PhoneOption = {
			number: this._number.value,
			name: this._name,
			country: this._country.value,
			label: this._label,
		}
		if (this._id !== undefined) {
			option.id = this._id
		}
		option.displayNumber = displayNumber
		return new PhoneDomain(option)
	}

	hasId(): boolean {
		return this._id !== undefined && this._id !== null
	}

	matches(searchTerm: string): boolean {
		const term = searchTerm.toLowerCase()
		return (
			this._name.toLowerCase().includes(term) ||
			this._number.value.includes(term) ||
			this._label.toLowerCase().includes(term) ||
			this._country.value.toLowerCase().includes(term)
		)
	}

	toPhoneOption(): PhoneOption {
		const option: PhoneOption = {
			number: this._number.value,
			name: this._name,
			country: this._country.value,
			label: this._label,
		}
		if (this._id !== undefined) {
			option.id = this._id
		}
		if (this._displayNumber !== undefined) {
			option.displayNumber = this._displayNumber
		}
		return option
	}

	get number(): string {
		return this._number.value
	}

	get name(): string {
		return this._name
	}

	get country(): string {
		return this._country.value
	}

	get label(): string {
		return this._label
	}

	get id(): string | undefined {
		return this._id
	}

	get displayNumber(): string | undefined {
		return this._displayNumber
	}
}
