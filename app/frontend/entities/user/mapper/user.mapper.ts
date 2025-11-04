import { UserDomain } from '../core/user.domain'
import type { UserDto } from '../infrastructure/dto/user.dto'

export function userDomainToDto(user: UserDomain): UserDto {
	return {
		id: user.id,
		waId: user.waId,
		name: user.name,
		phone: user.phone,
		email: user.email,
		language: user.language,
		notifications: user.notifications,
		timezone: user.timezone,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	}
}

export function userDtoToDomain(dto: UserDto): UserDomain {
	return new UserDomain({
		id: dto.id,
		waId: dto.waId,
		name: dto.name,
		phone: dto.phone,
		email: dto.email,
		language: dto.language,
		notifications: dto.notifications,
		timezone: dto.timezone,
		createdAt: dto.createdAt,
		updatedAt: dto.updatedAt,
	})
}
