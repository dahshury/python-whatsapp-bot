import {
	zDateOnly,
	zNonEmptyString,
	zTimeHHMM,
	zWaId,
} from "@shared/validation/primitives";
import { z } from "zod";

export const zModifyReservationBody = z.object({
	id: zWaId,
	date: zDateOnly,
	time: zTimeHHMM,
	title: zNonEmptyString.optional(),
	type: z.union([z.literal(0), z.literal(1)]).optional(),
	approximate: z.boolean().optional(),
	reservationId: z.number().int().positive().optional(),
});

export type ModifyReservationBody = z.infer<typeof zModifyReservationBody>;
