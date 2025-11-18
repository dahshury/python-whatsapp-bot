import type { EventDomain } from './event.domain'

export type EventRepository = {
	getById(id: string): Promise<EventDomain | null>
	save(event: EventDomain): Promise<EventDomain>
	update(event: EventDomain): Promise<EventDomain>
}
