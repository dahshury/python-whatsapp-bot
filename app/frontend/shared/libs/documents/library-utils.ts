/**
 * Library storage and management utilities for Excalidraw
 * Global persistence across the app (not per user/document)
 */

export type LibraryItem = {
	id: string;
	status: "published" | "unpublished";
	elements: unknown[];
	created?: number;
};

export type LibraryItems = LibraryItem[];

// Global storage key (shared across all canvases/users on this device)
const LIBRARY_STORAGE_KEY_GLOBAL = "excalidraw-library-global";

/**
 * Get global library items from localStorage
 */
export function getGlobalLibraryItems(): LibraryItems {
	try {
		const stored = localStorage.getItem(LIBRARY_STORAGE_KEY_GLOBAL);
		if (!stored) {
			return [];
		}
		const parsed = JSON.parse(stored) as LibraryItems;
		return Array.isArray(parsed) ? parsed : [];
	} catch (_error) {
		return [];
	}
}

/**
 * Save global library items to localStorage
 */
export function saveGlobalLibraryItems(items: LibraryItems): void {
	try {
		localStorage.setItem(LIBRARY_STORAGE_KEY_GLOBAL, JSON.stringify(items));
	} catch {
		// Silently ignore localStorage errors (e.g., quota exceeded, private browsing)
	}
}

/**
 * Merge new library items with existing ones
 * New items are added to the beginning
 */
export function mergeLibraryItems(
	existingItems: LibraryItems,
	newItems: LibraryItems
): LibraryItems {
	const existingIds = new Set(existingItems.map((item) => item.id));
	const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id));
	return [...uniqueNewItems, ...existingItems];
}

/**
 * Clear global library items
 */
export function clearGlobalLibraryItems(): void {
	try {
		localStorage.removeItem(LIBRARY_STORAGE_KEY_GLOBAL);
	} catch {
		// Silently ignore localStorage errors (e.g., quota exceeded, private browsing)
	}
}
