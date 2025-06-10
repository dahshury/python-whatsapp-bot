"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Play, 
  Square,
  Plane
} from 'lucide-react'
import { useVacation } from '@/lib/vacation-context'
import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'

export function VacationPeriods() {
  const { isRTL } = useLanguage()
  const {
    vacationPeriods,
    loading,
    addVacationPeriod,
    removeVacationPeriod,
    recordingState,
    startRecording,
    stopRecording
  } = useVacation()

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isRecording = (periodIndex: number, field: 'start' | 'end') => {
    return recordingState.periodIndex === periodIndex && recordingState.field === field
  }

  const handleRecordingToggle = (periodIndex: number, field: 'start' | 'end') => {
    if (isRecording(periodIndex, field)) {
      stopRecording()
    } else {
      startRecording(periodIndex, field)
    }
  }

  return (
    <div className="space-y-2">
      {vacationPeriods.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <Plane className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p className="text-sm">
            {isRTL ? "لا توجد فترات إجازة" : "No vacation periods"}
          </p>
        </div>
      ) : (
        vacationPeriods.map((period, index) => (
          <div key={index} className="relative border rounded-md p-2">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {isRTL ? `فترة ${index + 1}` : `Period ${index + 1}`}
              </Badge>
              <div className="flex items-center">
                <Badge variant="outline" className="text-xs mr-2">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} {isRTL ? "أيام" : "days"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeVacationPeriod(index)}
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Start Date */}
              <div className="flex items-center justify-between border rounded-md p-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "البداية" : "Start"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(period.start)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isRecording(index, 'start') ? "default" : "outline"}
                  onClick={() => handleRecordingToggle(index, 'start')}
                  className={cn(
                    "h-7 w-7 p-0 ml-1",
                    isRecording(index, 'start') && "animate-pulse"
                  )}
                >
                  {isRecording(index, 'start') ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* End Date */}
              <div className="flex items-center justify-between border rounded-md p-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "النهاية" : "End"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(period.end)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isRecording(index, 'end') ? "default" : "outline"}
                  onClick={() => handleRecordingToggle(index, 'end')}
                  className={cn(
                    "h-7 w-7 p-0 ml-1",
                    isRecording(index, 'end') && "animate-pulse"
                  )}
                >
                  {isRecording(index, 'end') ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Recording indicator */}
            {(isRecording(index, 'start') || isRecording(index, 'end')) && (
              <div className="absolute inset-0 bg-primary/5 border-2 border-primary/20 rounded-md pointer-events-none">
                <div className="absolute top-1 right-1">
                  <Badge variant="default" className="text-xs animate-pulse">
                    {isRTL ? "تسجيل..." : "Rec..."}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Instructions and Add Button */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {isRTL 
              ? "اضغط لتسجيل تاريخ البداية/النهاية"
              : "Press play to record start/end date"
            }
          </p>
          <Button
              size="sm"
              variant="outline"
              onClick={addVacationPeriod}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
        </div>
    </div>
  )
} 