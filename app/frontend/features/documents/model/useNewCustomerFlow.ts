import type { MutableRefObject } from 'react'
import { useCallback, useRef } from 'react'
import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import type { DataProvider } from '@/shared/libs/data-grid/components/core/services/DataProvider'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import { i18n } from '@/shared/libs/i18n'
import { toastService } from '@/shared/libs/toast'
import { createUseDocuments } from '../hooks/useDocuments'
import type {
	DocumentSceneLoader,
	DocumentSceneSnapshot,
} from '../lib/scene-loader'
import type { ViewerSyncAdapter } from '../lib/viewer-sync'
import { ClearActionService } from '../services/clear-action.service'
import { createDocumentsService } from '../services/documents.service.factory'
import { isGridCellValid } from '../services/unlock-validation.service'
import { ensureDocumentInitialized } from '../utils/template-copy'
import {
	ANALYTICS_SAFE_WA_ID_LENGTH,
	NEW_CUSTOMER_SUPPRESS_CLEANUP_DELAY_MS,
	NEW_CUSTOMER_SUPPRESS_WINDOW_MS,
} from './persistence-constants'
import {
	type PersistenceGuardRefs,
	PersistenceGuardsService,
} from './persistence-guards'

type NewCustomerDraft = {
	active: boolean
	pendingWaId: string | null
}

const documentsServiceInstance = createDocumentsService()
const { useSave: useDocumentsSave } = createUseDocuments(
	documentsServiceInstance
)

const UNKNOWN_SAVE_ERROR_MESSAGE = 'Unknown error'
const TEMPLATE_NOT_READY_ERROR_CODE = 'documents/template-not-ready'

const extractErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message || UNKNOWN_SAVE_ERROR_MESSAGE
	}
	if (typeof error === 'string') {
		return error
	}
	try {
		return JSON.stringify(error)
	} catch {
		return UNKNOWN_SAVE_ERROR_MESSAGE
	}
}

export type UseNewCustomerFlowParams = {
	sceneLoaderRef: MutableRefObject<DocumentSceneLoader>
	viewerSyncAdapterRef: MutableRefObject<ViewerSyncAdapter>
	persistenceGuards: PersistenceGuardRefs
	ensureInitialized: (waId: string) => Promise<unknown>
	initializeCamera: (viewerCamera: Record<string, unknown>) => void
	pendingInitialLoadWaIdRef: MutableRefObject<string | null>
	currentWaIdRef: MutableRefObject<string | null>
	viewerSigRef: MutableRefObject<string | null>
	editorSigRef: MutableRefObject<string | null>
	viewerCameraRef: MutableRefObject<Record<string, unknown>>
	replaceWaIdInUrl: (value: string | null) => void
	persistWaId: (value: string | null) => void
	setWaId: (value: string) => void
	setIsUnlocked: (value: boolean) => void
	applySceneSnapshot: (snapshot: DocumentSceneSnapshot) => void
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
	providerRef: MutableRefObject<DataProvider | null>
	ignorePersistDelayMs: number
}

export type UseNewCustomerFlowResult = {
	handleCompleteNewCustomer: (input: {
		name: string
		phone: string
		age: number | null
	}) => Promise<string | null>
	handleCreateNewCustomer: () => Promise<void>
}

