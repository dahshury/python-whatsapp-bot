import { z } from "zod";

export const zLibraryItem = z
	.object({
		id: z.string(),
		status: z.union([z.literal("published"), z.literal("unpublished")]),
		elements: z.array(z.unknown()),
		created: z.number().optional(),
	})
	.passthrough();

export const zLibraryItems = z.array(zLibraryItem);

export type LibraryItem = z.infer<typeof zLibraryItem>;
export type LibraryItems = z.infer<typeof zLibraryItems>;
