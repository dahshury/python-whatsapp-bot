export type ChatSidebarContentProps = {
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	onRefresh?: () => void;
	className?: string;
	conversations?: Record<string, unknown[]>;
	reservations?: Record<string, unknown[]>;
	selectedTab?: string;
	onTabChange?: (tab: string) => void;
	isLocalized?: boolean;
};

