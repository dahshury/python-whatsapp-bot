import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callPythonBackend } from "@/lib/backend";

type Params = { waId: string };

function isPromise<T>(value: unknown): value is Promise<T> {
	return (
		typeof value === "object" && value !== null && "then" in (value as object)
	);
}

async function resolveParams(
	ctx: { params: Params } | { params: Promise<Params> },
): Promise<Params> {
	const p = (ctx as { params: Params | Promise<Params> }).params;
	return isPromise<Params>(p) ? await p : p;
}

export async function GET(
	req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> },
) {
	try {
		const { waId } = await resolveParams(ctx);
		const resp = await callPythonBackend(
			`/documents/${encodeURIComponent(waId)}`,
			{
				headers: {
					...(req.headers.get("if-none-match")
						? { "If-None-Match": req.headers.get("if-none-match") as string }
						: {}),
					...(req.headers.get("if-modified-since")
						? {
								"If-Modified-Since": req.headers.get(
									"if-modified-since",
								) as string,
							}
						: {}),
				},
			},
		);
		return NextResponse.json(resp);
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 },
		);
	}
}

export async function PUT(
	req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> },
) {
	try {
		const { waId } = await resolveParams(ctx);
		const body = await req.json().catch(() => ({}));
		const resp = await callPythonBackend(
			`/documents/${encodeURIComponent(waId)}`,
			{
				method: "PUT",
				body: JSON.stringify(body),
			},
		);
		return NextResponse.json(resp);
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 },
		);
	}
}
