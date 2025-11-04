export type CustomerItem = {
	id: string
	name: string
	phone?: string
}

export type ConversationsByWaId = Record<
	string,
	Array<{
		id?: string
		text?: string
		ts?: string
		date?: string
		time?: string
		datetime?: string
	}>
>

export type ReservationsByWaId = Record<
	string,
	Array<{
		customer_name?: string
		id?: string | number
		title?: string
		start?: string
		end?: string
	}>
>

export type CustomerNamesByWaId = Record<
	string,
	| {
			wa_id?: string | null
			customer_name?: string | null
			name?: string | null
			phone?: string | null
	  }
	| undefined
>

const toTrimmedString = (value: unknown): string => {
	if (typeof value === 'string') {
		return value.trim()
	}
	if (value == null) {
		return ''
	}
	return String(value).trim()
}

const toOptionalString = (value: unknown): string | undefined => {
	const trimmed = toTrimmedString(value)
	return trimmed ? trimmed : undefined
}

export function buildBaseCustomers(
	conversations: ConversationsByWaId | undefined,
	reservations: ReservationsByWaId | undefined,
	customerNames?: CustomerNamesByWaId | undefined
): CustomerItem[] {
	const customerMap = new Map<string, CustomerItem>()

	const ensureCustomer = (rawId: unknown): CustomerItem | undefined => {
		const waId = toTrimmedString(rawId)
		if (!waId) {
			return
		}
		let existing = customerMap.get(waId)
		if (!existing) {
			existing = {
				id: waId,
				name: '',
				phone: toOptionalString(rawId) ?? waId,
			}
			customerMap.set(waId, existing)
		}
		return existing
	}

	if (customerNames) {
		for (const [key, record] of Object.entries(customerNames)) {
			const waId = toTrimmedString(record?.wa_id ?? key)
			if (!waId) {
				continue
			}
			const customer = ensureCustomer(waId)
			if (!customer) {
				continue
			}
			const candidateName = record?.customer_name ?? record?.name ?? null
			const normalizedName = toTrimmedString(candidateName)
			if (normalizedName) {
				customer.name = normalizedName
			}
			const candidatePhone = record?.phone ?? record?.wa_id ?? key
			const normalizedPhone = toOptionalString(candidatePhone)
			if (normalizedPhone) {
				customer.phone = normalizedPhone
			}
		}
	}

	if (conversations) {
		for (const waId of Object.keys(conversations)) {
			ensureCustomer(waId)
		}
	}

	if (reservations) {
		for (const waId of Object.keys(reservations)) {
			ensureCustomer(waId)
		}
	}
	return Array.from(customerMap.values())
}

export function sortCustomersByLastMessage(
	customers: CustomerItem[],
	conversations: ConversationsByWaId | undefined
): CustomerItem[] {
	const parseTs = (
		m: { ts?: string; date?: string; time?: string; datetime?: string } = {}
	): number => {
		const tryParse = (v?: string) => {
			if (!v) {
				return 0
			}
			const d = new Date(v)
			return Number.isNaN(d.getTime()) ? 0 : d.getTime()
		}
		const t1 = tryParse(m.ts)
		const t2 = tryParse(m.datetime)
		if (t1 || t2) {
			return Math.max(t1, t2)
		}
		const date = m.date
		const time = m.time
		if (date && time) {
			return tryParse(`${date}T${time}`)
		}
		if (date) {
			return tryParse(`${date}T00:00:00`)
		}
		return 0
	}
	const getLastTs = (wa: string) => {
		try {
			const msgs = conversations?.[wa] || []
			let max = 0
			for (const m of msgs) {
				const v = parseTs(m)
				if (v > max) {
					max = v
				}
			}
			return max
		} catch {
			return 0
		}
	}
	return [...customers].sort((a, b) => {
		const tb = getLastTs(b.id)
		const ta = getLastTs(a.id)
		if (tb !== ta) {
			return tb - ta
		}
		return a.id.localeCompare(b.id)
	})
}

export function mergeCustomerOverlays(
	baseCustomers: CustomerItem[],
	overrides: Map<string, { name?: string; phone?: string }>,
	deleted: Set<string>
): CustomerItem[] {
	const merged = new Map<string, CustomerItem>()
	for (const c of baseCustomers) {
		if (deleted.has(c.id)) {
			continue
		}
		const ov = overrides.get(c.id)
		merged.set(c.id, {
			id: c.id,
			name: (ov?.name ?? c.name) || '',
			phone: ov?.phone || c.phone || c.id,
		})
	}
	for (const [wa, ov] of overrides.entries()) {
		if (deleted.has(wa)) {
			continue
		}
		if (!merged.has(wa)) {
			merged.set(wa, { id: wa, name: ov?.name || '', phone: ov?.phone || wa })
		}
	}
	return Array.from(merged.values())
}
