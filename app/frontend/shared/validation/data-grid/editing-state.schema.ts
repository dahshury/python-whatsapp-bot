import { z } from "zod";

// Serialized editing state shape persisted as JSON string
export const zEditingState = z
	.object({
		edited_rows: z.record(z.record(z.unknown())).default({}),
		added_rows: z.array(z.record(z.unknown())).default([]),
		deleted_rows: z.array(z.number()).default([]),
	})
	.passthrough();

export type EditingStateSerialized = z.infer<typeof zEditingState>;
