import { create } from "zustand";

type TypingState = {
	typingByConversation: Record<string, boolean>;
	_timeouts: Record<string, number | undefined>;
	notifyTyped: (waId: string) => void;
	clearTyping: (waId: string) => void;
	clearAll: () => void;
};

const TYPING_TIMEOUT_MS = 3000;

export const useChatTypingStore = create<TypingState>()((set, get) => ({
	typingByConversation: {},
	_timeouts: {},
	notifyTyped: (waId: string) => {
		if (!waId) return;
		const existing = get()._timeouts[waId];
		if (existing) {
			clearTimeout(existing as unknown as number);
		}
		// Mark as typing now
		set((s) => ({
			typingByConversation: { ...s.typingByConversation, [waId]: true },
		}));
		// Schedule clear
		const id = setTimeout(() => {
			try {
				const cur = get().typingByConversation[waId];
				if (cur) {
					set((s) => ({
						typingByConversation: { ...s.typingByConversation, [waId]: false },
					}));
				}
			} catch {
				// ignore
			}
		}, TYPING_TIMEOUT_MS) as unknown as number;
		set((s) => ({ _timeouts: { ...s._timeouts, [waId]: id } }));
	},
	clearTyping: (waId: string) => {
		if (!waId) return;
		const existing = get()._timeouts[waId];
		if (existing) clearTimeout(existing as unknown as number);
		set((s) => ({
			typingByConversation: { ...s.typingByConversation, [waId]: false },
			_timeouts: { ...s._timeouts, [waId]: undefined },
		}));
	},
	clearAll: () => {
		const ids = Object.values(get()._timeouts).filter(Boolean) as number[];
		for (const id of ids) clearTimeout(id as unknown as number);
		set({ typingByConversation: {}, _timeouts: {} });
	},
}));
