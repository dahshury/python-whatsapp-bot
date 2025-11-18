'use client'

import { useCallback, useEffect, useState } from 'react'
import type { IDataSource } from '@/shared/libs/data-grid'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'

const LOCK_CHECK_DEBOUNCE_MS = 100

export type UseDocumentCanvasLockStateParams = {
	customerDataSource: IDataSource | null
	waId: string
}

export type UseDocumentCanvasLockStateResult = {
	isCanvasLocked: boolean
	isCheckingLock: boolean
	setIsCanvasLocked: React.Dispatch<React.SetStateAction<boolean>>
}

const hasValidContactDetails = (
	nameValue: unknown,
	phoneValue: unknown
): boolean => {
	const nameOk = typeof nameValue === 'string' && nameValue.trim().length > 0
	const phoneOk =
		typeof phoneValue === 'string' &&
		phoneValue.trim().length > 0 &&
		phoneValue.trim().startsWith('+')
	return nameOk && phoneOk
}

export function useDocumentCanvasLockState({
	customerDataSource,
	waId,
}: UseDocumentCanvasLockStateParams): UseDocumentCanvasLockStateResult {
	const [isCanvasLocked, setIsCanvasLocked] = useState(true)
	const [isCheckingLock, setIsCheckingLock] = useState(false)

	const resolveLockState = useCallback(async (): Promise<boolean> => {
		if (!customerDataSource) {
			return true
		}

		const columns = customerDataSource.getColumnDefinitions()
		const nameCol = columns.findIndex((column) => column.id === 'name')

		if (nameCol === -1) {
			return true
		}

		const nameVal = await customerDataSource.getCellData(nameCol, 0)
		const hasName = typeof nameVal === 'string' && nameVal.trim().length > 0

		if (!hasName) {
			return true
		}

		const isCustomerLoaded = Boolean(
			waId && waId.trim() !== '' && waId !== DEFAULT_DOCUMENT_WA_ID
		)

		if (isCustomerLoaded) {
			return false
		}

		const phoneCol = columns.findIndex((column) => column.id === 'phone')

		if (phoneCol === -1) {
			return true
		}

		const phoneVal = await customerDataSource.getCellData(phoneCol, 0)

		return !hasValidContactDetails(nameVal, phoneVal)
	}, [customerDataSource, waId])

	useEffect(() => {
		let isMounted = true
		setIsCheckingLock(true)

		const evaluate = async () => {
			try {
				const nextLockState = await resolveLockState()
				if (isMounted) {
					setIsCanvasLocked(nextLockState)
					setIsCheckingLock(false)
				}
			} catch {
				if (isMounted) {
					setIsCanvasLocked(true)
					setIsCheckingLock(false)
				}
			}
		}

		// Fire and forget - errors are handled within evaluate
		evaluate().catch(() => {
			// Errors are already handled inside evaluate function
		})

		return () => {
			isMounted = false
		}
	}, [resolveLockState])

	useEffect(() => {
		if (!customerDataSource) {
			return
		}

		const handleDataChange = () => {
			setIsCheckingLock(true)
			setTimeout(() => {
				resolveLockState()
					.then((nextLockState) => {
						setIsCanvasLocked(nextLockState)
						setIsCheckingLock(false)
					})
					.catch(() => {
						setIsCanvasLocked(true)
						setIsCheckingLock(false)
					})
			}, LOCK_CHECK_DEBOUNCE_MS)
		}

		window.addEventListener('doc:unlock-request', handleDataChange)
		window.addEventListener('doc:customer-loaded', handleDataChange)
		window.addEventListener('doc:persist', handleDataChange)

		return () => {
			window.removeEventListener('doc:unlock-request', handleDataChange)
			window.removeEventListener('doc:customer-loaded', handleDataChange)
			window.removeEventListener('doc:persist', handleDataChange)
		}
	}, [customerDataSource, resolveLockState])

	return {
		isCanvasLocked,
		isCheckingLock,
		setIsCanvasLocked,
	}
}
