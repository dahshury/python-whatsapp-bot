"use client";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

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
        style={
          {
            "--gdg-skeleton-columns": `repeat(${columns}, 1fr)`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: columns }, (_, i) => `header-${i}`).map((key) => (
          <div
            className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
            key={`skeleton-${key}`}
          />
        ))}
      </div>

      {/* Body */}
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, rowIndex) => `row-${rowIndex}`).map(
          (key) => (
            <div
              className="table-skeleton-grid"
              key={`skeleton-${key}`}
              style={
                {
                  "--gdg-skeleton-columns": `repeat(${columns}, 1fr)`,
                } as React.CSSProperties
              }
            >
              {Array.from(
                { length: columns },
                (_, colIndex) => `cell-${key.split("-")[1]}-col${colIndex}`
              ).map((cellKey) => (
                <div
                  className="h-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                  key={`skeleton-${cellKey}`}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
