import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
  return (
    <div className="w-full h-full min-h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        {/* Left side - Today and navigation buttons */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" /> {/* Today button */}
          <Skeleton className="h-8 w-8" />   {/* Prev button */}
          <Skeleton className="h-8 w-8" />   {/* Next button */}
        </div>
        
        {/* Center - Title */}
        <Skeleton className="h-8 w-48" />
        
        {/* Right side - View buttons */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-20" /> {/* Year view */}
          <Skeleton className="h-8 w-20" /> {/* Month view */}
          <Skeleton className="h-8 w-20" /> {/* Week view */}
          <Skeleton className="h-8 w-20" /> {/* List view */}
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="space-y-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        
        {/* Calendar weeks */}
        {Array.from({ length: 6 }).map((_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={`${weekIndex}-${dayIndex}`} className="space-y-2">
                <Skeleton className="h-24 w-full" />
                {/* Some days might have events - using deterministic pattern */}
                {(weekIndex + dayIndex) % 3 === 0 && (
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    {(weekIndex + dayIndex) % 5 === 0 && <Skeleton className="h-4 w-1/2" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
} 