import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SidebarChatState = {
  isOpen: boolean;
  open: (id?: string) => void;
  close: () => void;
  isChatSidebarOpen: boolean;
  activeTab: "calendar" | "chat";
  selectedConversationId?: string | null;
  isLoadingConversation: boolean;
  selectedDocumentWaId?: string | null;
  shouldOpenChat: boolean;
  conversationIdToOpen?: string | null;
  _hasHydrated: boolean;
  setActiveTab: (tab: "calendar" | "chat") => void;
  setChatSidebarOpen: (open: boolean) => void;
  setSelectedConversation: (id?: string | null) => void;
  setLoadingConversation: (loading: boolean) => void;
  setSelectedDocumentWaId: (id?: string | null) => void;
  clearOpenRequest: () => void;
  openConversation: (id: string) => void;
  setConversation: (id?: string | null) => void;
};

type PersistedSidebarChatState = Pick<
  SidebarChatState,
  "activeTab" | "selectedConversationId"
>;

const defaultPersistedSidebarState: PersistedSidebarChatState = {
  activeTab: "calendar",
  selectedConversationId: null,
};

const useSidebarChatStore = create<SidebarChatState>()(
  persist<SidebarChatState, [], [], PersistedSidebarChatState>(
    (set, _get) => ({
      isOpen: false,
      isChatSidebarOpen: false,
      activeTab: "calendar",
      selectedConversationId: null,
      isLoadingConversation: false,
      selectedDocumentWaId: null,
      shouldOpenChat: false,
      conversationIdToOpen: null,
      _hasHydrated: true,
      open: (id?: string | null) =>
        set((s) => ({
          isOpen: true,
          isChatSidebarOpen: true,
          selectedConversationId: id ?? s.selectedConversationId ?? null,
        })),
      close: () => set({ isOpen: false, isChatSidebarOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setChatSidebarOpen: (open) => set({ isChatSidebarOpen: open }),
      setSelectedConversation: (id) =>
        set({ selectedConversationId: id ?? null }),
      setLoadingConversation: (loading) =>
        set({ isLoadingConversation: loading }),
      setSelectedDocumentWaId: (id) =>
        set({ selectedDocumentWaId: id ?? null }),
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
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSidebarChatState => ({
        activeTab: state.activeTab,
        selectedConversationId: state.selectedConversationId ?? null,
      }),
      migrate: (persistedState, version) => {
        const MIN_SUPPORTED_VERSION = 3;
        if (
          !persistedState ||
          typeof persistedState !== "object" ||
          version < MIN_SUPPORTED_VERSION
        ) {
          return defaultPersistedSidebarState;
        }

        const candidate = persistedState as Partial<PersistedSidebarChatState>;
        const activeTab = candidate.activeTab === "chat" ? "chat" : "calendar";

        const selectedConversationId =
          typeof candidate.selectedConversationId === "string"
            ? candidate.selectedConversationId
            : null;

        return {
          activeTab,
          selectedConversationId,
        };
      },
      onRehydrateStorage: () => () => {
        try {
          useSidebarChatStore.setState({ _hasHydrated: true });
        } catch {
          // State update failed - hydration may be incomplete
        }
      },
    }
  )
);

export { useSidebarChatStore };
