// Service exports
export {
	type AutosaveCallbacks,
	AutosaveOrchestrationService,
	type AutosaveState,
} from './autosave-orchestration.service'
export type {
	AppState,
	CameraSignature,
	CameraState,
} from './canvas-sync.service'
export { CanvasSyncService } from './canvas-sync.service'
export type {
	ClearActionParams,
	ClearActionResult,
} from './clear-action.service'
export { ClearActionService } from './clear-action.service'
export type {
	CustomerRowPersistenceParams,
	CustomerRowPersistenceState,
} from './customer-row-persistence.service'
export { CustomerRowPersistenceService } from './customer-row-persistence.service'
// Save process exports (to be gradually deprecated as hooks are refactored)
export {
	createIdleAutosaveController,
	createIntervalAutosaveController,
	type DocumentPayload,
	type IdleAutosaveControllerOptions,
	type IntervalAutosaveControllerOptions,
	type SaveResult,
} from './document-save.process'
// Existing service exports
export { createDocumentsService } from './documents.service.factory'
export { requestDocumentLoad } from './documents.ws.service'
// SceneChangeDetectionService removed - logic inlined in useSceneChangeHandler for performance
export type {
	UnlockValidationParams,
	UnlockValidationResult,
} from './unlock-validation.service'
export { UnlockValidationService } from './unlock-validation.service'
