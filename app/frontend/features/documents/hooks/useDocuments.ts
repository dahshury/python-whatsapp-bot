import { useMutation, useQuery } from '@tanstack/react-query'
import { DOCUMENT_QUERY_KEY } from '@/entities/document'
import type { DocumentsUseCase } from '../usecase/documents.usecase'

export const createUseDocuments = (svc: DocumentsUseCase) => ({
	useGetByWaId: (waId: string) =>
		useQuery({
			queryKey: DOCUMENT_QUERY_KEY.byWaId(waId),
			queryFn: () => svc.getByWaId(waId),
			enabled: Boolean(waId),
			staleTime: 60_000,
			gcTime: 300_000,
		}),

	useSave: () =>
		useMutation({
			mutationFn: (args: {
				waId: string
				snapshot: Partial<{
					name?: string | null
					age?: number | null
					document?: unknown
				}>
			}) => svc.save(args.waId, args.snapshot),
		}),

	useEnsureInitialized: () =>
		useMutation({
			mutationFn: (waId: string) => svc.ensureInitialized(waId),
		}),
})
