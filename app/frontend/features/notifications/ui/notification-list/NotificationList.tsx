'use client'

import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import type { NotificationItem } from '@/entities/notification/types'
import type { NotificationUIEntry } from '@/features/notifications/ui/notification-item'
import { NotificationItemComponent } from '@/features/notifications/ui/notification-item'

type NotificationListProps = {
	entries: NotificationUIEntry[]
	items: NotificationItem[]
	onItemClick: (item: NotificationItem) => void
	onGroupClick: (waId: string, date: string) => void
	onClose: () => void
}

export function NotificationList({
	entries,
	items,
	onItemClick,
	onGroupClick,
	onClose,
}: NotificationListProps) {
	return (
		<>
			{entries.map((entry) => (
				<NotificationItemComponent
					entry={entry}
					key={entry.id}
					onClick={() => {
						if (entry.kind === 'group') {
							// mark all in group as read and open chat
							onGroupClick(entry.waId, entry.date)
							try {
								if (entry.waId) {
									useSidebarChatStore.getState().openConversation(entry.waId)
								}
							} catch {
								// Ignore errors when opening conversation from notification
							}
							onClose()
							return
						}
						const raw = items.find((it) => it.id === entry.id)
						if (raw) {
							onItemClick(raw)
						}
					}}
				/>
			))}
		</>
	)
}
