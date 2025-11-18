import type { QueryClient, UseMutationResult } from '@tanstack/react-query'
import type React from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import type {
	CancelReservationParams,
	CreateReservationParams,
	MutateReservationParams,
} from '@/features/reservations/hooks'
import type { DataProvider } from '@/shared/libs/data-grid/components/core/services/DataProvider'
import type {
	CalendarEvent,
	ValidationResult,
} from '@/widgets/data-table-editor/types'

/**
 * Dependencies required by the data table save service.
 * These are injected from the hook to avoid React scope capture.
 */
export type DataTableSaveDependencies = {
	queryClient: QueryClient
	calendarRef: React.RefObject<CalendarCoreRef | null> | null | undefined
	dataProviderRef: React.RefObject<DataProvider | null>
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>
	isLocalized: boolean
	freeRoam: boolean
	validateAllCells: () => ValidationResult
	onEventModified: ((eventId: string, event: CalendarEvent) => void) | undefined
	refreshCustomerData: (() => Promise<void>) | undefined
	selectedConversationId: string | null
	setSelectedConversation: (id?: string | null) => void
}

/**
 * Mutation ports - TanStack Query mutation instances injected from the hook.
 * Services use these but do not create them.
 */
export type DataTableSaveMutations = {
	modifyMutation: UseMutationResult<
		unknown,
		Error,
		MutateReservationParams,
		unknown
	>
	createMutation: UseMutationResult<
		unknown,
		Error,
		CreateReservationParams,
		unknown
	>
	cancelMutation: UseMutationResult<
		unknown,
		Error,
		CancelReservationParams,
		unknown
	>
}

/**
 * Payload for editing changes extracted from the data provider.
 * This matches the structure returned by EditingChanges from the widget types.
 */
export type EditingChangesPayload = {
	deleted_rows?: number[]
	edited_rows?: Record<string, Record<string, unknown>>
	added_rows?: Array<{
		date: string
		time: string
		phone: string
		type: string
		name: string
	}>
}
