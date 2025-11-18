import { logger } from '@/shared/libs/logger'
import { markLocalOperation } from '@/shared/libs/utils/local-ops'
import type {
	ChatPort,
	ChatUpdate,
	HttpClientPort,
	WebSocketPort,
} from '@/shared/ports'

const LOCAL_OP_DEBOUNCE_MS = 5000

export class ChatAdapter implements ChatPort {
	private readonly wsPort: WebSocketPort
	private readonly httpPort: HttpClientPort

	constructor(wsPort: WebSocketPort, httpPort: HttpClientPort) {
		this.wsPort = wsPort
		this.httpPort = httpPort
	}

	async sendMessage(waId: string, text: string): Promise<void> {
		const now = new Date()
		const currentDate = now.toISOString().slice(0, 10)
		const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
			.getMinutes()
			.toString()
			.padStart(2, '0')}`

		markLocalOperation(
			`conversation_new_message:${waId}:${currentDate}:${currentTime}`,
			LOCAL_OP_DEBOUNCE_MS
		)

		const wsOk = await this.wsPort.send({
			type: 'conversation_send_message',
			data: { wa_id: waId, message: text },
		})
		if (wsOk) {
			return
		}

		// Fallback to HTTP using httpAdapter when WebSocket fails
		try {
			const response = await this.httpPort.post<{
				success?: boolean
				message?: string
			}>('/api/message/send', { wa_id: waId, text })

			if (!response || (response as { success?: boolean }).success === false) {
				const msg =
					(response as { message?: string })?.message ||
					'Failed to send message'
				throw new Error(msg)
			}
		} catch (error) {
			if (error instanceof Error) {
				throw error
			}
			logger.warn(
				'[ChatAdapter] Failed to send message via HTTP fallback',
				error
			)
			throw new Error('Failed to send message')
		}
	}

	async sendTyping(waId: string, typing: boolean): Promise<boolean> {
		const ok = await this.wsPort.send({
			type: 'typing_indicator',
			data: { wa_id: waId, typing },
		})
		return ok
	}

	subscribe(callback: (update: ChatUpdate) => void): () => void {
		const unsubscribe = this.wsPort.subscribe((message) => {
			if (message.type === 'conversation_update') {
				callback({ type: 'message_sent', data: message.data })
			} else if (message.type === 'typing_indicator') {
				callback({ type: 'typing_indicator', data: message.data })
			} else if (message.type === 'connection_change') {
				callback({ type: 'connection_change', data: message.data })
			}
		})
		return unsubscribe
	}
}
