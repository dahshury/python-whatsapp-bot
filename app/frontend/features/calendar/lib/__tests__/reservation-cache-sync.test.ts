// @ts-nocheck

import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	ReservationCacheSynchronizer,
	type ReservationRealtimeEvent,
} from '../reservation-cache-sync'

type TestReservation = {
	id?: number
	customer_id: string
	date: string
	time_slot: string
	customer_name: string
	type: number
	cancelled?: boolean
}

describe('ReservationCacheSynchronizer', () => {
	let queryClient: QueryClient
	let synchronizer: ReservationCacheSynchronizer

	beforeEach(() => {
		queryClient = new QueryClient()
		synchronizer = new ReservationCacheSynchronizer(queryClient)
	})

	afterEach(() => {
		synchronizer.dispose()
		queryClient.clear()
	})

	it('updates cached reservations on reservation update events', () => {
	const baseReservation: TestReservation = {
			id: 42,
			customer_id: '1234',
			date: '2025-11-01',
			time_slot: '09:00',
			customer_name: 'Alice',
			type: 0,
		}
		const initialDayData = {
			'1234': [baseReservation],
		}
		const initialMonthData = {
			'1234': [baseReservation],
		}

		queryClient.setQueryData(
			['calendar-reservations', '2025-11-01', false],
			initialDayData
		)
		queryClient.setQueryData(
			['calendar-reservations', '2025-11', false],
			initialMonthData
		)

		const event: ReservationRealtimeEvent = {
			type: 'reservation_updated',
			data: {
				id: 42,
				wa_id: '1234',
				date: '2025-11-01',
				time_slot: '10:00',
				customer_name: 'Alice',
				type: 1,
			},
		}

		const handled = synchronizer.handle(event)
		expect(handled).toBe(true)

	const updatedDay = queryClient.getQueryData<Record<string, TestReservation[]>>([
			'calendar-reservations',
			'2025-11-01',
			false,
		])
		expect(updatedDay).toBeTruthy()
		expect(updatedDay?.['1234']).toHaveLength(1)
		expect(updatedDay?.['1234']?.[0].time_slot).toBe('10:00')
		expect(updatedDay?.['1234']?.[0].type).toBe(1)

	const updatedMonth = queryClient.getQueryData<Record<string, TestReservation[]>>([
			'calendar-reservations',
			'2025-11',
			false,
		])
		expect(updatedMonth?.['1234']?.[0].time_slot).toBe('10:00')
		expect(updatedMonth?.['1234']?.[0].type).toBe(1)
	})

	it('marks cancellations only for caches that include cancelled reservations', () => {
	const reservation: TestReservation = {
			id: 53,
			customer_id: '5678',
			date: '2025-12-24',
			time_slot: '14:30',
			customer_name: 'Bob',
			type: 0,
		}
		queryClient.setQueryData(
			['calendar-reservations', '2025-12-24', false],
			{ '5678': [reservation] }
		)
		queryClient.setQueryData(
			['calendar-reservations', '2025-12-24', true],
			{ '5678': [reservation] }
		)

		const event: ReservationRealtimeEvent = {
			type: 'reservation_cancelled',
			data: {
				id: 53,
				wa_id: '5678',
				date: '2025-12-24',
				time_slot: '14:30',
			},
		}

		synchronizer.handle(event)

	const freeRoamDisabled = queryClient.getQueryData<
		Record<string, TestReservation[]>
		>(['calendar-reservations', '2025-12-24', false])
		expect(freeRoamDisabled?.['5678']).toBeUndefined()

	const freeRoamEnabled = queryClient.getQueryData<
		Record<string, TestReservation[]>
		>(['calendar-reservations', '2025-12-24', true])
		expect(freeRoamEnabled?.['5678']).toHaveLength(1)
		expect(freeRoamEnabled?.['5678']?.[0].cancelled).toBe(true)
	})
})

