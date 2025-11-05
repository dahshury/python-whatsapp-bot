"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Dock, DockIcon } from "@/shared/ui/dock";
import { Spinner } from "@/shared/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

type HoldHandlersProps = {
  // Generic DOM handler bag used by long-press hooks
  [key: string]: unknown;
};

export type SimpleDockBaseProps = {
  className?: string;
  title?: string;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
  isTodayDisabled?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  isLocalized?: boolean;
  prevHoldHandlers?: HoldHandlersProps;
  nextHoldHandlers?: HoldHandlersProps;
};

export function SimpleDockBase({
  className = "",
  title,
  isPrevDisabled = false,
  isNextDisabled = false,
  isTodayDisabled = false,
  onPrev,
  onNext,
  onToday,
  isLocalized = false,
  prevHoldHandlers,
  nextHoldHandlers,
}: SimpleDockBaseProps) {
  const [isHoveringDate, setIsHoveringDate] = useState(false);

  return (
    <TooltipProvider>
      <Dock
        className={cn("h-auto min-h-[2.75rem]", className)}
        direction="middle"
      >
        {/* Left: Previous */}
        <DockIcon {...(prevHoldHandlers || {})}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-9 rounded-full transition-all duration-200"
                disabled={isPrevDisabled}
                onClick={onPrev}
                size="icon"
                variant="ghost"
                {...(prevHoldHandlers || {})}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{i18n.getMessage("msg_previous", isLocalized)}</p>
            </TooltipContent>
          </Tooltip>
        </DockIcon>

        {/* Center: Date button (Today) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "group relative h-9 w-[12.5rem] overflow-hidden rounded-full",
                "hover:bg-accent hover:text-accent-foreground",
                "transition-all duration-200",
                !isTodayDisabled && "cursor-pointer"
              )}
              disabled={isTodayDisabled}
              onClick={onToday}
              onMouseEnter={() => setIsHoveringDate(true)}
              onMouseLeave={() => setIsHoveringDate(false)}
              size="sm"
              variant="ghost"
            >
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-all duration-200",
                  isHoveringDate && !isTodayDisabled
                    ? "scale-75 opacity-0"
                    : "scale-100 opacity-100"
                )}
              >
                <span className="px-2 font-medium text-sm">
                  {title ? title : <Spinner className="mx-auto h-4 w-4" />}
                </span>
              </span>
              <Calendar
                className={cn(
                  "absolute inset-0 m-auto transition-all duration-200",
                  "size-4",
                  isHoveringDate && !isTodayDisabled
                    ? "scale-100 opacity-100"
                    : "scale-75 opacity-0"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex items-center gap-1.5">
              {isTodayDisabled ? (
                <>
                  {title}
                  <span className="text-muted-foreground text-xs">
                    ({i18n.getMessage("already_showing_today", isLocalized)})
                  </span>
                </>
              ) : (
                <>
                  <CalendarDays className="h-3.5 w-3.5" />
                  {i18n.getMessage("go_to_today", isLocalized)}
                  <span className="text-muted-foreground text-xs">
                    ({title})
                  </span>
                </>
              )}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Right: Next */}
        <DockIcon {...(nextHoldHandlers || {})}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-9 rounded-full transition-all duration-200"
                disabled={isNextDisabled}
                onClick={onNext}
                size="icon"
                variant="ghost"
                {...(nextHoldHandlers || {})}
              >
                <ChevronRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{i18n.getMessage("msg_next", isLocalized)}</p>
            </TooltipContent>
          </Tooltip>
        </DockIcon>
      </Dock>
    </TooltipProvider>
  );
}
