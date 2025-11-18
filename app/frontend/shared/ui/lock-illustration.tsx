import { useId } from 'react'

export function LockIllustration({ className }: { className?: string }) {
	const baseId = useId()
	const gradId = `${baseId}-lockBody`
	const glowId = `${baseId}-lockGlow`
	return (
		<svg
			aria-label="Locked"
			className={className}
			role="img"
			viewBox="0 0 256 256"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				{/* Theming via CSS variables from our settings theme */}
				<linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
					<stop
						offset="100%"
						stopColor="hsl(var(--accent))"
						stopOpacity="0.75"
					/>
				</linearGradient>
				<radialGradient cx="50%" cy="40%" id={glowId} r="60%">
					<stop offset="0%" stopColor="hsl(var(--ring))" stopOpacity="0.3" />
					<stop offset="100%" stopColor="hsl(var(--ring))" stopOpacity="0" />
				</radialGradient>
			</defs>

			{/* Soft glow behind the lock for contrast on any background */}
			<circle cx="128" cy="136" fill={`url(#${glowId})`} r="100" />

			{/* Shackle */}
			<path
				d="M88 112V88c0-22.091 17.909-40 40-40s40 17.909 40 40v24h-20V88c0-11.046-8.954-20-20-20s-20 8.954-20 20v24H88z"
				fill="hsl(var(--muted-foreground))"
				opacity="0.55"
			/>

			{/* Body */}
			<rect
				fill={`url(#${gradId})`}
				height="120"
				rx="20"
				width="144"
				x="56"
				y="112"
			/>

			{/* Keyhole */}
			<path
				d="M128 150c-13.255 0-24 10.745-24 24 0 8.859 4.855 16.582 12 20.707V208c0 6.627 5.373 12 12 12s12-5.373 12-12v-13.293c7.145-4.125 12-11.848 12-20.707 0-13.255-10.745-24-24-24z"
				fill="hsl(var(--primary-foreground))"
				opacity="0.9"
			/>

			{/* Outline for legibility */}
			<rect
				fill="none"
				height="120"
				rx="20"
				stroke="hsl(var(--ring))"
				strokeOpacity="0.35"
				strokeWidth="3"
				width="144"
				x="56"
				y="112"
			/>
		</svg>
	)
}
