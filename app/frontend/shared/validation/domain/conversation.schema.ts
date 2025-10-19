import { zDateOnly } from "@shared/validation/primitives";
import { z } from "zod";

export const zConversationMessage = z.object({
	// Allow any non-empty role string
	role: z.string().min(1),
	// Backend can sometimes send empty messages → relax
	message: z.string().optional(),
	// Accept HH:MM or HH:MM:SS
	time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
	date: zDateOnly,
	tool_name: z.string().optional(),
	tool_args: z.union([z.record(z.unknown()), z.string()]).optional(),
});

export const zConversationsByWaId = z.record(z.array(zConversationMessage));

export type ConversationMessageSchema = z.infer<typeof zConversationMessage>;
