import { useCallback, useEffect, useRef } from "react";

export type UndoableOperation = {
	id: string;
	description: string;
	execute: () => Promise<void>;
	timestamp?: number;
};

type UseGridUndoManagerOptions = {
	/** Maximum number of undo operations to keep in history */
	maxHistorySize?: number;
	/** Enable keyboard shortcuts (Ctrl+Z / Cmd+Z) */
	enableKeyboardShortcuts?: boolean;
	/** Callback when undo is triggered */
	onUndo?: (operation: UndoableOperation) => void;
	/** Callback when redo is triggered */
	onRedo?: (operation: UndoableOperation) => void;
	/** Custom key combination check */
	isUndoKey?: (event: KeyboardEvent) => boolean;
	/** Custom key combination check for redo */
	isRedoKey?: (event: KeyboardEvent) => boolean;
};

/**
 * Generic undo/redo manager for grid operations
 * Supports keyboard shortcuts and programmatic undo/redo
 */
export function useGridUndoManager({
	maxHistorySize = 50,
	enableKeyboardShortcuts = true,
	onUndo,
	onRedo,
	isUndoKey = (e) => (e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey,
	isRedoKey = (e) =>
		(e.ctrlKey || e.metaKey) &&
		(e.key === "y" || (e.key === "z" && e.shiftKey)),
}: UseGridUndoManagerOptions = {}) {
	const undoStackRef = useRef<UndoableOperation[]>([]);
	const redoStackRef = useRef<UndoableOperation[]>([]);
	const isExecutingRef = useRef(false);

	const pushOperation = useCallback(
		(operation: UndoableOperation) => {
			if (isExecutingRef.current) {
				return;
			}

			// Add timestamp if not provided
			const operationWithTimestamp = {
				...operation,
				timestamp: operation.timestamp || Date.now(),
			};

			// Add to undo stack
			undoStackRef.current = [
				...undoStackRef.current.slice(-(maxHistorySize - 1)),
				operationWithTimestamp,
			];

			// Clear redo stack when new operation is added
			redoStackRef.current = [];
		},
		[maxHistorySize]
	);

	const canUndo = useCallback(
		() => undoStackRef.current.length > 0 && !isExecutingRef.current,
		[]
	);

	const canRedo = useCallback(
		() => redoStackRef.current.length > 0 && !isExecutingRef.current,
		[]
	);

	const undo = useCallback(async () => {
		if (!canUndo()) {
			return null;
		}

		isExecutingRef.current = true;
		const operation = undoStackRef.current.at(-1);

		if (!operation) {
			isExecutingRef.current = false;
			return null;
		}

		try {
			// Execute the undo operation
			await operation.execute();

			// Move from undo to redo stack
			undoStackRef.current = undoStackRef.current.slice(0, -1);
			redoStackRef.current = [...redoStackRef.current, operation];

			// Trigger callback
			onUndo?.(operation);

			return operation;
		} finally {
			isExecutingRef.current = false;
		}
	}, [canUndo, onUndo]);

	const redo = useCallback(async () => {
		if (!canRedo()) {
			return null;
		}

		isExecutingRef.current = true;
		const operation = redoStackRef.current.at(-1);

		if (!operation) {
			isExecutingRef.current = false;
			return null;
		}

		try {
			// Execute the redo operation
			await operation.execute();

			// Move from redo to undo stack
			redoStackRef.current = redoStackRef.current.slice(0, -1);
			undoStackRef.current = [...undoStackRef.current, operation];

			// Trigger callback
			onRedo?.(operation);

			return operation;
		} finally {
			isExecutingRef.current = false;
		}
	}, [canRedo, onRedo]);

	const clear = useCallback(() => {
		undoStackRef.current = [];
		redoStackRef.current = [];
	}, []);

	const getHistory = useCallback(
		() => ({
			undoStack: [...undoStackRef.current],
			redoStack: [...redoStackRef.current],
		}),
		[]
	);

	// Keyboard shortcuts
	useEffect(() => {
		if (!enableKeyboardShortcuts) {
			return;
		}

		const handleKeyDown = async (event: KeyboardEvent) => {
			// Check if we're in an input or textarea
			const target = event.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
				return;
			}

			if (isUndoKey(event)) {
				event.preventDefault();
				await undo();
			} else if (isRedoKey(event)) {
				event.preventDefault();
				await redo();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [enableKeyboardShortcuts, isUndoKey, isRedoKey, undo, redo]);

	return {
		pushOperation,
		undo,
		redo,
		canUndo,
		canRedo,
		clear,
		getHistory,
		isExecuting: isExecutingRef.current,
	};
}
