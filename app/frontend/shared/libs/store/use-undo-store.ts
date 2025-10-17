import { create, type StateCreator } from "zustand";

export type UndoableOperation = {
	id: string; // Unique ID for this undo operation
	execute: () => Promise<void>; // The function that performs the undo API call
	description: string; // Short description for the toast, e.g., "Undo creation of reservation for X"
};

type UndoStoreState = {
	undoStack: UndoableOperation[];
	maxStackSize: number;
	addUndo: (operation: UndoableOperation) => void;
	popUndo: () => UndoableOperation | undefined; // For Ctrl+Z to get the latest
	removeUndo: (operationId: string) => void; // For toast's undo to remove specific op
	peekUndo: () => UndoableOperation | undefined;
	canUndo: () => boolean;
	configureStackSize: (size: number) => void;
};

// Define the StateCreator type for better type safety
const undoStoreCreator: StateCreator<UndoStoreState> = (set, get) => ({
	undoStack: [],
	maxStackSize: 5, // Default, configurable
	addUndo: (operation: UndoableOperation) => {
		set((state: UndoStoreState) => {
			const newStack = [operation, ...state.undoStack];
			if (newStack.length > state.maxStackSize) {
				newStack.length = state.maxStackSize; // Enforce max size
			}
			return { undoStack: newStack };
		});
	},
	popUndo: () => {
		let operation: UndoableOperation | undefined;
		set((state: UndoStoreState) => {
			if (state.undoStack.length > 0) {
				operation = state.undoStack[0];
				return { undoStack: state.undoStack.slice(1) };
			}
			return {}; // Return empty object as per Zustand's set signature for no change
		});
		return operation;
	},
	removeUndo: (operationId: string) => {
		set((state: UndoStoreState) => ({
			undoStack: state.undoStack.filter(
				(op: UndoableOperation) => op.id !== operationId
			),
		}));
	},
	peekUndo: () => {
		const stack = get().undoStack;
		return stack.length > 0 ? stack[0] : undefined;
	},
	canUndo: () => get().undoStack.length > 0,
	configureStackSize: (size: number) => {
		if (size > 0) {
			set({ maxStackSize: size });
		}
	},
});

export const useUndoStore = create<UndoStoreState>(undoStoreCreator);

// Example of how to configure if needed, e.g., from settings or .env
// import { useUndoStore } from '@shared/libs/store/use-undo-store';
// const { configureStackSize } = useUndoStore.getState();
// configureStackSize(parseInt(process.env.NEXT_PUBLIC_UNDO_STACK_SIZE || "5"));
