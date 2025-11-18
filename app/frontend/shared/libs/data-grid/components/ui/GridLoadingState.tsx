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
				style={
					{
						'--gdg-loading-height':
							typeof height === 'number' ? `${height}px` : height,
					} as React.CSSProperties
				}
			>
				{/* Header skeleton */}
				<div
					className="grid-loading-skeleton-header"
					style={
						{
							'--gdg-skeleton-columns': `repeat(${skeletonColumns}, 1fr)`,
						} as React.CSSProperties
					}
				>
					{Array.from({ length: skeletonColumns }, (_, i) => `header-${i}`).map(
						(key) => (
							<div
								className="grid-loading-skeleton-header-cell"
								key={`skeleton-${key}`}
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
						className="grid-loading-skeleton-row"
						key={`skeleton-${key}`}
						style={
							{
								'--gdg-skeleton-columns': `repeat(${skeletonColumns}, 1fr)`,
							} as React.CSSProperties
						}
					>
						{Array.from({ length: skeletonColumns }, (_, colIndex) => ({
							cellKey: `cell-${key.split('-')[1]}-col${colIndex}`,
							colIndex,
						})).map(({ cellKey, colIndex }) => (
							<div
								className="grid-loading-skeleton-cell"
								key={`skeleton-${cellKey}`}
								style={
									{
										'--gdg-skeleton-delay': `${
											(Number.parseInt(key.split('-')[1] || '0', 10) +
												colIndex) *
											SKELETON_ANIMATION_STAGGER_SECONDS
										}s`,
									} as React.CSSProperties
								}
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
			style={
				{
					'--gdg-loading-height':
						typeof height === 'number' ? `${height}px` : height,
				} as React.CSSProperties
			}
		>
			<div className="glide-loading-spinner" />
			<div className="glide-loading-text">{loadingText}</div>
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
