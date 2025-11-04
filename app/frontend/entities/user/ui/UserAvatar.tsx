import type React from 'react'

const FONT_SIZE_RATIO = 0.5

type Props = {
	name?: string
	size?: number
}

export const UserAvatar: React.FC<Props> = ({ name = '?', size = 24 }) => {
	const initials = (name || '?')
		.trim()
		.split(' ')
		.map((s) => s[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()

	return (
		<div
			aria-label={name}
			role="img"
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				background: '#E5E7EB',
				color: '#111827',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: size * FONT_SIZE_RATIO,
				fontWeight: 600,
			}}
		>
			{initials || '?'}
		</div>
	)
}

export default UserAvatar
