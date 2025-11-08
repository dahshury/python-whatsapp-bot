export { enrichSnapshotWithCamera } from "./enrichSnapshotWithCamera";
export { useCanvasLoadingProgress } from "./useCanvasLoadingProgress";
export { useDefaultDocumentCopy } from "./useDefaultDocumentCopy";
export { useDocumentCanvas } from "./useDocumentCanvas";
export { default as useDocumentCustomerRow } from "./useDocumentCustomerRow";
export { useDocumentsSection } from "./useDocumentsSection";
export { useEnsureInitialized } from "./useEnsureInitialized";
export { useFullscreenManagement as useFullscreen } from "./useFullscreenManagement";
export type { TldrawStoreState } from "./useTldrawStore";
export { useTldrawStore } from "./useTldrawStore";

// Create singleton service instance for document hooks
import { createDocumentsService } from "../services/documents.service.factory";
import { createUseDocuments } from "./useDocuments";

const documentsService = createDocumentsService();
const { useGetByWaId, useSave } = createUseDocuments(documentsService);

export { useGetByWaId, useSave };
