import type React from 'react'

type Props = {
	isActive?: boolean
	startDate?: string
	endDate?: string
	size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
	sm: { padding: '2px 6px', fontSize: 11 },
	md: { padding: '4px 8px', fontSize: 12 },
	lg: { padding: '6px 10px', fontSize: 14 },
}

export const VacationBadge: React.FC<Props> = ({
	isActive = false,
	startDate,
	endDate,
	size = 'md',
}) => {
	const sizeStyles = sizeMap[size]
	const label = isActive ? 'On Vacation' : 'Vacation Scheduled'

	const formatDate = (dateStr?: string) => {
		if (!dateStr) {
			return ''
		}
		try {
			const date = new Date(dateStr)
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			})
		} catch {
			return ''
		}
	}

	const dateRange =
		startDate && endDate
			? `${formatDate(startDate)} - ${formatDate(endDate)}`
			: ''

	const tooltipText = `${label}${dateRange ? `: ${dateRange}` : ''}`

	return (
		<span
			style={{
				...sizeStyles,
				borderRadius: 6,
				background: isActive ? '#DBEAFE' : '#F3F4F6',
				color: isActive ? '#1E40AF' : '#6B7280',
				fontWeight: 600,
				display: 'inline-block',
			}}
			title={tooltipText}
		>
			{label}
		</span>
	)
}

export default VacationBadge
