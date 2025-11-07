export { default as useDocumentCustomerRow } from './useDocumentCustomerRow'
export { useEnsureInitialized } from './useEnsureInitialized'
export { useFullscreenManagement as useFullscreen } from './useFullscreenManagement'
export { useDocumentsSection } from './useDocumentsSection'
export { useDocumentCanvas } from './useDocumentCanvas'
export { useTldrawStore } from './useTldrawStore'
export type { TldrawStoreState } from './useTldrawStore'
export { enrichSnapshotWithCamera } from './enrichSnapshotWithCamera'

// Create singleton service instance for document hooks
import { createDocumentsService } from '../services/documents.service.factory'
import { createUseDocuments } from './useDocuments'

const documentsService = createDocumentsService()
const { useGetByWaId, useSave } = createUseDocuments(documentsService)

export { useGetByWaId, useSave }
