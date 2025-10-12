/**
 * Template document copy logic
 *
 * Handles copying the default template document to new users on first document open.
 */

import { fetchCustomer, saveCustomerDocument } from "@/shared/libs/api";
import { TEMPLATE_USER_WA_ID } from "./default-document";

/**
 * Checks if a user's document has been initialized.
 * A document is considered initialized if:
 * 1. The user exists in the database
 * 2. The user has a non-null document field
 */
export async function isDocumentInitialized(waId: string): Promise<boolean> {
	try {
		const result = (await fetchCustomer(waId)) as unknown as {
			data?: { document?: unknown };
			document?: unknown;
		};
		const rawDoc = (result?.data?.document as unknown) ?? (result?.document as unknown) ?? null;
		const doc = rawDoc as { elements?: unknown[] } | null | undefined;
		const hasElements = Array.isArray(doc?.elements) ? (doc?.elements as unknown[])?.length > 0 : false;
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
		const templateResp = (await fetchCustomer(TEMPLATE_USER_WA_ID)) as unknown as { data?: { document?: unknown } };
		const templateDoc = (templateResp?.data?.document ?? null) as {
			elements?: unknown[];
		} | null;

		const templateHasElements = Array.isArray(templateDoc?.elements)
			? (templateDoc?.elements as unknown[])?.length > 0
			: false;
		if (!templateDoc || !templateHasElements) {
			return false;
		}

		// 2. Save it to the target user
		const result = await saveCustomerDocument({
			waId,
			document: templateDoc,
		});

		const success = Boolean((result as { success?: unknown })?.success) !== false;

		// Proactively broadcast a local external-update so the UI can render immediately
		if (success) {
			try {
				window.dispatchEvent(
					new CustomEvent("documents:external-update", {
						detail: { wa_id: waId, document: templateDoc },
					})
				);
			} catch {}
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
export async function ensureDocumentInitialized(waId: string): Promise<boolean> {
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
