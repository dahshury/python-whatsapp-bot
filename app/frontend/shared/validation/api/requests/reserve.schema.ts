import {
	zDateOnly,
	zNonEmptyString,
	zTimeHHMM,
	zWaId,
} from "@shared/validation/primitives";
import { z } from "zod";

export const zReserveBody = z.object({
	id: zWaId,
	title: zNonEmptyString,
	date: zDateOnly,
	time: zTimeHHMM,
	type: z.union([z.literal(0), z.literal(1)]).optional(),
	max_reservations: z.number().int().positive().optional(),
	hijri: z.boolean().optional(),
	ar: z.boolean().optional(),
});

export type ReserveBody = z.infer<typeof zReserveBody>;
