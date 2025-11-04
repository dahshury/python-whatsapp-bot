import { BACKEND_CONNECTION } from '@/shared/config'

type BackendConnectionStatus = 'connected' | 'checking' | 'disconnected'

export type BackendConnectionFailure = {
	reason?: string
	message?: string
	status?: number
	url?: string
	responsePreview?: string
	receivedAt: number
}

export type BackendConnectionSnapshot = {
	status: BackendConnectionStatus
	lastError?: BackendConnectionFailure
}

type BackendConnectionFailureInput = Partial<
	Omit<BackendConnectionFailure, 'receivedAt'>
> & {
	reason?: string
	responseBody?: string
}

type Listener = () => void

const listeners = new Set<Listener>()

const initialSnapshot: BackendConnectionSnapshot = {
	status: 'connected',
}

let snapshot: BackendConnectionSnapshot = initialSnapshot

function emit() {
	for (const listener of listeners) {
		listener()
	}
}

function areFailuresEqual(
	a?: BackendConnectionFailure,
	b?: BackendConnectionFailure
) {
	if (a === b) {
		return true
	}
	if (!(a && b)) {
		return false
	}
	return (
		a.reason === b.reason &&
		a.message === b.message &&
		a.status === b.status &&
		a.url === b.url &&
		a.responsePreview === b.responsePreview
	)
}

function toFailure(
	input: BackendConnectionFailureInput,
	previous?: BackendConnectionFailure
): BackendConnectionFailure {
	const failure: BackendConnectionFailure = {
		receivedAt: Date.now(),
	}
	const reason = input.reason?.trim() || previous?.reason
	if (reason) {
		failure.reason = reason
	}
	const message = input.message?.trim() || previous?.message
	if (message) {
		failure.message = message
	}
	const status = input.status ?? previous?.status
	if (typeof status === 'number') {
		failure.status = status
	}
	const url = input.url ?? previous?.url
	if (url) {
		failure.url = url
	}
	const previewSource = input.responseBody
		? input.responseBody.slice(
				0,
				BACKEND_CONNECTION.RESPONSE_PREVIEW_MAX_LENGTH
			)
		: (input.responsePreview ?? previous?.responsePreview)
	if (previewSource) {
		failure.responsePreview = previewSource
	}
	return failure
}

export function subscribe(listener: Listener): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function getSnapshot(): BackendConnectionSnapshot {
	return snapshot
}

export function getServerSnapshot(): BackendConnectionSnapshot {
	return initialSnapshot
}

export function markBackendConnected(): void {
	if (snapshot.status === 'connected' && !snapshot.lastError) {
		return
	}
	snapshot = {
		status: 'connected',
	}
	emit()
}

export function markBackendChecking(reason?: string): void {
	const existingError = snapshot.lastError
	let nextError: BackendConnectionFailure | undefined
	if (existingError) {
		nextError = { ...existingError, receivedAt: Date.now() }
	} else if (reason?.trim()) {
		nextError = {
			reason: reason.trim(),
			receivedAt: Date.now(),
		}
	}
	const next: BackendConnectionSnapshot = {
		status: 'checking',
		...(nextError ? { lastError: nextError } : {}),
	}
	if (
		snapshot.status === next.status &&
		areFailuresEqual(snapshot.lastError, next.lastError)
	) {
		return
	}
	snapshot = next
	emit()
}

export function markBackendDisconnected(
	reason: BackendConnectionFailureInput
): void {
	const failure = toFailure(reason, snapshot.lastError)
	const next: BackendConnectionSnapshot = {
		status: 'disconnected',
		lastError: failure,
	}
	if (
		snapshot.status === next.status &&
		areFailuresEqual(snapshot.lastError, next.lastError)
	) {
		return
	}
	snapshot = next
	emit()
}

export const backendConnectionStore = {
	subscribe,
	getSnapshot,
	getServerSnapshot,
	markConnected: markBackendConnected,
	markChecking: markBackendChecking,
	markDisconnected: markBackendDisconnected,
}

export type { BackendConnectionStatus }
