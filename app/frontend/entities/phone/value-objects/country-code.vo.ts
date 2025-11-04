import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'

// ISO 3166-1 alpha-2 country code validation
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/

export class CountryCode extends ValueObject<string> {
	protected validate(value: string): void {
		if (!value || typeof value !== 'string') {
			throw BaseError.validation('Country code is required')
		}
		if (!COUNTRY_CODE_REGEX.test(value.toUpperCase())) {
			throw BaseError.validation(
				'Invalid country code format. Expected ISO 3166-1 alpha-2 (e.g., US, GB)'
			)
		}
	}

	get normalized(): string {
		return this._value.toUpperCase()
	}
}

export default CountryCode
