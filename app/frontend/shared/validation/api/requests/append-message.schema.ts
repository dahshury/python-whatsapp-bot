import {
	zDateOnly,
	zNonEmptyString,
	zTimeHHMM,
} from "@shared/validation/primitives";
import { z } from "zod";

export const zAppendMessageQuery = z.object({
	wa_id: z.string().min(1, "wa_id_required"),
});

export const zAppendMessageBody = z.object({
	role: zNonEmptyString,
	message: zNonEmptyString,
	date: zDateOnly,
	time: zTimeHHMM,
});

export type AppendMessageQuery = z.infer<typeof zAppendMessageQuery>;
export type AppendMessageBody = z.infer<typeof zAppendMessageBody>;
