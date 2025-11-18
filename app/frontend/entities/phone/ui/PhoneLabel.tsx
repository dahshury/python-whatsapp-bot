import type React from 'react'

type Props = {
	number: string
	name?: string
	country?: string
	displayNumber?: string
	size?: 'sm' | 'md' | 'lg'
	showCountry?: boolean
}

const COUNTRY_FONT_SIZE_RATIO = 0.85
const PHONE_FONT_SIZE_RATIO = 0.9

const sizeMap = {
	sm: { fontSize: 12, gap: 4 },
	md: { fontSize: 14, gap: 6 },
	lg: { fontSize: 16, gap: 8 },
}

export const PhoneLabel: React.FC<Props> = ({
	number,
	name,
	country,
	displayNumber,
	size = 'md',
	showCountry = true,
}) => {
	const sizeStyles = sizeMap[size]
	const phoneDisplay = displayNumber || number

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: sizeStyles.gap,
				fontSize: sizeStyles.fontSize,
			}}
		>
			{showCountry && country && (
				<span
					style={{
						padding: '2px 6px',
						borderRadius: 4,
						background: '#F3F4F6',
						color: '#6B7280',
						fontSize: sizeStyles.fontSize * COUNTRY_FONT_SIZE_RATIO,
						fontWeight: 600,
					}}
					title={`Country: ${country}`}
				>
					{country.toUpperCase()}
				</span>
			)}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 2,
				}}
			>
				{name && (
					<span
						style={{
							fontWeight: 600,
							color: '#111827',
						}}
					>
						{name}
					</span>
				)}
				<span
					style={{
						color: '#6B7280',
						fontSize: sizeStyles.fontSize * PHONE_FONT_SIZE_RATIO,
					}}
				>
					{phoneDisplay}
				</span>
			</div>
		</div>
	)
}

export default PhoneLabel
