import type { ConversationMessage } from "@/entities/conversation";

// Merge incoming conversation maps into previous state without duplicating messages.
export function mergeConversationMaps(
	prev: Record<string, ConversationMessage[]>,
	nextMap: Record<string, ConversationMessage[]>
): Record<string, ConversationMessage[]> {
	const merged: Record<string, ConversationMessage[]> = { ...prev };
	for (const [waId, list] of Object.entries(nextMap)) {
		if (!Array.isArray(list)) {
			continue;
		}
		const prevList = (merged[waId] || []) as ConversationMessage[];
		const msgKey = (m: ConversationMessage) =>
			`${m.date || ""}|${m.time || ""}|${m.message || ""}`;
		const seen = new Set(prevList.map(msgKey));
		const additions = (list as ConversationMessage[]).filter((m) => {
			const k = msgKey(m);
			if (seen.has(k)) {
				return false;
			}
			seen.add(k);
			return true;
		});
		merged[waId] = prevList.length
			? [...prevList, ...additions]
			: (list as ConversationMessage[]);
	}
	return merged;
}
