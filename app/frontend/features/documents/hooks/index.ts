// Main hook export

export type {
  AutosaveCallbacks,
  UseAutosaveControllersOptions,
} from "./useAutosaveControllers";
export { useAutosaveControllers } from "./useAutosaveControllers";
export type { UseCanvasSynchronizationParams } from "./useCanvasSynchronization";
export { useCanvasSynchronization } from "./useCanvasSynchronization";
export type { UseClearActionParams } from "./useClearAction";
export { useClearAction } from "./useClearAction";
export type { UseCustomerLoadedEventParams } from "./useCustomerLoadedEvent";
export { useCustomerLoadedEvent } from "./useCustomerLoadedEvent";
export type { UseCustomerRowPersistenceParams } from "./useCustomerRowPersistence";
export { useCustomerRowPersistence } from "./useCustomerRowPersistence";
export type { UseCustomerSelectionParams } from "./useCustomerSelection";
export { useCustomerSelection } from "./useCustomerSelection";
export type { UseDocumentEventsOptions } from "./useDocumentEvents";
export { useDocumentEvents } from "./useDocumentEvents";
export type { UseDocumentLoadOptions } from "./useDocumentLoad";
export { useDocumentLoad } from "./useDocumentLoad";
export { default as useDocumentScene } from "./useDocumentScene";
// Document mutation hooks (factory-based)
export { createUseDocuments } from "./useDocuments";
export type {
  UseDocumentsSectionParams,
  UseDocumentsSectionResult,
} from "./useDocumentsSection";
export { useDocumentsSection } from "./useDocumentsSection";
export type { ExcalidrawAPI } from "./useExcalidrawAPI";
// Sub-hooks for advanced usage
export { useExcalidrawAPI } from "./useExcalidrawAPI";
export type { UseExternalDocumentUpdatesParams } from "./useExternalDocumentUpdates";
export { useExternalDocumentUpdates } from "./useExternalDocumentUpdates";
export type { UseFullscreenManagementParams } from "./useFullscreenManagement";
export { useFullscreenManagement } from "./useFullscreenManagement";
export type { UsePersistTriggerParams } from "./usePersistTrigger";
export { usePersistTrigger } from "./usePersistTrigger";
export type {
  SceneChangePayload,
  UseSceneChangeHandlerOptions,
} from "./useSceneChangeHandler";
export { useSceneChangeHandler } from "./useSceneChangeHandler";
export type { UseSceneInitializationParams } from "./useSceneInitialization";
export { useSceneInitialization } from "./useSceneInitialization";
export type { UseUnlockValidationParams } from "./useUnlockValidation";
export { useUnlockValidation } from "./useUnlockValidation";
export type { UseViewerApiReadyParams } from "./useViewerApiReady";
export { useViewerApiReady } from "./useViewerApiReady";

import { createDocumentsService } from "../services/documents.service.factory";
// Instantiate and export specific hooks
import { createUseDocuments } from "./useDocuments";

const documentsHooks = createUseDocuments(createDocumentsService());

export const useSave = documentsHooks.useSave;
export const useEnsureInitialized = documentsHooks.useEnsureInitialized;
export const useGetByWaId = documentsHooks.useGetByWaId;
