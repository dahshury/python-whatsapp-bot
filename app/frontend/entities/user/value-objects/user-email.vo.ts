import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class UserEmail extends ValueObject<string> {
	protected validate(value: string): void {
		if (!EMAIL_REGEX.test(value)) {
			throw BaseError.validation('Invalid email format')
		}
	}
}

export default UserEmail
