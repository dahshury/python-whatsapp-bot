// Public API - Hooks only
export * from "./hooks";
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
} from "./hooks";
export { default as useDocumentCustomerRow } from "./hooks/useDocumentCustomerRow";
export { default as useDocumentScene } from "./hooks/useDocumentScene";
// Low-level scene orchestration utilities
export {
  createSceneLoader,
  type DocumentSceneInitialData,
  type DocumentSceneLoader,
  type DocumentSceneSnapshot,
} from "./lib/scene-loader";
export {
  createViewerSyncAdapter,
  type ViewerSyncAdapter,
} from "./lib/viewer-sync";
export {
  type PersistenceGuardRefs,
  PersistenceGuardsService,
} from "./model/persistence-guards";
// Model-level helpers
export { useDocumentTransitionState } from "./model/useDocumentTransitionState";
export { useNewCustomerFlow } from "./model/useNewCustomerFlow";
export { useWaIdSource } from "./model/useWaidSource";
// Utility functions (shared with features/widgets)
export { requestDocumentLoad } from "./services/documents.ws.service";
export {
  persistSelectedWaId,
  restoreSelectedWaId,
} from "./services/selection-persistence.service";
// Template utilities
export * from "./utils/template-copy";
