"use client"

import React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'

interface NotificationsButtonProps {
  className?: string
  notificationCount?: number
}

export function NotificationsButton({ className, notificationCount = 0 }: NotificationsButtonProps) {
  const { isRTL } = useLanguage()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-10 w-10 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors duration-200",
            className
          )}
          aria-label={isRTL ? "الإشعارات" : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        side="bottom" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {isRTL ? "الإشعارات" : "Notifications"}
            </h3>
            {notificationCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {notificationCount}
              </Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px] w-full">
          <div className="p-4">
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isRTL ? "لا توجد إشعارات جديدة" : "No new notifications"}
              </p>
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 