'use client'

import { i18n } from '@shared/libs/i18n'
import { Badge } from '@ui/badge'
import { TabsList, TabsTrigger } from '@/shared/ui/tabs'

type NotificationTabsHeaderProps = {
	unreadCount: number
	onMarkAllAsRead: () => void
	isLocalized: boolean
}

export function NotificationTabsHeader({
	unreadCount,
	onMarkAllAsRead,
	isLocalized,
}: NotificationTabsHeaderProps) {
	return (
		<div className="flex items-center justify-between border-b px-3 py-2">
			<TabsList className="bg-transparent">
				<TabsTrigger className="text-sm" value="all">
					{i18n.getMessage('all', isLocalized)}
				</TabsTrigger>
				<TabsTrigger className="text-sm" value="unread">
					{i18n.getMessage('unread', isLocalized)}{' '}
					{unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}
				</TabsTrigger>
			</TabsList>
			{unreadCount > 0 && (
				<button
					className="font-medium text-muted-foreground text-xs hover:underline"
					onClick={onMarkAllAsRead}
					type="button"
				>
					{i18n.getMessage('mark_all_as_read', isLocalized)}
				</button>
			)}
		</div>
	)
}