export function useNewCustomerFlow(
	params: UseNewCustomerFlowParams
): UseNewCustomerFlowResult {
	const {
		sceneLoaderRef,
		viewerSyncAdapterRef,
		persistenceGuards,
		ensureInitialized,
		initializeCamera,
		pendingInitialLoadWaIdRef,
		currentWaIdRef,
		viewerSigRef,
		editorSigRef,
		viewerCameraRef,
		replaceWaIdInUrl,
		persistWaId,
		setWaId,
		setIsUnlocked,
		applySceneSnapshot,
		customerDataSource,
		customerColumns,
		providerRef,
		ignorePersistDelayMs,
	} = params

	const newCustomerDraftRef = useRef<NewCustomerDraft>({
		active: false,
		pendingWaId: null,
	})

	const { mutateAsync: saveDocumentMutation } = useDocumentsSave()

	const handleCompleteNewCustomer = useCallback<
		UseNewCustomerFlowResult['handleCompleteNewCustomer']
	>(
		async ({ name, phone, age }) => {
			if (!newCustomerDraftRef.current.active) {
				return null
			}

			const trimmedName = (name || '').trim()
			const digits = (phone || '').replace(/\D+/g, '')

			if (!(trimmedName && digits)) {
				return null
			}

			const columns = Array.isArray(customerColumns)
				? (customerColumns as Array<{ id?: unknown; name?: unknown }>)
				: []
			const resolveColumnIndex = (identifier: string): number => {
				for (let idx = 0; idx < columns.length; idx += 1) {
					const column = columns[idx]
					const colId =
						(typeof column?.id === 'string' && column.id) ||
						(typeof column?.name === 'string'
							? (column.name as string)
							: undefined)
					if (colId === identifier) {
						return idx
					}
				}
				return -1
			}

			const nameColumnIndex = resolveColumnIndex('name')
			const phoneColumnIndex = resolveColumnIndex('phone')
			const provider = providerRef.current
			const gridNameValid = isGridCellValid(provider, nameColumnIndex, 0)
			const gridPhoneValid = isGridCellValid(provider, phoneColumnIndex, 0)

			if (!(gridNameValid && gridPhoneValid)) {
				return null
			}

			if (newCustomerDraftRef.current.pendingWaId) {
				return newCustomerDraftRef.current.pendingWaId
			}

			const waIdCandidate = digits
			newCustomerDraftRef.current.pendingWaId = waIdCandidate

			try {
				const didPersist = await saveDocumentMutation({
					waId: waIdCandidate,
					snapshot: {
						name: trimmedName,
						age: age ?? null,
					},
				})

				if (!didPersist) {
					throw new Error('Document save returned an unsuccessful response')
				}

				await ensureInitialized(waIdCandidate)

				const templateReady = await ensureDocumentInitialized(waIdCandidate)
				if (!templateReady) {
					const analyticsSafeWaId = waIdCandidate.slice(
						-ANALYTICS_SAFE_WA_ID_LENGTH
					)
					throw Object.assign(
						new Error(
							`Template document was unavailable (customer ****${analyticsSafeWaId}).`
						),
						{ code: TEMPLATE_NOT_READY_ERROR_CODE }
					)
				}

				const fetchedDocument =
					await documentsServiceInstance.getByWaId(waIdCandidate)
				const fetchedSnapshot =
					(fetchedDocument?.document as
						| Record<string, unknown>
						| null
						| undefined) ?? null

				const loader = sceneLoaderRef.current
				const viewerAdapter = viewerSyncAdapterRef.current

				PersistenceGuardsService.scheduleIgnoreWindow(
					persistenceGuards,
					ignorePersistDelayMs
				)

				pendingInitialLoadWaIdRef.current = waIdCandidate
				currentWaIdRef.current = waIdCandidate
				viewerSigRef.current = null
				editorSigRef.current = null
				viewerCameraRef.current = {}
				initializeCamera({})

				const blankSnapshot = loader.beginTransition(waIdCandidate)
				applySceneSnapshot(blankSnapshot)
				viewerAdapter.reset('documents:new-customer-complete')
				replaceWaIdInUrl(waIdCandidate)
				persistWaId(waIdCandidate)
				setWaId(waIdCandidate)
				setIsUnlocked(false)

				const resolvedSnapshot = loader.resolveScene(
					waIdCandidate,
					fetchedSnapshot
				)
				applySceneSnapshot(resolvedSnapshot)
				viewerAdapter.applyScene(
					{
						elements: resolvedSnapshot.elements ?? [],
						appState:
							(resolvedSnapshot.viewerAppState as
								| Record<string, unknown>
								| undefined) ??
							resolvedSnapshot.appState ??
							{},
						files: resolvedSnapshot.files ?? {},
					},
					'documents:new-customer-initialized'
				)

				pendingInitialLoadWaIdRef.current = null

				try {
					window.dispatchEvent(
						new CustomEvent('doc:customer-loaded', {
							detail: { waId: waIdCandidate },
						})
					)
				} catch {
					// Ignore dispatch issues (e.g., server-side rendering contexts)
				}

				try {
					window.dispatchEvent(
						new CustomEvent('doc:unlock-request', {
							detail: { waId: waIdCandidate },
						})
					)
				} catch {
					// Ignore unlock request dispatch failures
				}

				toastService.success(i18n.getMessage('saved', false))

				newCustomerDraftRef.current = {
					active: false,
					pendingWaId: null,
				}

				return waIdCandidate
			} catch (error) {
				newCustomerDraftRef.current = { active: true, pendingWaId: null }
				const errorDetails = extractErrorMessage(error)
				const isTemplateInitializationIssue =
					(error as { code?: unknown })?.code === TEMPLATE_NOT_READY_ERROR_CODE
				const description = isTemplateInitializationIssue
					? `${errorDetails}

Please ensure the default document exists and contains at least one element, then try again.`
					: errorDetails

				toastService.error(i18n.getMessage('save_failed', false), description)
				return null
			}
		},
		[
			applySceneSnapshot,
			ensureInitialized,
			initializeCamera,
			persistenceGuards,
			pendingInitialLoadWaIdRef,
			currentWaIdRef,
			viewerSigRef,
			editorSigRef,
			viewerCameraRef,
			sceneLoaderRef,
			viewerSyncAdapterRef,
			replaceWaIdInUrl,
			persistWaId,
			setWaId,
			setIsUnlocked,
			ignorePersistDelayMs,
			saveDocumentMutation,
			customerColumns,
			providerRef.current,
		]
	)

	const handleCreateNewCustomer = useCallback<
		UseNewCustomerFlowResult['handleCreateNewCustomer']
	>(async () => {
		if (!customerDataSource) {
			return
		}

		newCustomerDraftRef.current = { active: true, pendingWaId: null }

		PersistenceGuardsService.scheduleIgnoreWindow(
			persistenceGuards,
			ignorePersistDelayMs
		)

		PersistenceGuardsService.scheduleGlobalSuppress(
			NEW_CUSTOMER_SUPPRESS_WINDOW_MS,
			NEW_CUSTOMER_SUPPRESS_CLEANUP_DELAY_MS
		)

		viewerSigRef.current = null
		editorSigRef.current = null
		viewerCameraRef.current = {}
		initializeCamera({})

		pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID
		currentWaIdRef.current = DEFAULT_DOCUMENT_WA_ID
		replaceWaIdInUrl(null)
		persistWaId(null)

		setWaId(DEFAULT_DOCUMENT_WA_ID)

		await new Promise((resolve) => setTimeout(resolve, 0))

		try {
			await ClearActionService.clearRow({
				customerDataSource: customerDataSource as IDataSource,
				customerColumns,
				providerRef,
			})
		} catch {
			// Grid clear failed, but continue with canvas reset
		}

		const blankSnapshot = sceneLoaderRef.current.beginTransition(
			DEFAULT_DOCUMENT_WA_ID
		)
		applySceneSnapshot(blankSnapshot)
		viewerSyncAdapterRef.current.reset('documents:new-customer')

		setIsUnlocked(false)
	}, [
		customerColumns,
		customerDataSource,
		initializeCamera,
		persistenceGuards,
		persistWaId,
		providerRef,
		replaceWaIdInUrl,
		sceneLoaderRef,
		viewerSigRef,
		editorSigRef,
		viewerCameraRef,
		pendingInitialLoadWaIdRef,
		currentWaIdRef,
		setWaId,
		applySceneSnapshot,
		viewerSyncAdapterRef,
		setIsUnlocked,
		ignorePersistDelayMs,
	])

	return {
		handleCompleteNewCustomer,
		handleCreateNewCustomer,
	} as const
}
