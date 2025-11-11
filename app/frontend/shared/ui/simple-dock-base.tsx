"use client";

import { useKeyboardRepeatNavigation } from "@shared/libs/hooks/use-keyboard-repeat-navigation";
import { useLongPressRepeat } from "@shared/libs/hooks/use-long-press-repeat";
import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavigationDateButton } from "@/features/navigation/navigation/navigation-date-button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Dock } from "@/shared/ui/dock";
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
  onPrev = () => {
    // No-op default handler
  },
  onNext = () => {
    // No-op default handler
  },
  onToday,
  isLocalized = false,
  prevHoldHandlers,
  nextHoldHandlers,
}: SimpleDockBaseProps) {
  // Always create long press handlers (hooks must be called unconditionally)
  const defaultPrevHoldHandlers = useLongPressRepeat(onPrev, {
    startDelayMs: 2000,
    intervalMs: 333,
    disabled: isPrevDisabled,
  });

  const defaultNextHoldHandlers = useLongPressRepeat(onNext, {
    startDelayMs: 2000,
    intervalMs: 333,
    disabled: isNextDisabled,
  });

  // Use provided handlers if available, otherwise use defaults
  const effectivePrevHoldHandlers = prevHoldHandlers || defaultPrevHoldHandlers;
  const effectiveNextHoldHandlers = nextHoldHandlers || defaultNextHoldHandlers;

  useKeyboardRepeatNavigation({
    onLeft: onPrev,
    onRight: onNext,
    disabledLeft: isPrevDisabled,
    disabledRight: isNextDisabled,
    startDelayMs: 2000,
    intervalMs: 333,
    isSidebarOpen: false,
  });

  return (
    <TooltipProvider>
      <Dock
        className={cn(
          "h-auto min-h-[2.75rem] w-full max-w-full overflow-hidden",
          className
        )}
        direction="middle"
      >
        {/* Left: Navigation controls button group */}
        <ButtonGroup className="shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-slot="dock-prev"
                disabled={isPrevDisabled}
                onClick={onPrev}
                size="icon"
                variant="outline"
                {...effectivePrevHoldHandlers}
              >
                <ChevronLeft className="size-4 sm:size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{i18n.getMessage("msg_previous", isLocalized)}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-slot="dock-next"
                disabled={isNextDisabled}
                onClick={onNext}
                size="icon"
                variant="outline"
                {...effectiveNextHoldHandlers}
              >
                <ChevronRight className="size-4 sm:size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{i18n.getMessage("msg_next", isLocalized)}</p>
            </TooltipContent>
          </Tooltip>
        </ButtonGroup>

        {/* Center: Date button (Today) with flexible width - constrained to container */}
        <div className="flex min-w-0 max-w-full flex-1 items-center justify-center overflow-hidden">
          <NavigationDateButton
            className="w-full max-w-full"
            isCalendarPage={false}
            isLocalized={isLocalized}
            isTodayDisabled={isTodayDisabled}
            navigationOnly={true}
            {...(onToday ? { onToday } : {})}
            showBadge={false}
            {...(title !== undefined ? { title } : {})}
          />
        </div>
      </Dock>
    </TooltipProvider>
  );
}
