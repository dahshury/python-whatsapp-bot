// Core domain exports
export { DocumentDomain } from "./core/document.domain";
export {
  createDocumentFromDto,
  createEmptyDocument,
  createNewDocument,
} from "./core/document.factory";
export type { DocumentRepository } from "./core/document.repository";
export type { SceneElements } from "./core/scene-state.domain";
export { SceneState } from "./core/scene-state.domain";
export {
  DocumentEventsAdapter,
  type DocumentExternalUpdateEvent,
  type DocumentSceneAppliedEvent,
} from "./infrastructure/adapters/document-events.adapter";
// Infrastructure exports
export { DOCUMENT_QUERY_KEY } from "./infrastructure/api/document.query-key";
export type { DocumentDto } from "./infrastructure/dto/document.dto";
export { DocumentApiRepository } from "./infrastructure/repository/document.api.repository";

// Mapper exports
export { documentToDto } from "./mapper/document.mapper";

// Type exports
export type { DocumentEntity } from "./types/document.types";
export type {
  DocumentScene,
  SceneChangePayload,
  SceneLoadOptions,
  SceneSaveResult,
} from "./types/scene.types";

// UI exports
export * from "./ui/DocumentIcon";
export type { CameraStateProps } from "./value-objects/camera-state.vo";
export { CameraState } from "./value-objects/camera-state.vo";
// Value object exports
export * from "./value-objects/document-title.vo";
export { SceneSignature } from "./value-objects/scene-signature.vo";
