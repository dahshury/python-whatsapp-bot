import { BaseError } from '@/shared/libs/errors/base-error'
import type { PhoneOption } from '../types/phone.types'
import { CountryCode, PhoneNumber } from '../value-objects'
import { PhoneDomain } from './phone.domain'

type CreatePhoneOptions = {
	number: string
	name: string
	country: string
	label: string
	id?: string
}

export function createNewPhone(options: CreatePhoneOptions): PhoneDomain {
	const { number, name, country, label, id } = options
	if (!number?.trim()) {
		throw BaseError.validation('Phone number is required')
	}
	if (!name?.trim()) {
		throw BaseError.validation('Phone contact name is required')
	}
	if (!country?.trim()) {
		throw BaseError.validation('Country code is required')
	}
	if (!label?.trim()) {
		throw BaseError.validation('Phone label is required')
	}

	// Validate through VOs
	new PhoneNumber(number)
	new CountryCode(country)

	return new PhoneDomain({
		number,
		name,
		country,
		label,
		id: id || '',
	})
}

export function createPhoneFromOption(input: PhoneOption): PhoneDomain {
	if (!input) {
		throw BaseError.validation('Phone option is required')
	}
	return new PhoneDomain(input)
}

export function normalizePhoneOption(input: PhoneOption): PhoneOption {
	if (!input) {
		throw BaseError.validation('Phone option is required')
	}
	return {
		...input,
		displayNumber: input.displayNumber || input.number,
	}
}

export function createPhoneFromDto(dto: unknown): PhoneDomain {
	const data = dto as Partial<PhoneOption>

	if (!data.number) {
		throw BaseError.validation('Invalid phone DTO: missing number')
	}
	if (!data.name) {
		throw BaseError.validation('Invalid phone DTO: missing name')
	}
	if (!data.country) {
		throw BaseError.validation('Invalid phone DTO: missing country')
	}

	const option: PhoneOption = {
		number: data.number,
		name: data.name,
		country: data.country,
		label: data.label || `${data.name} (${data.country})`,
	}

	if (data.id !== undefined) {
		option.id = data.id
	}
	if (data.displayNumber !== undefined) {
		option.displayNumber = data.displayNumber
	}
	if (data.lastMessageAt !== undefined) {
		option.lastMessageAt = data.lastMessageAt
	}
	if (data.lastReservationAt !== undefined) {
		option.lastReservationAt = data.lastReservationAt
	}

	return new PhoneDomain(option)
}
