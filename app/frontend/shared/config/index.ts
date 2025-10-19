import { z } from "zod";

const MIN_SLOT_DURATION_HOURS = 0.25;
const MAX_SLOT_DURATION_HOURS = 4;

const zRuntimeConfig = z.object({
	timezone: z.string().min(1),
	wsDebug: z.boolean().default(false),
	logLevel: z
		.enum(["trace", "debug", "info", "warn", "error", "silent"])
		.default("info"),
	gridDebug: z.boolean().default(false),
	slotDurationHours: z
		.number()
		.min(MIN_SLOT_DURATION_HOURS)
		.max(MAX_SLOT_DURATION_HOURS)
		.transform((v) => Number(v))
		.optional(),
});

export const runtimeConfig = (() => {
	const raw = {
		timezone:
			process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || "Asia/Riyadh",
		wsDebug: process.env.NEXT_PUBLIC_WS_DEBUG === "true",
		logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL || "info").toLowerCase(),
		gridDebug: process.env.NEXT_PUBLIC_DEBUG_GRID === "1",
		slotDurationHours: Number(
			process.env.NEXT_PUBLIC_SLOT_DURATION_HOURS || "0"
		),
	};
	const parsed = zRuntimeConfig.safeParse(raw);
	return parsed.success ? parsed.data : raw;
})();
