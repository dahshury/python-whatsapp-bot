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
				{Array.from({ length: columns }, (_, i) => `header-${i}`).map((key) => (
					<Skeleton key={`skeleton-${key}`} className="h-8" />
				))}
			</div>

			{/* Body */}
			<div className="space-y-2">
				{Array.from({ length: rows }, (_, rowIndex) => `row-${rowIndex}`).map(
					(key) => (
						<div
							key={`skeleton-${key}`}
							className="table-skeleton-grid"
							style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
						>
							{Array.from(
								{ length: columns },
								(_, colIndex) => `cell-${key.split("-")[1]}-col${colIndex}`,
							).map((cellKey) => (
								<Skeleton key={`skeleton-${cellKey}`} className="h-6 w-full" />
							))}
						</div>
					),
				)}
			</div>
		</div>
	);
}

export default TableSkeleton;
