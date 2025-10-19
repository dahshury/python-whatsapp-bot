import { zConversationMessage } from "@shared/validation/domain/conversation.schema";
import { zReservation } from "@shared/validation/domain/reservation.schema";
import { zVacationSnapshot } from "@shared/validation/domain/vacation.schema";
import { z } from "zod";

export const zWsCachedState = z
	.object({
		reservations: z.record(z.array(zReservation)),
		conversations: z.record(z.array(zConversationMessage)),
		vacations: z.array(zVacationSnapshot),
		isConnected: z.boolean().optional(),
		lastUpdate: z.union([z.string(), z.null()]).optional(),
		__ts: z.number(),
	})
	.passthrough();

export type WsCachedState = z.infer<typeof zWsCachedState>;
