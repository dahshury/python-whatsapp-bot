import { zDateOnly, zNonEmptyString } from "@shared/validation/primitives";
import { z } from "zod";

export const zReservation = z.object({
	id: z.union([z.number(), z.string()]).optional(),
	customer_id: z
		.union([zNonEmptyString, z.number().transform((n) => String(n))])
		.optional(),
	date: zDateOnly,
	time_slot: z.string().min(1),
	customer_name: z.string().optional(),
	// Backend may send various numeric-like values; coerce to integer
	type: z.coerce.number().int().optional(),
	cancelled: z.boolean().optional(),
	updated_at: z.string().optional(),
	modified_at: z.string().optional(),
	last_modified: z.string().optional(),
	modified_on: z.string().optional(),
	update_ts: z.string().optional(),
	history: z
		.array(
			z.object({
				ts: z.string().optional(),
				timestamp: z.string().optional(),
			})
		)
		.optional(),
});

export type ReservationSchema = z.infer<typeof zReservation>;
