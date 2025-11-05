/**
 * Template document copy logic
 *
 * Handles copying the default template document to new users on first document open.
 */

import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents/default-document";
import { createDocumentsService } from "../services/documents.service.factory";

/**
 * Checks if a user's document has been initialized.
 * A document is considered initialized if:
 * 1. The user exists in the database
 * 2. The user has a non-null document field
 */
export async function isDocumentInitialized(waId: string): Promise<boolean> {
  try {
    const svc = createDocumentsService();
    const result = await svc.getByWaId(waId);
    const rawDoc = result?.document ?? null;
    const doc = rawDoc as { elements?: unknown[] } | null | undefined;
    const hasElements = Array.isArray(doc?.elements)
      ? (doc?.elements as unknown[])?.length > 0
      : false;
    const hasDocument = Boolean(doc !== null && doc !== undefined);
    const initialized = Boolean(hasDocument && hasElements);
    return initialized;
  } catch {
    // If user doesn't exist or error, assume not initialized
    return false;
  }
}

/**
 * Copies the template document from TEMPLATE_USER to a target user.
 * This should be called when a user opens their document for the first time.
 */
export async function copyTemplateToUser(waId: string): Promise<boolean> {
  try {
    // 1. Fetch the template document
    const svc = createDocumentsService();
    const templateResp = await svc.getByWaId(TEMPLATE_USER_WA_ID);
    const templateDoc = (templateResp?.document ?? null) as {
      elements?: unknown[];
    } | null;

    const templateHasElements = Array.isArray(templateDoc?.elements)
      ? (templateDoc?.elements as unknown[])?.length > 0
      : false;
    if (!(templateDoc && templateHasElements)) {
      return false;
    }

    // 2. Save it to the target user
    const ok = await svc.save(waId, { document: templateDoc });

    const success = Boolean(ok);

    // Proactively broadcast a local external-update so the UI can render immediately
    if (success) {
      try {
        window.dispatchEvent(
          new CustomEvent("documents:external-update", {
            detail: { wa_id: waId, document: templateDoc },
          })
        );
      } catch {
        // Silently ignore errors in event dispatch (e.g., no listeners or context issues)
      }
    }

    return success;
  } catch {
    return false;
  }
}

/**
 * Ensures a user's document is initialized with the template if needed.
 * Returns true if document is ready (either already exists or was successfully copied).
 */
export async function ensureDocumentInitialized(
  waId: string
): Promise<boolean> {
  // Don't try to initialize the blank document or template user
  if (!waId || waId === "" || waId === TEMPLATE_USER_WA_ID) {
    return true;
  }

  const initialized = await isDocumentInitialized(waId);

  if (initialized) {
    return true;
  }

  // removed console logging
  const copied = await copyTemplateToUser(waId);
  return copied;
}
