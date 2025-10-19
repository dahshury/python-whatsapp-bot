import { zDateOnly } from "@shared/validation/primitives";
import { z } from "zod";

export const zReservationsQuery = z.object({
	future: z.union([z.literal("true"), z.literal("false")]).optional(),
	include_cancelled: z
		.union([z.literal("true"), z.literal("false")])
		.optional(),
	from_date: zDateOnly.optional(),
	to_date: zDateOnly.optional(),
});

export const zConversationsQuery = z.object({
	from_date: zDateOnly.optional(),
	to_date: zDateOnly.optional(),
});

export type ReservationsQuery = z.infer<typeof zReservationsQuery>;
export type ConversationsQuery = z.infer<typeof zConversationsQuery>;
