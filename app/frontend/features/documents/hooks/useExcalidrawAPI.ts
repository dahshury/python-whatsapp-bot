import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useCallback, useRef } from 'react'

export type ExcalidrawAPI = ExcalidrawImperativeAPI

/**
 * Hook for managing the Excalidraw API reference.
 * Provides a stable API reference and callback for initialization.
 *
 * @example
 * ```typescript
 * const { apiRef, onExcalidrawAPI } = useExcalidrawAPI()
 * // Pass onExcalidrawAPI to Excalidraw component
 * ```
 */
export const useExcalidrawAPI = () => {
	const apiRef = useRef<ExcalidrawAPI | null>(null)

	const onExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
		apiRef.current = api
	}, [])

	return { apiRef, onExcalidrawAPI } as const
}
