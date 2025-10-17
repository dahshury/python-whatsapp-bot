/*
 * Chat orchestration utilities
 * - Centralizes send flow and typing indicator throttling
 */

import { chatService } from "@/services/chat/chat.service";

export async function sendChatMessage(
	waId: string,
	text: string
): Promise<void> {
	await chatService.sendConversationMessage(waId, text);
}

export function createTypingIndicatorController(options: {
	waId: string;
	throttleMs?: number; // default 8000
}) {
	const { waId, throttleMs = 8000 } = options;
	let lastSent = 0;
	let typingStarted = false;

	function onUserTyped(): void {
		try {
			const now = Date.now();
			if (!typingStarted) {
				chatService.sendTyping(waId, true);
				typingStarted = true;
				lastSent = now;
				return;
			}
			if (now - lastSent >= throttleMs) {
				chatService.sendTyping(waId, true);
				lastSent = now;
			}
		} catch (_error) {
			// Silently ignore typing indicator errors - they don't affect message delivery
		}
	}

	async function stop(): Promise<void> {
		try {
			if (typingStarted) {
				await chatService.sendTyping(waId, false);
			}
		} catch (_error) {
			// Silently ignore typing stop errors - user experience not affected
		} finally {
			typingStarted = false;
		}
	}

	return { onUserTyped, stop } as const;
}
