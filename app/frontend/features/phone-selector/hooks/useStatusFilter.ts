import React from 'react'

export type StatusFilterValue = 'registered' | 'unknown' | 'blocked'

export function useStatusFilter() {
	const [statusFilter, setStatusFilter] = React.useState<
		StatusFilterValue | undefined
	>(undefined)

	const handleStatusFilterSelect = React.useCallback(
		(status: StatusFilterValue) => {
			setStatusFilter(status)
		},
		[]
	)

	const handleRemoveStatusFilter = React.useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation()
			setStatusFilter(undefined)
		},
		[]
	)

	const getStatusLabel = React.useCallback(
		(status: StatusFilterValue): string => {
			if (status === 'registered') {
				return 'Registered'
			}
			if (status === 'unknown') {
				return 'Unregistered'
			}
			return 'Blocked'
		},
		[]
	)

	return {
		statusFilter,
		setStatusFilter,
		handleStatusFilterSelect,
		handleRemoveStatusFilter,
		getStatusLabel,
	}
}
