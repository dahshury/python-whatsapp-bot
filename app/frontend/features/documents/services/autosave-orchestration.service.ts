import type { SceneSignature } from '@/entities/document'
import type { SaveStatus } from '../types/save-state.types'

/**
 * Callbacks for autosave lifecycle events.
 */
export type AutosaveCallbacks = {
	onSaving: () => void
	onSaved: (signature: SceneSignature) => void
	onError: (message?: string) => void
}

/**
 * Internal state for autosave orchestration.
 * Tracks saving status and local edits during save operations.
 */
export type AutosaveState = {
	isSaving: boolean
	hasLocalEditsDuringSave: boolean
	lastScheduledSignature: SceneSignature | null
	// Track the last activity timestamp for continuous activity detection
	lastActivityTimestamp: number
	// Track pending changes signature that hasn't been saved yet
	pendingSaveSignature: SceneSignature | null
}

/**
 * Service for orchestrating autosave operations.
 * Manages save state transitions, global flags, and save scheduling logic.
 *
 * @example
 * ```typescript
 * const state = AutosaveOrchestrationService.createState()
 * AutosaveOrchestrationService.markSavingStart(state)
 * // ... perform save
 * AutosaveOrchestrationService.markSavingComplete(state, signature)
 * ```
 */
export const AutosaveOrchestrationService = {
	/**
	 * Creates a new autosave state object with default values.
	 */
	createState(): AutosaveState {
		return {
			isSaving: false,
			hasLocalEditsDuringSave: false,
			lastScheduledSignature: null,
			lastActivityTimestamp: 0,
			pendingSaveSignature: null,
		}
	},

	/**
	 * Marks the start of a save operation.
	 * Sets isSaving flag and resets local edits tracking.
	 * Stores the signature that's being saved.
	 *
	 * @param state - Autosave state to update
	 * @param signature - Signature being saved
	 */
	markSavingStart(state: AutosaveState, signature: SceneSignature): void {
		state.isSaving = true
		state.hasLocalEditsDuringSave = false
		state.pendingSaveSignature = signature
		this.setGlobalSavingFlag(true)
	},

	/**
	 * Marks the completion of a save operation.
	 * Clears isSaving flag and scheduled signature.
	 * Returns whether there are pending changes that need saving.
	 *
	 * @param state - Autosave state to update
	 * @param savedSignature - Signature that was actually saved
	 * @param currentSignature - Current signature (may differ if changes occurred during save)
	 * @returns true if there are still pending changes that need saving
	 */
	markSavingComplete(
		state: AutosaveState,
		_savedSignature: SceneSignature,
		currentSignature: SceneSignature | null
	): boolean {
		state.isSaving = false
		state.lastScheduledSignature = null
		this.setGlobalSavingFlag(false)

		// Check if there are pending changes that happened during save
		if (currentSignature && state.pendingSaveSignature) {
			// If current signature differs from what we saved, there are new changes
			const hasNewChanges = !currentSignature.equalsSignature(
				state.pendingSaveSignature
			)
			if (hasNewChanges) {
				state.hasLocalEditsDuringSave = true
				return true
			}
		}

		// Clear pending signature
		state.pendingSaveSignature = null
		state.hasLocalEditsDuringSave = false
		return false
	},

	/**
	 * Records activity timestamp for continuous activity tracking.
	 * Used by interval controller to detect continuous activity.
	 *
	 * @param state - Autosave state to update
	 */
	recordActivity(state: AutosaveState): void {
		state.lastActivityTimestamp = Date.now()
	},

	/**
	 * Records that local edits occurred during a save operation.
	 * Used to determine if another save is needed after current one completes.
	 *
	 * @param state - Autosave state to update
	 * @param signature - Current signature of the change
	 */
	recordLocalEdit(state: AutosaveState, _signature: SceneSignature): void {
		if (state.isSaving) {
			state.hasLocalEditsDuringSave = true
			this.setGlobalLocalEditsFlag(true)
		}
		// Always record activity when there's a change
		this.recordActivity(state)
	},

	/**
	 * Determines if a save should be scheduled based on current state and changes.
	 * For idle saves, only schedules if there's been no recent activity (true inactivity).
	 *
	 * @param options - Save scheduling options
	 * @param options.state - Current autosave state
	 * @param options.newSignature - New scene signature (content-only, for fallback)
	 * @param options.combinedSignature - Combined signature including camera (preferred for comparison)
	 * @param options.hasContentChanges - Whether content has changed
	 * @param options.hasCameraChanges - Whether camera position has changed
	 * @param options.idleTimeoutMs - Idle timeout in ms (default: 3000). Only schedule if no activity in this window.
	 * @returns true if save should be scheduled
	 */
	shouldScheduleSave(options: {
		state: AutosaveState
		newSignature: SceneSignature
		combinedSignature: SceneSignature | null
		hasContentChanges: boolean
		hasCameraChanges: boolean
		idleTimeoutMs?: number
	}): boolean {
		const {
			state,
			newSignature,
			combinedSignature,
			hasContentChanges,
			hasCameraChanges,
			idleTimeoutMs = 3000,
		} = options
		// Don't schedule while already saving
		if (state.isSaving) {
			return false
		}

		// Need either content or camera changes
		if (!(hasContentChanges || hasCameraChanges)) {
			return false
		}

		// For idle saves:
		// - Content changes: Only schedule if there's been NO recent activity (true inactivity)
		// - Camera-only changes: Always schedule (timer resets handle continuous movement)
		//   The timer will reset during continuous camera movement, and fire when movement stops
		// The interval controller handles continuous content activity saves
		if (
			hasContentChanges &&
			!hasCameraChanges &&
			this.hasRecentActivity(state, idleTimeoutMs)
		) {
			return false
		}

		// ✅ PERFORMANCE OPTIMIZATION: For camera changes, always schedule without signature comparison
		// This avoids expensive signature computation/comparison during continuous camera movement
		// The idle controller's schedule() resets the timer, so continuous movement keeps resetting
		// When movement stops, timer fires after 3s and saves the final camera position
		// The save logic (flush) will handle checking if state actually changed before persisting
		if (hasCameraChanges) {
			return true
		}

		// For content-only changes: check if signature already scheduled to avoid redundant schedules
		const signatureToCompare = combinedSignature || newSignature
		const isAlreadyScheduled =
			state.lastScheduledSignature &&
			signatureToCompare.equalsSignature(state.lastScheduledSignature)

		if (!isAlreadyScheduled) {
			state.lastScheduledSignature = signatureToCompare
			return true
		}

		return false
	},

	/**
	 * Checks if there's been continuous activity recently.
	 * Used by interval controller to determine if it should save.
	 *
	 * @param state - Current autosave state
	 * @param activityWindowMs - Time window in ms to consider as "recent activity"
	 * @returns true if there's been activity within the window
	 */
	hasRecentActivity(state: AutosaveState, activityWindowMs: number): boolean {
		if (state.lastActivityTimestamp === 0) {
			return false
		}
		return Date.now() - state.lastActivityTimestamp < activityWindowMs
	},

	/**
	 * Computes the appropriate save status based on autosave state.
	 *
	 * @param state - Current autosave state
	 * @returns Appropriate status indicator
	 */
	computeSaveStatus(state: AutosaveState): SaveStatus['status'] {
		if (state.isSaving) {
			return 'saving'
		}
		if (state.hasLocalEditsDuringSave) {
			return 'dirty'
		}
		return 'ready'
	},

	/**
	 * Sets global flag indicating save operation in progress.
	 * Used for cross-component coordination (e.g., preventing concurrent operations).
	 *
	 * @param value - true if saving, false otherwise
	 */
	setGlobalSavingFlag(value: boolean): void {
		try {
			;(globalThis as { __docIsSaving?: boolean }).__docIsSaving = value
		} catch {
			// Silently ignore errors
		}
	},

	/**
	 * Sets global flag indicating local edits occurred during save.
	 *
	 * @param value - true if local edits exist, false otherwise
	 */
	setGlobalLocalEditsFlag(value: boolean): void {
		try {
			;(
				globalThis as { __docHasLocalEditsDuringSave?: boolean }
			).__docHasLocalEditsDuringSave = value
		} catch {
			// Silently ignore errors
		}
	},
}
