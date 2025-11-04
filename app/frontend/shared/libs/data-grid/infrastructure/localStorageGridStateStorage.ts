import type { GridStateStorage } from '../core/persistence/gridStateStorage'

class LocalStorageGridStateStorage implements GridStateStorage {
	private readonly fallback = new Map<string, string>()

	private get ls(): Storage | null {
		try {
			if (window?.localStorage) {
				return window.localStorage
			}
			return null
		} catch {
			return null
		}
	}

	getItem(key: string): string | null {
		const store = this.ls
		if (store) {
			return store.getItem(key)
		}
		return this.fallback.get(key) ?? null
	}

	setItem(key: string, value: string): void {
		const store = this.ls
		if (store) {
			store.setItem(key, value)
			return
		}
		this.fallback.set(key, value)
	}

	removeItem(key: string): void {
		const store = this.ls
		if (store) {
			store.removeItem(key)
			return
		}
		this.fallback.delete(key)
	}

	exists(key: string): boolean {
		const store = this.ls
		if (store) {
			return store.getItem(key) !== null
		}
		return this.fallback.has(key)
	}
}

export function createLocalStorageGridStateStorage(): GridStateStorage {
	return new LocalStorageGridStateStorage()
}
