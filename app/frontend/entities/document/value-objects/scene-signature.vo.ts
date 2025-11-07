import { ValueObject } from '@/shared/domain/value-object'
import { computeSceneSignature } from '@/shared/libs/documents'
import type { CameraState } from './camera-state.vo'

/**
 * Value Object representing a unique signature/hash of a document scene.
 * Used for change detection and determining if a save is needed.
 *
 * @example
 * ```typescript
 * const signature = SceneSignature.compute(elements, appState, files)
 * const withCamera = SceneSignature.computeWithCamera(elements, appState, files, viewerCamera, editorCamera)
 * const hasChanged = !signature.equals(lastSavedSignature)
 * ```
 */
export class SceneSignature extends ValueObject<string> {
	protected validate(value: string): void {
		if (!value || value.trim() === '') {
			throw new Error('Scene signature cannot be empty')
		}
	}

	/**
	 * Computes a signature from scene content (elements, appState, files)
	 * Uses stable hashing algorithm from shared/libs/documents
	 *
	 * @param elements - Canvas elements array
	 * @param appState - Application state
	 * @param files - File attachments map
	 */
	static compute(
		elements: unknown[],
		appState: Record<string, unknown>,
		files: Record<string, unknown>
	): SceneSignature {
		const signature = computeSceneSignature(elements, appState, files)
		return new SceneSignature(signature)
	}

	/**
	 * Computes a combined signature including content + camera states.
	 * Used when camera position changes should trigger saves.
	 *
	 * @param options - Scene signature computation options
	 * @param options.elements - Canvas elements array
	 * @param options.appState - Application state
	 * @param options.files - File attachments map
	 * @param options.viewerCamera - Optional viewer camera state
	 * @param options.editorCamera - Optional editor camera state
	 */
	static computeWithCamera(options: {
		elements: unknown[]
		appState: Record<string, unknown>
		files: Record<string, unknown>
		viewerCamera?: CameraState
		editorCamera?: CameraState
	}): SceneSignature {
		const contentSig = computeSceneSignature(
			options.elements,
			options.appState,
			options.files
		)
		const viewerSig = options.viewerCamera?.toSignature() ?? ''
		const editorSig = options.editorCamera?.toSignature() ?? ''
		const combined = `${contentSig}|viewer:${viewerSig}|editor:${editorSig}`
		return new SceneSignature(combined)
	}

	/**
	 * Combines an existing content signature with camera states.
	 * Use when content hasn't changed but camera has (avoids recomputing content hash).
	 *
	 * @param contentSignature - Pre-computed content signature
	 * @param options - Optional camera states
	 * @param options.viewerCamera - Optional viewer camera state
	 * @param options.editorCamera - Optional editor camera state
	 * @returns Combined signature with content + camera states
	 *
	 * @example
	 * ```typescript
	 * const contentSig = SceneSignature.compute(elements, appState, files)
	 * const combined = SceneSignature.combineWithCamera(contentSig, { viewerCamera })
	 * ```
	 */
	static combineWithCamera(
		contentSignature: SceneSignature,
		options?: {
			viewerCamera?: CameraState
			editorCamera?: CameraState
		}
	): SceneSignature {
		const viewerSig = options?.viewerCamera?.toSignature() ?? ''
		const editorSig = options?.editorCamera?.toSignature() ?? ''
		const combined = `${contentSignature.toString()}|viewer:${viewerSig}|editor:${editorSig}`
		return new SceneSignature(combined)
	}

	/**
	 * Extracts content signature from combined signature string.
	 * Use to compare content-only changes without camera state.
	 *
	 * @param combinedSignature - Combined signature (content + camera)
	 * @returns Content signature only, or null if extraction fails
	 *
	 * @example
	 * ```typescript
	 * const combined = SceneSignature.fromString('abc123|viewer:...|editor:...')
	 * const content = SceneSignature.extractContentSignature(combined)
	 * // content.toString() === 'abc123'
	 * ```
	 */
	static extractContentSignature(
		combinedSignature: SceneSignature
	): SceneSignature | null {
		try {
			const parts = combinedSignature.toString().split('|')
			if (parts.length > 0 && parts[0]) {
				return new SceneSignature(parts[0])
			}
			return null
		} catch {
			return null
		}
	}

	/**
	 * Creates a signature from a raw string value.
	 * Used when restoring from saved state.
	 *
	 * @param value - Raw signature string
	 */
	static fromString(value: string): SceneSignature {
		return new SceneSignature(value)
	}

	/**
	 * Checks equality with another scene signature
	 * Inherits from ValueObject base class
	 */
	equalsSignature(other: SceneSignature | null): boolean {
		if (!other) {
			return false
		}
		return this.equals(other)
	}

	/**
	 * Returns the raw signature string value
	 */
	toString(): string {
		return this.value
	}
}
