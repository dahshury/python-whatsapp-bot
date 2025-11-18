// Public API - Document Hooks
export * from './hooks'
export { default as useDocumentCustomerRow } from './hooks/useDocumentCustomerRow'
// Low-level scene orchestration utilities
export {
	createSceneLoader,
	type DocumentSceneInitialData,
	type DocumentSceneLoader,
	type DocumentSceneSnapshot,
} from './lib/scene-loader'
export {
	createViewerSyncAdapter,
	type ViewerSyncAdapter,
} from './lib/viewer-sync'
export {
	type PersistenceGuardRefs,
	PersistenceGuardsService,
} from './model/persistence-guards'
// Model-level helpers
export { useDocumentTransitionState } from './model/useDocumentTransitionState'
export { useNewCustomerFlow } from './model/useNewCustomerFlow'
export { useWaIdSource } from './model/useWaidSource'
// Utility functions (shared with features/widgets)
export { requestDocumentLoad } from './services/documents.ws.service'
export {
	persistSelectedWaId,
	restoreSelectedWaId,
} from './services/selection-persistence.service'
// UI bridges
export { DocumentAutosaveBridge } from './ui/document-autosave-bridge'
export { DocumentViewerCameraManager } from './ui/document-viewer-camera-manager'
// Template utilities
export * from './utils/template-copy'
