import { zApiResponse } from "@shared/validation/api/response.schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

const zNotificationsItem = z.object({
	id: z.union([z.number(), z.string()]).optional(),
	type: z.string().optional(),
	timestamp: z.union([z.string(), z.number()]).optional(),
	data: z.record(z.unknown()).optional(),
});

const zNotificationsResponse = zApiResponse(
	z.object({ items: z.array(zNotificationsItem).optional() })
);

export async function GET() {
	try {
		const data = await callPythonBackend(
			"/notifications",
			{ method: "GET" },
			zNotificationsResponse
		);
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		);
	}
}
