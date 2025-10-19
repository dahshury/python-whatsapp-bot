import { zDateOnly } from "@shared/validation/primitives";
import { z } from "zod";

export const zUpdateVacationsBody = z.object({
	start_dates: z.array(zDateOnly),
	durations: z.array(z.number().int().positive()),
	ar: z.boolean().optional(),
});

export type UpdateVacationsBody = z.infer<typeof zUpdateVacationsBody>;
