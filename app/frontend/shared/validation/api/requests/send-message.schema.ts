import { zNonEmptyString, zWaId } from "@shared/validation/primitives";
import { z } from "zod";

export const zSendMessageBody = z.object({
	wa_id: zWaId,
	text: zNonEmptyString,
});

export type SendMessageBody = z.infer<typeof zSendMessageBody>;
