import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import {
	useCancelReservation,
	useCreateReservation,
	useMutateReservation,
} from '@/features/reservations/hooks'
import type { DataProvider } from '@/shared/libs/data-grid/components/core/services/DataProvider'
import { useSidebarChatStore } from '@/shared/libs/store/sidebar-chat-store'
import type {
	CalendarEvent,
	ValidationResult,
} from '@/widgets/data-table-editor/types'
import {
	createDataTableSaveService,
	type DataTableSaveDependencies,
	type DataTableSaveMutations,
} from '../services'

type UseDataTableSaveHandlerProps = {
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null
	isLocalized: boolean
	slotDurationHours: number
	freeRoam: boolean
	gridRowToEventMapRef: React.RefObject<Map<number, CalendarEvent>>
	dataProviderRef: React.RefObject<DataProvider | null>
	validateAllCells: () => ValidationResult
	onEventAdded?: (event: CalendarEvent) => void
	onEventModified?: (eventId: string, event: CalendarEvent) => void
	onEventCancelled?: (eventId: string) => void
	refreshCustomerData?: () => Promise<void>
}

export function useDataTableSaveHandler({
	calendarRef,
	isLocalized,
	slotDurationHours: _slotDurationHours,
	freeRoam,
	gridRowToEventMapRef,
	dataProviderRef,
	validateAllCells,
	onEventModified,
	onEventCancelled: _onEventCancelled,
	refreshCustomerData,
}: UseDataTableSaveHandlerProps) {
	const [isSaving, setIsSaving] = useState(false)
	const queryClient = useQueryClient()
	const { selectedConversationId, setSelectedConversation } =
		useSidebarChatStore()

	// Use TanStack Query mutations
	const modifyMutation = useMutateReservation()
	const createMutation = useCreateReservation()
	const cancelMutation = useCancelReservation()

	// Create service dependencies
	const dependencies: DataTableSaveDependencies = useMemo(
		() => ({
			queryClient,
			calendarRef,
			dataProviderRef,
			gridRowToEventMapRef,
			isLocalized,
			freeRoam,
			validateAllCells,
			onEventModified,
			refreshCustomerData,
			selectedConversationId: selectedConversationId ?? null,
			setSelectedConversation,
		}),
		[
			queryClient,
			calendarRef,
			dataProviderRef,
			gridRowToEventMapRef,
			isLocalized,
			freeRoam,
			validateAllCells,
			onEventModified,
			refreshCustomerData,
			selectedConversationId,
			setSelectedConversation,
		]
	)

	// Create mutations object
	const mutations: DataTableSaveMutations = useMemo(
		() => ({
			modifyMutation,
			createMutation,
			cancelMutation,
		}),
		[modifyMutation, createMutation, cancelMutation]
	)

	// Create save service
	const saveService = useMemo(
		() => createDataTableSaveService(dependencies, mutations),
		[dependencies, mutations]
	)

	// Wrap service call with isSaving guard and state management
	const handleSaveChanges = useCallback(async () => {
		if (isSaving) {
			return
		}

		setIsSaving(true)
		try {
			return await saveService()
		} finally {
			setIsSaving(false)
		}
	}, [isSaving, saveService])

	return {
		isSaving,
		handleSaveChanges,
	}
}
