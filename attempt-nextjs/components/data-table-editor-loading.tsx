"use client"

import { TableSkeleton } from "./table-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function DataTableEditorLoading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {/* Table skeleton */}
      <TableSkeleton rows={6} columns={5} />
      
      {/* Footer skeleton */}
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  )
}

export default DataTableEditorLoading 