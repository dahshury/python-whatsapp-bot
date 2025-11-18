import { beforeEach, expect, test, vi } from 'vitest'
import { ApiClient } from '@/shared/api'
import { ChatService } from '../services/chat.service'

beforeEach(() => {
	vi.restoreAllMocks()
})

test('listMessages calls GET and returns array', async () => {
	vi.spyOn(ApiClient.prototype, 'get').mockResolvedValue({
		data: [{ id: '1', content: 'hi' }],
	} as unknown as { data?: Array<{ id: string; content: string }> })
	const svc = ChatService()
	const res = await svc.listMessages('conv-1')
	expect(res).toEqual([{ id: '1', content: 'hi' }])
})

test('sendMessage calls POST and returns message', async () => {
	vi.spyOn(ApiClient.prototype, 'post').mockResolvedValue({
		data: { id: '2', content: 'ok' },
	} as unknown as { data?: { id: string; content: string } })
	const svc = ChatService()
	const res = await svc.sendMessage('conv-1', 'hello')
	expect(res).toEqual({ id: '2', content: 'ok' })
})
