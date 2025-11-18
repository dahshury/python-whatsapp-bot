export type ValidationError = {
	row: number
	col: number
	message: string
	fieldName?: string
}

/**
 * Deep comparison for validation errors to prevent unnecessary state updates.
 */
export function areValidationErrorsEqual(
	a: ValidationError[],
	b: ValidationError[]
): boolean {
	if (a.length !== b.length) {
		return false
	}
	for (let i = 0; i < a.length; i += 1) {
		const errA = a[i]
		const errB = b[i]
		if (
			!(errA && errB) ||
			errA.row !== errB.row ||
			errA.col !== errB.col ||
			errA.message !== errB.message ||
			errA.fieldName !== errB.fieldName
		) {
			return false
		}
	}
	return true
}
