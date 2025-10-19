import { z } from "zod";

export const zModifyIdBody = z.object({
	old_id: z.string().min(1),
	new_id: z.string().min(1),
	ar: z.boolean().optional(),
});

export type ModifyIdBody = z.infer<typeof zModifyIdBody>;
