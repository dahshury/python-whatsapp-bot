'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InMemoryDataSource } from '@/shared/libs/data-grid/components/core/data-sources/InMemoryDataSource'
import type { IColumnDefinition } from '@/shared/libs/data-grid/components/core/interfaces/IDataSource'
import { ColumnDataType } from '@/shared/libs/data-grid/components/core/interfaces/IDataSource'
import { i18n } from '@/shared/libs/i18n'
import { logger } from '@/shared/libs/logger'
import { useLanguage } from '@/shared/libs/state/language-context'
import { createDocumentsService } from '../services/documents.service.factory'

const FETCH_IN_FLIGHT_RESET_DELAY_MS = 100

const logDocumentCustomerRowWarning = (context: string, error: unknown) => {
	logger.warn(`[useDocumentCustomerRow] ${context}`, error)
}

export default function useDocumentCustomerRow(
	selectedWaId: string | null | undefined,
	_isLocalized?: boolean
) {
	const waId = selectedWaId || ''
	const { isLocalized } = useLanguage()
	const localized = _isLocalized ?? isLocalized
	const [customerLoading, setCustomerLoading] = useState(false)
	const [customerError, setCustomerError] = useState<string | null>(null)
	const [validationErrors] = useState<
		Array<{ row: number; col: number; message: string; fieldName?: string }>
	>([])

	const customerColumns = useMemo<IColumnDefinition[]>(
		() => [
			{
				id: 'name',
				name: 'name',
				title: i18n.getMessage('field_name', localized),
				dataType: ColumnDataType.TEXT,
				isEditable: true,
				isRequired: true,
				width: 220,
			},
			{
				id: 'age',
				name: 'age',
				title: i18n.getMessage('field_age', localized),
				dataType: ColumnDataType.NUMBER,
				isEditable: true,
				isRequired: false,
				width: 120,
				metadata: { useWheel: true },
				validationRules: [
					{ type: 'min', value: 10, message: 'Minimum age is 10' },
					{ type: 'max', value: 120, message: 'Maximum age is 120' },
				],
			},
			{
				id: 'phone',
				name: 'phone',
				title: i18n.getMessage('field_phone', localized),
				dataType: ColumnDataType.PHONE,
				isEditable: true,
				isRequired: true,
				width: 220,
			},
		],
		[localized]
	)

	const customerDataSource = useMemo(() => {
		const initialRow: unknown[] = ['', null, '']
		return new InMemoryDataSource(1, customerColumns.length, customerColumns, [
			initialRow,
		])
	}, [customerColumns])

	useEffect(() => {
		try {
			;(async () => {
				const existing = await customerDataSource.getRowData(0)
				customerDataSource.reset(customerColumns, [existing])
			})().catch((error) => {
				logDocumentCustomerRowWarning(
					'Failed to reset customer data source with existing row',
					error
				)
			})
		} catch (error) {
			logDocumentCustomerRowWarning(
				'Error initializing customer data source reset',
				error
			)
		}
	}, [customerColumns, customerDataSource])

	const onAddRowOverride = useCallback(() => {
		return
	}, [])

	const providerRef = useRef<unknown | null>(null)

	const isUnlockReady = true

	const fetchInFlightRef = useRef<string | null>(null)

	const onDataProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				providerRef.current = provider
				if (!waId || waId.trim() === '') {
					return
				}

				if (fetchInFlightRef.current === waId) {
					return
				}

				fetchInFlightRef.current = waId
				setCustomerLoading(true)
				const nameCol = customerColumns.findIndex((c) => c.id === 'name')
				const ageCol = customerColumns.findIndex((c) => c.id === 'age')
				const phoneCol = customerColumns.findIndex((c) => c.id === 'phone')
				const apply = async (name: string, age: number | null) => {
					if (nameCol !== -1) {
						await customerDataSource.setCellData(nameCol, 0, name)
					}
					if (ageCol !== -1) {
						await customerDataSource.setCellData(ageCol, 0, age)
					}
				}
				try {
					;(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight =
						true

					const svc = createDocumentsService()
					const resp = await svc.getByWaId(waId)
					const restName = (resp?.name ?? '') as string
					const restAge = (resp?.age ?? null) as number | null

					;(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight =
						false

					// Note: Document loading is handled separately by TanStack Query (useGetByWaId)
					// We only handle grid data (name, age, phone) here
					await apply(restName, restAge)

					try {
						await customerDataSource.getCellData(nameCol, 0)
						await customerDataSource.getCellData(ageCol, 0)
					} catch (error) {
						logDocumentCustomerRowWarning(
							'Failed to verify cell data after applying customer updates',
							error
						)
					}

					try {
						const providerWithInternals = provider as unknown as {
							cellCache?: Map<string, unknown>
							editingState?: {
								editedCells?: Map<number, Map<number, unknown>>
							}
						}

						if (providerWithInternals.editingState?.editedCells) {
							const rowMap =
								providerWithInternals.editingState.editedCells.get(0)
							if (rowMap) {
								rowMap.delete(nameCol)
								rowMap.delete(ageCol)
								if (typeof phoneCol === 'number' && phoneCol !== -1) {
									rowMap.delete(phoneCol)
								}
							}
						}

						if (providerWithInternals.cellCache) {
							providerWithInternals.cellCache.delete(`${nameCol}-0`)
							providerWithInternals.cellCache.delete(`${ageCol}-0`)
							if (typeof phoneCol === 'number' && phoneCol !== -1) {
								providerWithInternals.cellCache.delete(`${phoneCol}-0`)
							}
						}

						const gridApi = (
							window as unknown as {
								__docGridApi?: {
									updateCells?: (cells: { cell: [number, number] }[]) => void
								}
							}
						).__docGridApi
						if (gridApi?.updateCells) {
							const cells: { cell: [number, number] }[] = [
								{ cell: [nameCol, 0] },
								{ cell: [ageCol, 0] },
							]
							if (typeof phoneCol === 'number' && phoneCol !== -1) {
								cells.push({ cell: [phoneCol, 0] })
							}
							gridApi.updateCells(cells)
						}
					} catch (error) {
						logDocumentCustomerRowWarning(
							'Failed to update grid cells and clear editing state after customer load',
							error
						)
					}

					window.dispatchEvent(
						new CustomEvent('doc:customer-loaded', { detail: { waId } })
					)
					setCustomerError(null)
					setCustomerLoading(false)
				} catch {
					;(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight =
						false
				} finally {
					setTimeout(() => {
						if (fetchInFlightRef.current === waId) {
							fetchInFlightRef.current = null
						}
					}, FETCH_IN_FLIGHT_RESET_DELAY_MS)
				}
			} catch (e) {
				setCustomerError((e as Error)?.message || 'Failed to load customer')
				setCustomerLoading(false)
			}
		},
		[waId, customerColumns, customerDataSource]
	)

	const prevWaIdRef = useRef<string | null>(null)
	useEffect(() => {
		try {
			if (prevWaIdRef.current === waId) {
				return
			}

			const phoneCol = customerColumns.findIndex((c) => c.id === 'phone')
			prevWaIdRef.current = waId
			if (phoneCol !== -1) {
				let phoneValue = ''
				if (waId) {
					phoneValue = waId.startsWith('+') ? waId : `+${waId}`
				}
				customerDataSource
					.setCellData(phoneCol, 0, phoneValue)
					.catch((error) => {
						logDocumentCustomerRowWarning(
							`Failed to set phone cell data for waId ${waId}`,
							error
						)
					})

				try {
					const providerWithInternals = (providerRef.current ||
						{}) as unknown as {
						cellCache?: Map<string, unknown>
						editingState?: {
							editedCells?: Map<number, Map<number, unknown>>
						}
					}
					if (providerWithInternals.editingState?.editedCells) {
						const rowMap = providerWithInternals.editingState.editedCells.get(0)
						rowMap?.delete(phoneCol)
					}
					providerWithInternals.cellCache?.delete(`${phoneCol}-0`)
					const gridApi = (
						window as unknown as {
							__docGridApi?: {
								updateCells?: (cells: { cell: [number, number] }[]) => void
							}
						}
					).__docGridApi
					gridApi?.updateCells?.([{ cell: [phoneCol, 0] }])
				} catch (error) {
					logDocumentCustomerRowWarning(
						'Failed to update grid cells after phone column update',
						error
					)
				}
			}
		} catch (error) {
			logDocumentCustomerRowWarning(
				'Error updating phone column when waId changed',
				error
			)
		}
	}, [waId, customerColumns, customerDataSource])

	return {
		customerColumns,
		customerDataSource,
		customerLoading,
		customerError,
		validationErrors,
		onAddRowOverride,
		onDataProviderReady,
		isUnlockReady,
	} as const
}
