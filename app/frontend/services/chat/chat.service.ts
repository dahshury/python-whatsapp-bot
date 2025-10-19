import { markLocalOperation } from "@shared/libs/utils/local-ops";
import { zApiResponse } from "@shared/validation/api/response.schema";
import { z } from "zod";
import { WebSocketService } from "@/services/websocket/websocket.service";

const LOCAL_OP_DEBOUNCE_MS = 5000;

export class ChatService {
	private readonly ws = new WebSocketService();

	async sendConversationMessage(waId: string, text: string): Promise<void> {
		const now = new Date();
		const currentDate = now.toISOString().slice(0, 10);
		const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

		// mark local op so unread counters don't increment for own send
		markLocalOperation(
			`conversation_new_message:${String(waId)}:${currentDate}:${currentTime}`,
			LOCAL_OP_DEBOUNCE_MS
		);

		// Try WebSocket first
		const wsOk = await this.ws.sendMessage({
			type: "conversation_send_message",
			data: { wa_id: waId, message: text },
		});
		if (wsOk) {
			return;
		}

		// Fallback to HTTP
		const res = await fetch("/api/message/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ wa_id: waId, text }),
		});
		if (!res.ok) {
			let msg = "Failed to send message";
			try {
				const ct = res.headers.get("content-type") || "";
				if (ct.includes("application/json")) {
					const schema = zApiResponse(z.object({}).passthrough());
					const data = (await res.json().catch(() => ({}))) as unknown;
					const parsed = schema.safeParse(data);
					if (parsed.success) {
						msg =
							parsed.data.message ||
							(parsed.data as { error?: string }).error ||
							(parsed.data as { detail?: string }).detail ||
							msg;
					} else {
						msg = parsed.error.message || msg;
					}
				} else {
					msg = await res.text();
				}
			} catch {
				// Silently ignore parsing errors, use default message
			}
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
