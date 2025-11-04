// Public API - Hooks only
export * from './hooks'
export {
	useCanvasSynchronization,
	useClearAction,
	useCustomerLoadedEvent,
	useCustomerRowPersistence,
	useCustomerSelection,
	useDocumentsSection,
	useEnsureInitialized,
	useExternalDocumentUpdates,
	useFullscreenManagement,
	useGetByWaId,
	usePersistTrigger,
	useSave,
	useSceneInitialization,
	useUnlockValidation,
	useViewerApiReady,
} from './hooks'
export { default as useDocumentCustomerRow } from './hooks/useDocumentCustomerRow'
export { default as useDocumentScene } from './hooks/useDocumentScene'

// Utility functions (shared with features/widgets)
export { requestDocumentLoad } from './services/documents.ws.service'
export {
	persistSelectedWaId,
	restoreSelectedWaId,
} from './services/selection-persistence.service'

// Template utilities
export * from './utils/template-copy'
