import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'

type MessageRoleType = 'user' | 'assistant' | 'system' | 'tool'

export class MessageRole extends ValueObject<MessageRoleType> {
	protected validate(value: MessageRoleType): void {
		const validRoles: MessageRoleType[] = [
			'user',
			'assistant',
			'system',
			'tool',
		]
		if (!validRoles.includes(value)) {
			throw BaseError.validation(
				`Invalid message role. Must be one of: ${validRoles.join(', ')}`
			)
		}
	}
}

export default MessageRole
