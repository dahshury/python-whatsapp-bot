import { markLocalOperation } from "@shared/libs/utils/local-ops";
import { WebSocketService } from "@/services/websocket/websocket.service";

export class ChatService {
	private ws = new WebSocketService();

	async sendConversationMessage(waId: string, text: string): Promise<void> {
		const now = new Date();
		const currentDate = now.toISOString().slice(0, 10);
		const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

		// mark local op so unread counters don't increment for own send
		markLocalOperation(`conversation_new_message:${String(waId)}:${currentDate}:${currentTime}`, 5000);

		// Try WebSocket first
		const wsOk = await this.ws.sendMessage({
			type: "conversation_send_message",
			data: { wa_id: waId, message: text },
		});
		if (wsOk) return;

		// Fallback to HTTP
		const res = await fetch("/api/message/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ wa_id: waId, text }),
		});
		if (!res.ok) {
			let msg = "Failed to send message";
			try {
				const data = await res.json();
				msg = data?.message || msg;
			} catch {}
			throw new Error(msg);
		}
	}

	async sendTyping(waId: string, typing: boolean): Promise<boolean> {
		try {
			const ok = await this.ws.sendMessage({
				type: "secretary_typing",
				data: { wa_id: waId, typing },
			});
			return Boolean(ok);
		} catch {
			return false;
		}
	}
}

export const chatService = new ChatService();
