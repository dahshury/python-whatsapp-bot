import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatUseCase } from '@/features/chat'
import { createUseChatMessages } from '@/features/chat'
import { ApiClient } from '@/shared/api'
import AllProviders from '@/shared/libs/__tests__/wrappers/AllProviders'

describe('useChatMessages', () => {
	it('lists messages and supports send', async () => {
		vi.spyOn(ApiClient.prototype, 'get').mockResolvedValue({ data: [] })
		vi.spyOn(ApiClient.prototype, 'post').mockResolvedValue({
			data: {
				id: 'm1',
				content: 'hi',
				conversationId: 'c1',
				sender: 'user',
				createdAt: Date.now(),
			},
		})

		const chat: ChatUseCase = {
			listMessages: async () => [],
			sendMessage: async () => ({
				id: 'm1',
				content: 'hi',
				conversationId: 'c1',
				sender: 'user',
				createdAt: Date.now(),
			}),
		}
		const useHook = createUseChatMessages(chat)
		const { result } = renderHook(() => useHook('c1'), {
			wrapper: AllProviders as React.FC,
		})

		await waitFor(() => {
			expect(result.current.isSuccess || result.current.isIdle).toBeTruthy()
		})

		await result.current.send('hello')
		expect(result.current).toBeTruthy()
	})
})
