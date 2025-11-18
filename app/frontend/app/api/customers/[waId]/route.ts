import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { callPythonBackend } from '@/shared/libs/backend'

type Params = { waId: string }

function isPromise<T>(value: unknown): value is Promise<T> {
	return (
		typeof value === 'object' && value !== null && 'then' in (value as object)
	)
}

async function resolveParams(
	ctx: { params: Params } | { params: Promise<Params> }
): Promise<Params> {
	const p = (ctx as { params: Params | Promise<Params> }).params
	return isPromise<Params>(p) ? await p : p
}

export async function GET(
	_req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const { waId } = await resolveParams(ctx)
		const resp = await callPythonBackend(
			`/customers/${encodeURIComponent(waId)}`
		)
		return NextResponse.json(resp)
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		)
	}
}

export async function PUT(
	req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const { waId } = await resolveParams(ctx)
		const body = await req.json().catch(() => ({}))

		const resp = await callPythonBackend(
			`/customers/${encodeURIComponent(waId)}`,
			{
				method: 'PUT',
				body: JSON.stringify({
					...body,
					_call_source: 'frontend', // Tag as frontend-initiated to filter notifications
				}),
			}
		)

		return NextResponse.json(resp)
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		)
	}
}
