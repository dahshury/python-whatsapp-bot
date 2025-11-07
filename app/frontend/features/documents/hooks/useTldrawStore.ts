import { useEffect, useMemo, useRef, useState } from 'react'
import {
	createTLStore,
	loadSnapshot,
	type TLStore,
	type TLStoreSnapshot,
} from 'tldraw'

export type TldrawStoreState =
	| { status: 'loading' }
	| { status: 'ready'; store: TLStore }
	| { status: 'error'; error?: unknown }

type UseTldrawStoreArgs = {
	snapshot: unknown
	isLoading: boolean
	hasError?: boolean
	error?: unknown
	waId?: string | null
}

/**
 * Initializes a TLDraw store asynchronously using the provided snapshot.
 * Creates the store once per waId and reuses it, only loading snapshots when they change.
 * Mirrors the TLDraw documentation pattern for loading remote snapshots.
 */
export function useTldrawStore({
	snapshot,
	isLoading,
	hasError,
	error,
	waId,
}: UseTldrawStoreArgs): TldrawStoreState {
	// Create store once per waId - don't recreate on snapshot changes
	const storeRef = useRef<TLStore | null>(null)
	const lastWaIdRef = useRef<string | null>(null)
	const lastSnapshotRef = useRef<string>('')

	const [storeState, setStoreState] = useState<TldrawStoreState>({
		status: 'loading',
	})

	// Create store once per waId
	const store = useMemo(() => {
		// If waId changed, create new store
		if (waId !== lastWaIdRef.current) {
			lastWaIdRef.current = waId ?? null
			// Reset snapshot ref when waId changes
			lastSnapshotRef.current = ''
			storeRef.current = createTLStore()
			return storeRef.current
		}
		// Reuse existing store or create if doesn't exist
		if (!storeRef.current) {
			storeRef.current = createTLStore()
		}
		return storeRef.current
	}, [waId])

	// Load snapshot when it changes (but don't recreate store)
	useEffect(() => {
		let cancelled = false

		async function initializeStore() {
			if (hasError) {
				setStoreState({ status: 'error', error })
				return
			}

			if (isLoading) {
				setStoreState({ status: 'loading' })
				return
			}

			setStoreState({ status: 'loading' })

			try {
				// Serialize snapshot to detect changes
				const snapshotString = snapshot
					? JSON.stringify(snapshot)
					: ''

				// Only load if snapshot actually changed
				if (
					snapshot &&
					typeof snapshot === 'object' &&
					snapshotString !== lastSnapshotRef.current
				) {
					// loadSnapshot expects { document, session } format
					// If snapshot is just document records, wrap it properly
					let snapshotToLoad: TLStoreSnapshot
					
					if ('document' in snapshot || 'session' in snapshot || 'store' in snapshot || 'schema' in snapshot) {
						// Already in correct format (TLStoreSnapshot or { document, session })
						snapshotToLoad = snapshot as TLStoreSnapshot
					} else {
						// It's just document records - wrap it in { document, session } format
						snapshotToLoad = {
							document: snapshot as Record<string, unknown>,
							session: {},
						} as TLStoreSnapshot
					}

					// Use mergeRemoteChanges to prevent triggering listeners during load
					store.mergeRemoteChanges(() => {
						loadSnapshot(store, snapshotToLoad)
					})
					lastSnapshotRef.current = snapshotString
				}

				if (!cancelled) {
					setStoreState({ status: 'ready', store })
				}
			} catch (loadError) {
				if (!cancelled) {
					setStoreState({ status: 'error', error: loadError })
				}
			}
		}

		initializeStore()

		return () => {
			cancelled = true
		}
	}, [snapshot, isLoading, hasError, error, store])

	return storeState
}
