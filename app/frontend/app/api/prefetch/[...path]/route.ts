import { type NextRequest, NextResponse } from 'next/server'
import { HTTP_STATUS } from '@/shared/config'
import { resolvePrefetch } from '../resolvers'

type Params = {
	path?: string[]
}

function normalisePath(pathSegments: string[] | undefined): string {
	if (!pathSegments || pathSegments.length === 0) {
		return '/'
	}
	return `/${pathSegments.join('/')}`
}

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
	const params = await context.params
	const pathname = normalisePath(params?.path)
	try {
		const result = await resolvePrefetch(pathname, request)
		const status = result.success
			? HTTP_STATUS.OK
			: HTTP_STATUS.INTERNAL_SERVER_ERROR
		return NextResponse.json(result, { status })
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error:
					(error instanceof Error && error.message) ||
					'Unexpected error during prefetch resolution',
			},
			{ status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
		)
	}
}
