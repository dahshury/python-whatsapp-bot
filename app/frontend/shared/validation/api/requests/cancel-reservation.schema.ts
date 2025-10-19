import { zDateOnly, zWaId } from "@shared/validation/primitives";
import { z } from "zod";

export const zCancelReservationBody = z.object({
	id: zWaId,
	date: zDateOnly,
	isLocalized: z.boolean().optional(),
});

export type CancelReservationBody = z.infer<typeof zCancelReservationBody>;
