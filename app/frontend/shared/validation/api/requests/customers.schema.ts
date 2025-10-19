import { zNonEmptyString } from "@shared/validation/primitives";
import { z } from "zod";

export const zCustomerPutBody = z.object({
	name: z.string().nullable().optional(),
	age: z.number().int().positive().nullable().optional(),
	document: z.unknown().optional(),
	ar: z.boolean().optional(),
});

export const zCustomerParams = z.object({
	waId: zNonEmptyString, // already encoded in route but keep validation for consumers
});

export type CustomerPutBody = z.infer<typeof zCustomerPutBody>;
export type CustomerParams = z.infer<typeof zCustomerParams>;
