/**
 * Storage Port (Hexagonal Architecture)
 * Defines the contract for persistent storage (localStorage, etc.) independent of implementation.
 */

export type StoragePort = {
	getItem(key: string): string | null
	setItem(key: string, value: string): void
	removeItem(key: string): void
	clear(): void
}
