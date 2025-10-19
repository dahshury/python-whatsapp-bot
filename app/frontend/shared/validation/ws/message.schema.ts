import { zConversationMessage } from "@shared/validation/domain/conversation.schema";
import { zMetrics } from "@shared/validation/domain/metrics.schema";
import { zReservation } from "@shared/validation/domain/reservation.schema";
import { zVacationSnapshot } from "@shared/validation/domain/vacation.schema";
import { z } from "zod";

// Base message
const zWsBase = z.object({
	timestamp: z.string(),
	affected_entities: z.array(z.string()).optional(),
});

// Per-type payload schemas
const zCustomerSearchResults = z.object({
	q: z.string().optional(),
	items: z
		.array(
			z.object({
				wa_id: z.string().optional(),
				name: z.string().nullable().optional(),
			})
		)
		.optional(),
});

const zNotificationsHistory = z.object({
	items: z
		.array(
			z.object({
				id: z.union([z.number(), z.string()]).optional(),
				type: z.string().optional(),
				timestamp: z.union([z.string(), z.number()]).optional(),
				data: z.record(z.unknown()).optional(),
			})
		)
		.optional(),
});

const zConversationTyping = z.object({
	wa_id: z.string().optional(),
	state: z.string().optional(),
});

const zSnapshot = z.object({
	reservations: z.record(z.array(zReservation)).optional(),
	conversations: z.record(z.array(zConversationMessage)).optional(),
	vacations: z.array(zVacationSnapshot).optional(),
});

// Discriminated union by type
export const zWebSocketMessage = z.discriminatedUnion("type", [
	// Customer search broadcast
	z
		.object({
			type: z.literal("customer_search_results"),
			data: zCustomerSearchResults,
		})
		.merge(zWsBase),

	// Notifications history
	z
		.object({
			type: z.literal("notifications_history"),
			data: zNotificationsHistory,
		})
		.merge(zWsBase),

	// Typing
	z
		.object({
			type: z.literal("conversation_typing"),
			data: zConversationTyping,
		})
		.merge(zWsBase),

	// Reservation mutations
	z
		.object({ type: z.literal("reservation_created"), data: zReservation })
		.merge(zWsBase),
	z
		.object({ type: z.literal("reservation_updated"), data: zReservation })
		.merge(zWsBase),
	z
		.object({ type: z.literal("reservation_reinstated"), data: zReservation })
		.merge(zWsBase),
	z
		.object({ type: z.literal("reservation_cancelled"), data: zReservation })
		.merge(zWsBase),

	// Conversation message
	z
		.object({
			type: z.literal("conversation_new_message"),
			data: zConversationMessage,
		})
		.merge(zWsBase),

	// Vacation periods
	z
		.object({
			type: z.literal("vacation_period_updated"),
			data: z.union([
				z.array(zVacationSnapshot),
				z.object({ periods: z.array(zVacationSnapshot) }),
			]),
		})
		.merge(zWsBase),

	// Metrics update
	z
		.object({
			type: z.literal("metrics_updated"),
			data: z.object({ metrics: zMetrics.optional() }).passthrough(),
		})
		.merge(zWsBase),

	// Snapshot
	z
		.object({ type: z.literal("snapshot"), data: zSnapshot })
		.merge(zWsBase),
]);

export type WebSocketMessageSchema = z.infer<typeof zWebSocketMessage>;
