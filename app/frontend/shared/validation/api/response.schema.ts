import { zConversationMessage } from "@shared/validation/domain/conversation.schema";
import { zReservation } from "@shared/validation/domain/reservation.schema";
import { zVacationSnapshot } from "@shared/validation/domain/vacation.schema";
import { z } from "zod";

// Generic API response wrapper used across the app
export const zApiResponseBase = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	error: z.string().optional(),
	detail: z.string().optional(),
});

export function zApiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
	return zApiResponseBase.extend({
		data: dataSchema.optional(),
		id: z.union([z.string(), z.number()]).optional(),
		reservationId: z.union([z.string(), z.number()]).optional(),
	});
}

export type ApiResponseOf<S extends z.ZodTypeAny> = z.infer<
	ReturnType<typeof zApiResponse<S>>
>;

// Common domain response shapes
export const zReservationsMap = z.record(z.array(zReservation));
export const zConversationsMap = z.record(z.array(zConversationMessage));
export const zVacationsArray = z.array(zVacationSnapshot);
