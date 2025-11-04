import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'

export class WhatsAppId extends ValueObject<string> {
	protected validate(value: string): void {
		if (typeof value !== 'string' || value.trim().length === 0) {
			throw BaseError.validation('Invalid WhatsApp ID')
		}
	}
}

export default WhatsAppId
