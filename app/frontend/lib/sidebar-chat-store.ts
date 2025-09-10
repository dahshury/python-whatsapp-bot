import { create } from "zustand"; // ESM import

interface SidebarChatState {
	// Basic sidebar open state (legacy)
	isOpen: boolean;
	open: (id?: string) => void;
	close: () => void;

	// Chat-specific state
	isChatSidebarOpen: boolean;
	activeTab: "calendar" | "chat";
	selectedConversationId?: string | null;
	isLoadingConversation: boolean;

	// Cross-component triggers
	shouldOpenChat: boolean;
	conversationIdToOpen?: string | null;

	// Hydration flag expected by UI
	_hasHydrated: boolean;

	// Actions
	setActiveTab: (tab: "calendar" | "chat") => void;
	setChatSidebarOpen: (open: boolean) => void;
	setSelectedConversation: (id?: string | null) => void;
	setLoadingConversation: (loading: boolean) => void;
	clearOpenRequest: () => void;
	openConversation: (id: string) => void;
	setConversation: (id?: string | null) => void; // alias
}

const useSidebarChatStore = create<SidebarChatState>((set) => ({
	// Defaults
	isOpen: false,
	isChatSidebarOpen: false,
	activeTab: "calendar",
	selectedConversationId: null,
	isLoadingConversation: false,
	shouldOpenChat: false,
	conversationIdToOpen: null,
	_hasHydrated: true,

	// Legacy open/close
	open: (id?: string | null) =>
		set((s) => ({
			isOpen: true,
			isChatSidebarOpen: true,
			selectedConversationId: id ?? s.selectedConversationId ?? null,
		})),
	close: () => set({ isOpen: false, isChatSidebarOpen: false }),

	// Actions
	setActiveTab: (tab) => set({ activeTab: tab }),
	setChatSidebarOpen: (open) => set({ isChatSidebarOpen: open }),
	setSelectedConversation: (id) => set({ selectedConversationId: id ?? null }),
	setLoadingConversation: (loading) => set({ isLoadingConversation: loading }),
	clearOpenRequest: () =>
		set({ shouldOpenChat: false, conversationIdToOpen: null }),
	openConversation: (id) =>
		set({
			shouldOpenChat: true,
			conversationIdToOpen: id,
			activeTab: "chat",
			isChatSidebarOpen: true,
			selectedConversationId: id,
			isLoadingConversation: true,
		}),
	setConversation: (id) => set({ selectedConversationId: id ?? null }),
}));

export { useSidebarChatStore };
