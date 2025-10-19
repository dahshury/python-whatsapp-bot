import { zDateOnly } from "@shared/validation/primitives";
import { z } from "zod";

export const zVacationSnapshot = z.object({
	start: zDateOnly,
	end: zDateOnly,
	title: z.string().optional(),
});

export type VacationSnapshotSchema = z.infer<typeof zVacationSnapshot>;
