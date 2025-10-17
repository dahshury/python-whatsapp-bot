// biome-ignore lint/performance/noBarrelFile: Intentional centralized export for public API
export {
	DEFAULT_DOCUMENT_WA_ID,
	DEFAULT_EXCALIDRAW_SCENE,
	TEMPLATE_USER_WA_ID,
} from "./default-document";
export type { LibraryItem, LibraryItems } from "./library-utils";
export {
	clearGlobalLibraryItems,
	getGlobalLibraryItems,
	mergeLibraryItems,
	saveGlobalLibraryItems,
} from "./library-utils";
export { setDocSavingFlags } from "./save-flags";
export {
	computeSceneSignature,
	computeViewerCameraSig,
	normalizeForPersist,
	stableStringify,
	toSceneFromDoc,
} from "./scene-utils";
export {
	copyTemplateToUser,
	ensureDocumentInitialized,
	isDocumentInitialized,
} from "./template-copy";
