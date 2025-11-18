import type { UserDomain } from '../../core/user.domain'
import type { UserRepository } from '../../core/user.repository'
import { userDtoToDomain } from '../../mapper/user.mapper'
import { UserAdapter } from '../api/user.adapter'

export class UserApiRepository implements UserRepository {
	private readonly adapter = UserAdapter()

	async getById(id: string): Promise<UserDomain | null> {
		const dto = await this.adapter.getById(id)
		return dto ? userDtoToDomain(dto) : null
	}

	async getByWaId(waId: string): Promise<UserDomain | null> {
		const dto = await this.adapter.getByWaId(waId)
		return dto ? userDtoToDomain(dto) : null
	}

	async save(user: UserDomain): Promise<UserDomain> {
		// No-op save path for now (backend owns persistence via other endpoints)
		return await Promise.resolve(user)
	}

	async update(user: UserDomain): Promise<UserDomain> {
		return await Promise.resolve(user)
	}
}
