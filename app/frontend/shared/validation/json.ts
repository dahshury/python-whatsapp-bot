import type { ZodTypeAny, infer as zInfer } from "zod";

export function safeParseJson<T extends ZodTypeAny>(
	schema: T,
	raw: string
): { success: true; data: zInfer<T> } | { success: false; error: string } {
	try {
		const parsed = JSON.parse(raw);
		const result = schema.safeParse(parsed);
		if (result.success) {
			return { success: true, data: result.data };
		}
		return { success: false, error: result.error.message };
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : "parse_error",
		};
	}
}

export function tryParseJson(raw: string): unknown | null {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
