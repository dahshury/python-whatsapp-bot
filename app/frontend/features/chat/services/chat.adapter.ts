import { logger } from '@/shared/libs/logger'
import { markLocalOperation } from '@/shared/libs/utils/local-ops'
import type { ChatPort, ChatUpdate, WebSocketPort } from '@/shared/ports'

const LOCAL_OP_DEBOUNCE_MS = 5000

export class ChatAdapter implements ChatPort {
	private readonly wsPort: WebSocketPort

	constructor(wsPort: WebSocketPort) {
		this.wsPort = wsPort
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

		const response = await fetch('/api/message/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ wa_id: waId, text }),
		})
		if (!response.ok) {
			let msg = 'Failed to send message'
			try {
				const data = (await response.json()) as { message?: string }
				msg = data?.message || msg
			} catch (error) {
				logger.warn('[ChatAdapter] Failed to parse error response', error)
			}
			throw new Error(msg)
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
