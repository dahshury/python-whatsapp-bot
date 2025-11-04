const SKELETON_ANIMATION_STAGGER_SECONDS = 0.05

type GridLoadingStateProps = {
	/** Optional custom loading text */
	loadingText?: string
	/** Optional height for the loading container */
	height?: number | string
	/** Optional class name for styling */
	className?: string
	/** Show skeleton rows instead of spinner */
	showSkeleton?: boolean
	/** Number of skeleton rows to show */
	skeletonRows?: number
	/** Number of skeleton columns to show */
	skeletonColumns?: number
}

/**
 * Generic loading state component for grids
 * Can show either a spinner or skeleton rows
 */
export function GridLoadingState({
	loadingText = 'Loading...',
	height = 400,
	className = '',
	showSkeleton = false,
	skeletonRows = 5,
	skeletonColumns = 5,
}: GridLoadingStateProps) {
	if (showSkeleton) {
		return (
			<div
				className={`grid-loading-skeleton ${className}`}
				style={{
					height: typeof height === 'number' ? `${height}px` : height,
					padding: '16px',
				}}
			>
				{/* Header skeleton */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: `repeat(${skeletonColumns}, 1fr)`,
						gap: '8px',
						marginBottom: '12px',
					}}
				>
					{Array.from({ length: skeletonColumns }, (_, i) => `header-${i}`).map(
						(key) => (
							<div
								key={`skeleton-${key}`}
								style={{
									height: '32px',
									backgroundColor: 'var(--gdg-bg-header, hsl(var(--muted)))',
									borderRadius: '4px',
									animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
								}}
							/>
						)
					)}
				</div>

				{/* Body skeleton */}
				{Array.from(
					{ length: skeletonRows },
					(_, rowIndex) => `row-${rowIndex}`
				).map((key) => (
					<div
						key={`skeleton-${key}`}
						style={{
							display: 'grid',
							gridTemplateColumns: `repeat(${skeletonColumns}, 1fr)`,
							gap: '8px',
							marginBottom: '8px',
						}}
					>
						{Array.from({ length: skeletonColumns }, (_, colIndex) => ({
							cellKey: `cell-${key.split('-')[1]}-col${colIndex}`,
							colIndex,
						})).map(({ cellKey, colIndex }) => (
							<div
								key={`skeleton-${cellKey}`}
								style={{
									height: '24px',
									backgroundColor: 'var(--gdg-bg-cell, hsl(var(--card)))',
									borderRadius: '4px',
									animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
									animationDelay: `${
										(Number.parseInt(key.split('-')[1] || '0', 10) + colIndex) *
										SKELETON_ANIMATION_STAGGER_SECONDS
									}s`,
								}}
							/>
						))}
					</div>
				))}
			</div>
		)
	}

	return (
		<div
			className={`grid-loading-spinner ${className}`}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				height: typeof height === 'number' ? `${height}px` : height,
				gap: '16px',
			}}
		>
			<div
				className="glide-loading-spinner"
				style={{
					width: '40px',
					height: '40px',
					borderRadius: '50%',
					border: '3px solid var(--gdg-border-color, hsl(var(--border)))',
					borderTopColor: 'var(--gdg-accent-color, hsl(var(--primary)))',
					animation: 'spin 1s linear infinite',
				}}
			/>
			<div
				className="glide-loading-text"
				style={{
					fontSize: '14px',
					color: 'var(--gdg-text-medium, hsl(var(--muted-foreground)))',
					fontFamily: 'var(--gdg-font-family, var(--font-sans))',
				}}
			>
				{loadingText}
			</div>
		</div>
	)
}

// Add the pulse animation if not already in CSS
if (
	typeof document !== 'undefined' &&
	!document.getElementById('grid-loading-animations')
) {
	const style = document.createElement('style')
	style.id = 'grid-loading-animations'
	style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `
	document.head.appendChild(style)
}
