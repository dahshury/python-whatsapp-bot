import { z } from "zod";

// Date-only in YYYY-MM-DD
export const zDateOnly = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/u, "invalid_date_format");

// Time in HH:mm (24h)
export const zTimeHHMM = z
	.string()
	.regex(/^([01]\d|2[0-3]):[0-5]\d$/u, "invalid_time_format");

// ISO 8601 timestamp (basic guard)
export const zIsoTimestamp = z
	.string()
	.refine((s) => !Number.isNaN(Date.parse(s)), "invalid_iso_timestamp");

// WhatsApp ID / phone-like identifier as non-empty string
export const zWaId = z.string().min(1, "wa_id_required");

// Boolean-like optional flags (coerce when needed in route schemas)
export const zBool = z.boolean();

// Integer (non-negative) used for ids and limits
export const zInt = z
	.number()
	.int("invalid_integer")
	.nonnegative("negative_not_allowed");

// Optional helper for strings trimmed and non-empty
export const zNonEmptyString = z.string().trim().min(1, "string_required");

export type DateOnly = z.infer<typeof zDateOnly>;
export type TimeHHMM = z.infer<typeof zTimeHHMM>;
export type IsoTimestamp = z.infer<typeof zIsoTimestamp>;
export type WaId = z.infer<typeof zWaId>;
