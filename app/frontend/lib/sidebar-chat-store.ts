import { create } from "zustand"; // ESM import
import { persist, createJSONStorage } from "zustand/middleware";

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

	// Documents-specific state (selection without URL params)
	selectedDocumentWaId: string | null;

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
	setSelectedDocumentWaId: (waId?: string | null) => void;
	clearOpenRequest: () => void;
	openConversation: (id: string) => void;
	setConversation: (id?: string | null) => void; // alias
}

const useSidebarChatStore = create<SidebarChatState>()(
    persist(
        (set, get) => ({
	// Defaults
	isOpen: false,
	isChatSidebarOpen: false,
	activeTab: "calendar",
	selectedConversationId: null,
	isLoadingConversation: false,
	selectedDocumentWaId: null,
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
    setSelectedDocumentWaId: (waId) => set({ selectedDocumentWaId: waId ?? null }),
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
        }),
        {
            name: "sidebar-chat-store",
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                selectedDocumentWaId: state.selectedDocumentWaId,
            }),
            onRehydrateStorage: () => {
                return () => {
                    try {
                        // Signal that client-side state has hydrated
                        set({ _hasHydrated: true });
                    } catch {}
                };
            },
        },
    ),
);

export { useSidebarChatStore };
