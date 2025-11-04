import type { LucideIcon } from 'lucide-react'
import {
	AlertCircle,
	ClipboardCheck,
	FileText,
	MessageSquareQuote,
} from 'lucide-react'
import type { NotificationType } from '@/entities/notification/types'

export function getNotificationIcon(
	type: NotificationType | string | undefined
): LucideIcon {
	if (type === 'conversation_new_message') {
		return MessageSquareQuote
	}
	if (
		type === 'reservation_created' ||
		type === 'reservation_updated' ||
		type === 'reservation_reinstated'
	) {
		return ClipboardCheck
	}
	if (type === 'reservation_cancelled') {
		return AlertCircle
	}
	if (type === 'vacation_period_updated') {
		return AlertCircle
	}
	return FileText
}
