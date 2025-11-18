import type { EventDomain } from '../../core/event.domain'
import type { EventRepository } from '../../core/event.repository'

export class EventApiRepository implements EventRepository {
	// private readonly _adapter = EventAdapter()

	async getById(_id: string): Promise<EventDomain | null> {
		// Not implemented against backend yet
		return await Promise.resolve(null)
	}

	async save(event: EventDomain): Promise<EventDomain> {
		// Placeholder to satisfy interface
		return await Promise.resolve(event)
	}

	async update(event: EventDomain): Promise<EventDomain> {
		// Placeholder to satisfy interface
		return await Promise.resolve(event)
	}
}
