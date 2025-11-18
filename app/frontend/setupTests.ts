// Vitest setup for frontend (jsdom)
import '@testing-library/jest-dom'

// Polyfill: React 19 testing-library events may need TextEncoder in jsdom
if (!(global as unknown as { TextEncoder?: unknown }).TextEncoder) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { TextEncoder, TextDecoder } = require('node:util')
	;(global as unknown as { TextEncoder?: unknown }).TextEncoder = TextEncoder
	;(global as unknown as { TextDecoder?: unknown }).TextDecoder =
		TextDecoder as unknown as typeof global.TextDecoder
}

// Silence React act warnings in certain async scenarios if they occur
// (We keep this minimal; prefer fixing tests over muting.)
