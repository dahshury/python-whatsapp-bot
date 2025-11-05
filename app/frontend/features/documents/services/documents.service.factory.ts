import { DocumentApiRepository } from "@/entities/document";
import { DocumentsService } from "./documents.service";

export const createDocumentsService = () => {
  const repo = new DocumentApiRepository();
  return DocumentsService(repo);
};
