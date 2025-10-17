import { useMemo } from "react";

const VALIDATION_DEBOUNCE_DELAY_MS = 100;

type Provider = {
	getColumnDefinition?: (
		c: number
	) => { id?: string; name?: string; title?: string } | undefined;
	getCell?: (c: number, r: number) => unknown;
};

type ValidateResult = {
	errors?: Array<{
		row: number;
		col: number;
		message: string;
		fieldName?: string;
	}>;
};

type Args = {
	validateAllCells: () => ValidateResult;
	dataProviderRef: React.RefObject<Provider | null>;
	gridRowToEventMapRef:
		| React.RefObject<Map<number, unknown> | null>
		| undefined;
	setValidationErrors: (
		errors: Array<{
			row: number;
			col: number;
			message: string;
			fieldName?: string;
		}>
	) => void;
};

export function useDebouncedValidationCheck({
	validateAllCells,
	dataProviderRef,
	setValidationErrors,
}: Args) {
	return useMemo(
		() => () => {
			let timeoutId: NodeJS.Timeout | null = null;
			return () => {
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
				timeoutId = setTimeout(() => {
					try {
						const result = validateAllCells();
						const provider = dataProviderRef.current;
						const mapped = (result.errors || [])
							.map((err) => {
								let fieldName = (err as { fieldName?: string })?.fieldName;
								if (!fieldName && provider?.getColumnDefinition) {
									try {
										const def = provider.getColumnDefinition(err.col);
										fieldName = def?.id || def?.name || def?.title;
									} catch {
										// Column definition retrieval failed; will use error as-is
									}
								}
								return { ...err, fieldName };
							})
							.filter((err) => {
								const fn = String(err.fieldName || "").toLowerCase();
								if (fn !== "scheduled_time") {
									return true;
								}
								try {
									const cell = provider?.getCell?.(err.col, err.row) as
										| { data?: { kind?: string; date?: unknown } }
										| undefined;
									const hasDate = Boolean(
										cell &&
											cell.data?.kind === "tempus-date-cell" &&
											cell.data?.date
									);
									return !hasDate;
								} catch {
									return true;
								}
							});
						setValidationErrors(
							mapped as Array<{
								row: number;
								col: number;
								message: string;
								fieldName?: string;
							}>
						);
					} catch {
						// Validation check failed; will retry on next event
					}
					timeoutId = null;
				}, VALIDATION_DEBOUNCE_DELAY_MS);
			};
		},
		[dataProviderRef, setValidationErrors, validateAllCells]
	);
}
