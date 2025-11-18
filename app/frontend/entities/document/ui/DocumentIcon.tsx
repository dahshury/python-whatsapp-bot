import type React from 'react'

type Props = { size?: number }

export const DocumentIcon: React.FC<Props> = ({ size = 16 }) => (
	<svg
		aria-hidden
		fill="none"
		height={size}
		viewBox="0 0 24 24"
		width={size}
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>Document icon</title>
		<path
			d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
			fill="#E5E7EB"
			stroke="#374151"
		/>
		<path d="M14 2v6h6" stroke="#374151" />
	</svg>
)

export default DocumentIcon
