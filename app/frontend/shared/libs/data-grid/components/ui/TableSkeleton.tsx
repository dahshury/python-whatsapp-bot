"use client";

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
	className?: string;
}

export function TableSkeleton({ rows = 5, columns = 5, className = "" }: TableSkeletonProps) {
	return (
		<div className={`w-full space-y-3 ${className}`}>
			{/* Header */}
			<div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
				{Array.from({ length: columns }, (_, i) => `header-${i}`).map((key) => (
					<div key={`skeleton-${key}`} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
				))}
			</div>

			{/* Body */}
			<div className="space-y-2">
				{Array.from({ length: rows }, (_, rowIndex) => `row-${rowIndex}`).map((key) => (
					<div
						key={`skeleton-${key}`}
						className="grid gap-3"
						style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
					>
						{Array.from({ length: columns }, (_, colIndex) => `cell-${key.split("-")[1]}-col${colIndex}`).map(
							(cellKey) => (
								<div key={`skeleton-${cellKey}`} className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
							)
						)}
					</div>
				))}
			</div>
		</div>
	);
}
