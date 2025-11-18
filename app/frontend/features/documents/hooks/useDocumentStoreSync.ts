'use client'

import { useEffect } from 'react'
import type { TLRecord } from 'tldraw'

import type { TldrawStoreState } from './useTldrawStore'

const DEFAULT_SYNC_INTERVAL_MS = 16 // ~60fps

type PendingIds = {
	added: Set<string>
	updated: Set<string>
	removed: Set<string>
}

type UseDocumentStoreSyncParams = {
	editorStoreState: TldrawStoreState
	viewerStoreState: TldrawStoreState
	syncIntervalMs?: number
	enabled?: boolean
}

const createPendingIds = (): PendingIds => ({
	added: new Set<string>(),
	updated: new Set<string>(),
	removed: new Set<string>(),
})

export const useDocumentStoreSync = ({
	editorStoreState,
	viewerStoreState,
	syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS,
	enabled = true,
}: UseDocumentStoreSyncParams): void => {
	useEffect(() => {
		if (!enabled) {
			return
		}

		if (
			editorStoreState.status !== 'ready' ||
			viewerStoreState.status !== 'ready'
		) {
			return
		}

		const editorStore = editorStoreState.store
		const viewerStore = viewerStoreState.store

		if (!(editorStore && viewerStore)) {
			return
		}

		let pendingSync: ReturnType<typeof setTimeout> | null = null
		const pendingIds = createPendingIds()

		const performSync = () => {
			if (
				pendingIds.added.size === 0 &&
				pendingIds.updated.size === 0 &&
				pendingIds.removed.size === 0
			) {
				return
			}

			viewerStore.mergeRemoteChanges(() => {
				const recordsToSync: TLRecord[] = []

				for (const id of pendingIds.added) {
					const record = editorStore.get(id as TLRecord['id'])
					if (record) {
						recordsToSync.push(record)
					}
				}

				for (const id of pendingIds.updated) {
					const record = editorStore.get(id as TLRecord['id'])
					if (record) {
						recordsToSync.push(record)
					}
				}

				if (recordsToSync.length > 0) {
					viewerStore.put(recordsToSync)
				}

				if (pendingIds.removed.size > 0) {
					viewerStore.remove(Array.from(pendingIds.removed) as TLRecord['id'][])
				}
			})

			pendingIds.added.clear()
			pendingIds.updated.clear()
			pendingIds.removed.clear()
		}

		const unsubscribe = editorStore.listen(
			({ changes }) => {
				for (const id of Object.keys(changes.added)) {
					if (
						!(
							id.startsWith('instance') ||
							id.startsWith('pointer') ||
							id.startsWith('presence') ||
							id.startsWith('camera')
						)
					) {
						pendingIds.added.add(id)
						pendingIds.updated.delete(id)
						pendingIds.removed.delete(id)
					}
				}

				for (const id of Object.keys(changes.updated)) {
					if (
						!(
							id.startsWith('instance') ||
							id.startsWith('pointer') ||
							id.startsWith('presence') ||
							id.startsWith('camera')
						)
					) {
						if (!pendingIds.added.has(id)) {
							pendingIds.updated.add(id)
						}
						pendingIds.removed.delete(id)
					}
				}

				for (const id of Object.keys(changes.removed)) {
					if (
						!(
							id.startsWith('instance') ||
							id.startsWith('pointer') ||
							id.startsWith('presence') ||
							id.startsWith('camera')
						)
					) {
						pendingIds.removed.add(id)
						pendingIds.added.delete(id)
						pendingIds.updated.delete(id)
					}
				}

				if (pendingSync) {
					clearTimeout(pendingSync)
				}
				pendingSync = setTimeout(() => {
					performSync()
					pendingSync = null
				}, syncIntervalMs)
			},
			{ scope: 'document', source: 'user' }
		)

		return () => {
			if (pendingSync) {
				clearTimeout(pendingSync)
			}
			unsubscribe()
		}
	}, [editorStoreState, viewerStoreState, syncIntervalMs, enabled])
}
