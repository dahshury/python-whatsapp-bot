import { ValueObject } from '@/shared/domain'
import { CALLING_CODE_TO_COUNTRY } from '@/shared/libs/phone/countries'

const DEFAULT_COUNTRY = 'SA'
const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/

const getCountryFromCallingCode = (candidate: string): string | null => {
	const normalized = candidate.replace(/\D/g, '')
	if (!normalized) {
		return null
	}
	return CALLING_CODE_TO_COUNTRY[normalized] || null
}

export class CountryCodeVO extends ValueObject<string> {
	constructor(value: string) {
		super(CountryCodeVO.normalize(value))
	}

	static fromUnknown(value?: string | null): CountryCodeVO {
		return new CountryCodeVO(value ?? DEFAULT_COUNTRY)
	}

	private static normalize(value: string): string {
		if (!value) {
			return DEFAULT_COUNTRY
		}
		const trimmed = value.trim()
		if (!trimmed) {
			return DEFAULT_COUNTRY
		}
		if (trimmed.startsWith('+')) {
			const fromCalling = getCountryFromCallingCode(trimmed)
			if (fromCalling) {
				return fromCalling.toUpperCase()
			}
		}
		if (ISO_COUNTRY_REGEX.test(trimmed.toUpperCase())) {
			return trimmed.toUpperCase()
		}
		return DEFAULT_COUNTRY
	}

	protected validate(value: string): void {
		if (!ISO_COUNTRY_REGEX.test(value)) {
			throw new Error('Country code must be a 2-letter ISO code')
		}
	}

	toString(): string {
		return this.value
	}
}
