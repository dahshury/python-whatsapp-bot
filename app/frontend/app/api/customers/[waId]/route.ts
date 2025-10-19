import {
	zCustomerParams,
	zCustomerPutBody,
} from "@shared/validation/api/requests/customers.schema";
import { zApiResponse } from "@shared/validation/api/response.schema";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { callPythonBackend } from "@/shared/libs/backend";

type Params = { waId: string };

function isPromise<T>(value: unknown): value is Promise<T> {
	return (
		typeof value === "object" && value !== null && "then" in (value as object)
	);
}

async function resolveParams(
	ctx: { params: Params } | { params: Promise<Params> }
): Promise<Params> {
	const p = (ctx as { params: Params | Promise<Params> }).params;
	return isPromise<Params>(p) ? await p : p;
}

export async function GET(
	_req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const params = await resolveParams(ctx);
		const parsedParams = zCustomerParams.safeParse(params);
		if (!parsedParams.success) {
			return NextResponse.json(
				{ success: false, message: parsedParams.error.message },
				{ status: 400 }
			);
		}
		const { waId } = parsedParams.data;
		const resp = await callPythonBackend(
			`/customers/${encodeURIComponent(waId)}`,
			{ method: "GET" },
			zApiResponse(z.record(z.unknown()))
		);
		return NextResponse.json(resp);
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		);
	}
}

export async function PUT(
	req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const params = await resolveParams(ctx);
		const parsedParams = zCustomerParams.safeParse(params);
		if (!parsedParams.success) {
			return NextResponse.json(
				{ success: false, message: parsedParams.error.message },
				{ status: 400 }
			);
		}
		const { waId } = parsedParams.data;
		const body = await req.json().catch(() => ({}));
		const parsedBody = zCustomerPutBody.safeParse(body);
		if (!parsedBody.success) {
			return NextResponse.json(
				{ success: false, message: parsedBody.error.message },
				{ status: 400 }
			);
		}

		const resp = await callPythonBackend(
			`/customers/${encodeURIComponent(waId)}`,
			{
				method: "PUT",
				body: JSON.stringify(parsedBody.data),
			},
			zApiResponse(z.record(z.unknown()))
		);

		return NextResponse.json(resp);
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		);
	}
}
