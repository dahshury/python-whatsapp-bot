// Types shared across notifications-related components and hooks

export type NotificationItem = {
	id: string;
	text: string;
	timestamp: number;
	unread: boolean;
	type?: string;
	data?: Record<string, unknown>;
};

export type ReservationData = {
	id?: string;
	wa_id?: string;
	customer_name?: string;
	date?: string;
	time_slot?: string;
};

export type GroupEntry = {
	kind: "group";
	waId: string;
	date: string; // YYYY-MM-DD grouping key
	customerName: string;
	latest: NotificationItem;
	unreadCount: number;
	totalCount: number;
};

export type ItemEntry = { kind: "item"; item: NotificationItem };
export type RenderEntry = GroupEntry | ItemEntry;
