import type { GridCell } from "@glideapps/glide-data-grid";
import { toastService } from "@/lib/toast-service";

export interface OperationResult<T = any> {
	success: boolean;
	hasErrors: boolean;
	successfulOperations: SuccessfulOperation<T>[];
	errors?: OperationError[];
}

export interface SuccessfulOperation<T = any> {
	type: string;
	id: string | number;
	data: T;
	timestamp: number;
}

export interface OperationError {
	row?: number;
	col?: number;
	message: string;
	details?: any;
}

export interface BatchOperationOptions {
	showToast?: boolean;
	undoable?: boolean;
	undoDuration?: number;
}

export type OperationHandler<T> = (
	data: T,
) => Promise<{ success: boolean; result?: any; error?: string }>;
export type UndoHandler<T> = (
	operation: SuccessfulOperation<T>,
) => Promise<{ success: boolean; error?: string }>;

/**
 * Generic service for managing grid operations with undo support
 */
export class GridOperationService {
	private undoHandlers = new Map<string, UndoHandler<any>>();
	private operationHandlers = new Map<string, OperationHandler<any>>();
	private operationHistory: SuccessfulOperation[] = [];
	private maxHistorySize = 50;

	constructor(private isRTL: boolean = false) {}

	/**
	 * Register an operation handler
	 */
	registerOperation<T>(
		operationType: string,
		handler: OperationHandler<T>,
		undoHandler?: UndoHandler<T>,
	) {
		this.operationHandlers.set(operationType, handler);
		if (undoHandler) {
			this.undoHandlers.set(operationType, undoHandler);
		}
	}

	/**
	 * Execute a batch of operations
	 */
	async executeBatch<T>(
		operations: Array<{ type: string; data: T }>,
		options: BatchOperationOptions = {},
	): Promise<OperationResult<T>> {
		const { showToast = true, undoable = true, undoDuration = 8000 } = options;
		const successfulOperations: SuccessfulOperation<T>[] = [];
		const errors: OperationError[] = [];
		let hasErrors = false;

		for (const operation of operations) {
			const handler = this.operationHandlers.get(operation.type);
			if (!handler) {
				errors.push({
					message: `No handler registered for operation type: ${operation.type}`,
				});
				hasErrors = true;
				continue;
			}

			try {
				const result = await handler(operation.data);

				if (result.success) {
					const successfulOp: SuccessfulOperation<T> = {
						type: operation.type,
						id: result.result?.id || Math.random().toString(36).substr(2, 9),
						data: operation.data,
						timestamp: Date.now(),
					};

					successfulOperations.push(successfulOp);
					this.addToHistory(successfulOp);

					if (showToast && undoable && this.undoHandlers.has(operation.type)) {
						this.showUndoableToast(successfulOp, undoDuration);
					}
				} else {
					errors.push({
						message: result.error || `Operation ${operation.type} failed`,
					});
					hasErrors = true;
				}
			} catch (error) {
				errors.push({
					message: `Error executing ${operation.type}: ${error instanceof Error ? error.message : "Unknown error"}`,
				});
				hasErrors = true;
			}
		}

		return {
			success: !hasErrors,
			hasErrors,
			successfulOperations,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	/**
	 * Execute a single operation
	 */
	async execute<T>(
		operationType: string,
		data: T,
		options: BatchOperationOptions = {},
	): Promise<OperationResult<T>> {
		return this.executeBatch([{ type: operationType, data }], options);
	}

	/**
	 * Undo an operation
	 */
	async undo<T>(
		operation: SuccessfulOperation<T>,
	): Promise<{ success: boolean; error?: string }> {
		const undoHandler = this.undoHandlers.get(operation.type);
		if (!undoHandler) {
			return {
				success: false,
				error: "No undo handler available for this operation",
			};
		}

		try {
			const result = await undoHandler(operation);
			if (result.success) {
				this.removeFromHistory(operation);
			}
			return result;
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error during undo",
			};
		}
	}

	/**
	 * Get operation history
	 */
	getHistory(): ReadonlyArray<SuccessfulOperation> {
		return [...this.operationHistory];
	}

	/**
	 * Clear operation history
	 */
	clearHistory() {
		this.operationHistory = [];
	}

	/**
	 * Validate grid data before operations
	 */
	async validateBeforeOperation(
		cells: Map<string, GridCell>,
		validator: (
			cell: GridCell,
			position: { row: number; col: number },
		) => { isValid: boolean; error?: string },
	): Promise<{ isValid: boolean; errors: OperationError[] }> {
		const errors: OperationError[] = [];

		for (const [key, cell] of cells) {
			const [rowStr, colStr] = key.split("-");
			const position = { row: parseInt(rowStr), col: parseInt(colStr) };

			const validation = validator(cell, position);
			if (!validation.isValid) {
				errors.push({
					row: position.row,
					col: position.col,
					message: validation.error || "Validation failed",
				});
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private addToHistory(operation: SuccessfulOperation) {
		this.operationHistory.unshift(operation);
		if (this.operationHistory.length > this.maxHistorySize) {
			this.operationHistory = this.operationHistory.slice(
				0,
				this.maxHistorySize,
			);
		}
	}

	private removeFromHistory(operation: SuccessfulOperation) {
		this.operationHistory = this.operationHistory.filter(
			(op) => op.id !== operation.id || op.type !== operation.type,
		);
	}

	private showUndoableToast<T>(
		operation: SuccessfulOperation<T>,
		duration: number,
	) {
		const getMessage = (key: string) => {
			const messages: Record<string, Record<string, string>> = {
				operation_success: {
					en: "Operation completed successfully",
					ar: "تمت العملية بنجاح",
				},
				undo: {
					en: "Undo",
					ar: "تراجع",
				},
				undo_success: {
					en: "Operation undone",
					ar: "تم التراجع عن العملية",
				},
				undo_failed: {
					en: "Failed to undo operation",
					ar: "فشل التراجع عن العملية",
				},
			};

			return messages[key]?.[this.isRTL ? "ar" : "en"] || key;
		};

		toastService.undoable(
			getMessage("operation_success"),
			undefined,
			getMessage("undo"),
			async () => {
				const result = await this.undo(operation);
				if (result.success) {
					toastService.success(getMessage("undo_success"));
				} else {
					toastService.error(getMessage("undo_failed"), result.error);
				}
			},
			duration,
		);
	}
}
