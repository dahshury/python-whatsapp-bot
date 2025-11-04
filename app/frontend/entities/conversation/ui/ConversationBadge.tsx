import type React from 'react'

type Props = {
	messageCount?: number
	hasUnread?: boolean
	size?: 'sm' | 'md' | 'lg'
}

const BADGE_MIN_WIDTHS = {
	sm: 18,
	md: 20,
	lg: 24,
} as const

const sizeMap = {
	sm: { padding: '2px 6px', fontSize: 11 },
	md: { padding: '4px 8px', fontSize: 12 },
	lg: { padding: '6px 10px', fontSize: 14 },
}

function getMinWidth(size: 'sm' | 'md' | 'lg'): number {
	return BADGE_MIN_WIDTHS[size]
}

export const ConversationBadge: React.FC<Props> = ({
	messageCount = 0,
	hasUnread = false,
	size = 'md',
}) => {
	const sizeStyles = sizeMap[size]

	const ariaLabel = `${messageCount} messages${hasUnread ? ', unread' : ''}`

	return (
		<span
			style={{
				...sizeStyles,
				borderRadius: 12,
				background: hasUnread ? '#3B82F6' : '#E5E7EB',
				color: hasUnread ? '#FFFFFF' : '#374151',
				fontWeight: 600,
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				minWidth: getMinWidth(size),
			}}
			title={ariaLabel}
		>
			{messageCount}
		</span>
	)
}

export default ConversationBadge
