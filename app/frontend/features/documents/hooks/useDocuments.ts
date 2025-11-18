import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DOCUMENT_QUERY_KEY } from '@/entities/document'
import type { DocumentsUseCase } from '../usecase/documents.usecase'

export const createUseDocuments = (svc: DocumentsUseCase) => ({
	useGetByWaId: (waId: string, options?: { enabled?: boolean }) =>
		useQuery({
			queryKey: DOCUMENT_QUERY_KEY.byWaId(waId),
			queryFn: () => svc.getByWaId(waId),
			enabled: options?.enabled !== undefined ? options.enabled : Boolean(waId),
			staleTime: 0, // Documents are dynamic, always consider stale
			gcTime: 0, // Don't cache documents - they change frequently
			refetchOnMount: true, // Always refetch when switching to a document
		}),

	useSave: () => {
		const queryClient = useQueryClient()
		return useMutation({
			mutationFn: (args: {
				waId: string
				snapshot: Partial<{
					name?: string | null
					age?: number | null
					document?: unknown
				}>
			}) => svc.save(args.waId, args.snapshot),
			onSuccess: (_data, variables) => {
				// Invalidate queries to mark them as stale
				// The caller is responsible for populating cache before navigation
				queryClient.invalidateQueries({
					queryKey: DOCUMENT_QUERY_KEY.byWaId(variables.waId),
				})
				queryClient.invalidateQueries({
					queryKey: [...DOCUMENT_QUERY_KEY.byWaId(variables.waId), 'canvas'],
				})
			},
		})
	},

	useEnsureInitialized: () =>
		useCallback(async (waId: string) => svc.ensureInitialized(waId), [svc]),
})
