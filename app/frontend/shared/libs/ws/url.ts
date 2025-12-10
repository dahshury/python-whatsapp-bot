const RADIX_BASE_36 = 36
const RANDOM_STRING_START_INDEX = 2
const TAB_STORAGE_KEY = 'ws_tab_id_v1'
const DEFAULT_WS_PATH = '/ws'

const LOCALHOST_HOSTNAMES = new Set([
	'localhost',
	'127.0.0.1',
	'0.0.0.0',
	'::1',
])

function getOrCreateTabId(): string {
	try {
		if (typeof window === 'undefined') {
			return 'server'
		}
		let id = window.sessionStorage.getItem(TAB_STORAGE_KEY)
		if (!id) {
			id = `${Math.random().toString(RADIX_BASE_36).slice(RANDOM_STRING_START_INDEX)}-${Date.now().toString(RADIX_BASE_36)}`
			window.sessionStorage.setItem(TAB_STORAGE_KEY, id)
		}
		return id
	} catch {
		// Session storage failed - return timestamp-based ID
		return `${Date.now()}`
	}
}

function isLocalHostname(hostname: string | undefined | null): boolean {
	if (!hostname) {
		return false
	}
	const normalized = hostname.trim().toLowerCase()
	if (!normalized) {
		return false
	}
	if (LOCALHOST_HOSTNAMES.has(normalized)) {
		return true
	}
	return normalized.endsWith('.localhost')
}

function normalizeWebSocketCandidate(
	raw: string | undefined | null,
	tabId: string
): string | null {
	if (!raw) {
		return null
	}
	try {
		const url = new URL(raw)
		if (url.protocol === 'http:') {
			url.protocol = 'ws:'
		} else if (url.protocol === 'https:') {
			url.protocol = 'wss:'
		} else if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
			url.protocol = 'ws:'
		}

		if (!url.pathname || url.pathname === '/') {
			url.pathname = DEFAULT_WS_PATH
		}

		url.searchParams.set('tab', tabId)
		return url.toString()
	} catch {
		return null
	}
}

function buildBrowserCandidates(): string[] {
	if (typeof window === 'undefined') {
		return []
	}
	const candidates: string[] = []
	try {
		const { origin, protocol, hostname } = window.location
		const isHttps = protocol === 'https:'

		if (isLocalHostname(hostname) && !isHttps) {
			const localProto = 'http'
			candidates.push(`${localProto}://localhost:8000`)
			if (hostname !== 'localhost') {
				candidates.push(`${localProto}://${hostname}:8000`)
			}
		}

		// Always prefer current origin; normalizeWebSocketCandidate will convert scheme to ws/wss
		candidates.push(origin)
	} catch {
		// Ignore window access errors
	}
	return candidates
}

function buildEnvCandidates(): string[] {
	const candidates: string[] = []
	const explicitWs =
		process.env.NEXT_PUBLIC_BACKEND_WS_URL || process.env.NEXT_PUBLIC_WS_URL
	if (explicitWs) {
		candidates.push(explicitWs)
	}
	if (process.env.NEXT_PUBLIC_BACKEND_URL) {
		candidates.push(process.env.NEXT_PUBLIC_BACKEND_URL)
	}
	return candidates
}

function resolveWebSocketUrl(): string {
	const tab = getOrCreateTabId()
	const candidates = [
		...buildEnvCandidates(),
		...buildBrowserCandidates(),
		'http://localhost:8000',
	]
	for (const candidate of candidates) {
		const resolved = normalizeWebSocketCandidate(candidate, tab)
		if (resolved) {
			return resolved
		}
	}
	try {
		// Final fallback: assume local backend
		const url = new URL('http://localhost:8000')
		url.protocol = 'ws:'
		url.pathname = DEFAULT_WS_PATH
		url.searchParams.set('tab', tab)
		return url.toString()
	} catch {
		// URL construction failed - return hardcoded default
	}
	return `ws://localhost:8000${DEFAULT_WS_PATH}?tab=${encodeURIComponent(tab)}`
}

export { resolveWebSocketUrl, getOrCreateTabId }
