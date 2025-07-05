"use client";

import { Skeleton } from "@/components/ui/skeleton";

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
				className="table-skeleton-grid"
				style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
			>
				{Array.from({ length: columns }).map((_, i) => (
					<Skeleton key={i} className="h-8" />
				))}
			</div>

			{/* Body */}
			<div className="space-y-2">
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<div
						key={`row-${rowIndex}`}
						className="table-skeleton-grid"
						style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
					>
						{Array.from({ length: columns }).map((_, colIndex) => (
							<Skeleton
								key={`cell-${rowIndex}-${colIndex}`}
								className="h-6 w-full"
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export default TableSkeleton;
