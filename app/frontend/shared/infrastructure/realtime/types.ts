export type WebSocketMessage = {
	type: string
	data?: Record<string, unknown>
	[key: string]: unknown
}

export type UpdateType =
	| 'modify_reservation'
	| 'modify_reservation_ack'
	| 'modify_reservation_nack'
	| 'reservation_updated'
	| 'reservation_reinstated'
	| 'cancel_reservation'
	| 'reservation_cancelled'
	| string
