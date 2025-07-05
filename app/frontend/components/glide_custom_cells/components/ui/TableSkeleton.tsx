"use client";

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
	className?: string;
}

export function TableSkeleton({
	rows = 5,
	columns = 5,
	className = "",
}: TableSkeletonProps) {
	return (
		<div className={`w-full space-y-3 ${className}`}>
			{/* Header */}
			<div
				className="grid gap-3"
				style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
			>
				{Array.from({ length: columns }).map((_, i) => (
					<div
						key={i}
						className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
					/>
				))}
			</div>

			{/* Body */}
			<div className="space-y-2">
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<div
						key={`row-${rowIndex}`}
						className="grid gap-3"
						style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
					>
						{Array.from({ length: columns }).map((_, colIndex) => (
							<div
								key={`cell-${rowIndex}-${colIndex}`}
								className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export default TableSkeleton;
