/**
 * Calendar Legend Component
 *
 * Displays a minimized help icon that expands to show legend on hover.
 * Shows conversations and cancellations only in free roam mode.
 * Shows vacation periods when they exist.
 */

"use client";

import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import {
  ArrowLeftRight,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleIcon,
  Info,
  Keyboard,
  MoveUpRight,
  PlayCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { HeroPill } from "@/shared/ui/hero-pill";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/shared/ui/hover-card";
import HeroVideoDialog from "@/shared/ui/magicui/hero-video-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

type CalendarLegendProps = {
  freeRoam?: boolean;
  className?: string;
};

const MAX_LEGEND_PREVIEW_ITEMS = 4;

export function CalendarLegend({
  freeRoam = false,
  className = "",
}: CalendarLegendProps) {
  const { isLocalized } = useLanguage();
  const { vacationPeriods } = useVacation();

  // Only consider upcoming vacations (start strictly after today)
  // Use useEffect to avoid Next.js 16 prerender warning about new Date()
  // useEffect only runs on client-side after hydration, preventing prerender issues
  const [hasUpcomingVacations, setHasUpcomingVacations] = useState(false);

  useEffect(() => {
    try {
      const normalize = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const today = normalize(new Date());
      const hasUpcoming = (vacationPeriods || []).some(
        (p) => normalize(p.start).getTime() > today.getTime()
      );
      setHasUpcomingVacations(hasUpcoming);
    } catch {
      setHasUpcomingVacations(false);
    }
  }, [vacationPeriods]);

  const legendItems = [
    {
      key: "check-up",
      color: "var(--fc-reservation-type-0-bg)", // Green - Check-up
      label: i18n.getMessage("appt_checkup", isLocalized),
      showAlways: true,
    },
    {
      key: "follow-up",
      color: "var(--fc-reservation-type-1-bg)", // Blue - Follow-up
      label: i18n.getMessage("appt_followup", isLocalized),
      showAlways: true,
    },
    {
      key: "conversation",
      color: "var(--fc-conversation-bg)", // Orange/Yellow - Conversation
      label: i18n.getMessage("calendar_legend_conversation", isLocalized),
      showAlways: false, // Only show in free roam
    },
    {
      key: "vacation",
      color: "transparent", // Use transparent; actual swatch uses pattern via background-image
      label: i18n.getMessage("vacation", isLocalized),
      showAlways: false, // Only show when vacation periods exist
      showWhenVacationExists: true,
    },
  ];

  const showLegendLabel = i18n.getMessage(
    "calendar_legend_show_button",
    isLocalized
  );
  const legendTitle = i18n.getMessage("calendar_legend_title", isLocalized);
  const shortcutsTitle = i18n.getMessage(
    "calendar_legend_shortcuts",
    isLocalized
  );
  const tutorialTitle = i18n.getMessage("calendar_tutorial_title", isLocalized);
  const tutorialAlt = i18n.getMessage(
    "calendar_tutorial_thumbnail_alt",
    isLocalized
  );
  const tutorialHint = i18n.getMessage("calendar_tutorial_hint", isLocalized);
  const changeViewUpLabel = i18n.getMessage(
    "calendar_legend_change_view_up",
    isLocalized
  );
  const prevDateLabel = i18n.getMessage(
    "calendar_legend_previous_date",
    isLocalized
  );
  const prevDateHint = i18n.getMessage(
    "calendar_legend_arrow_left_hint",
    isLocalized
  );
  const nextDateLabel = i18n.getMessage(
    "calendar_legend_next_date",
    isLocalized
  );
  const nextDateHint = i18n.getMessage(
    "calendar_legend_arrow_right_hint",
    isLocalized
  );
  const changeViewDownLabel = i18n.getMessage(
    "calendar_legend_change_view_down",
    isLocalized
  );
  const arrowRepeatHint = i18n.getMessage(
    "calendar_legend_arrow_repeat_hint",
    isLocalized
  );
  const ctrlArrowHint = i18n.getMessage(
    "calendar_legend_ctrl_arrow_hint",
    isLocalized
  );

  const filteredItems = legendItems.filter(
    (item) =>
      item.showAlways ||
      (freeRoam && item.key === "conversation") ||
      (item.showWhenVacationExists && hasUpcomingVacations)
  );

  return (
    <HoverCard closeDelay={100} openDelay={200}>
      <HoverCardTrigger asChild>
        <button
          aria-label={showLegendLabel}
          className={cn(
            "h-6 rounded-md border border-border/50 bg-muted/50 px-2 transition-colors hover:bg-muted",
            "flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground",
            "calendar-legend-trigger", // Add specific class for CSS targeting
            className
          )}
          type="button"
        >
          <Info className="h-3 w-3 text-muted-foreground/80" />
          <div className="flex items-center gap-0.5">
            {filteredItems
              .slice(0, MAX_LEGEND_PREVIEW_ITEMS)
              .map((item, _index) => (
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shadow-sm",
                    item.key === "vacation" && "ring-1 ring-border/50"
                  )}
                  key={item.key}
                  style={
                    item.key === "vacation"
                      ? {
                          backgroundImage: "var(--vacation-pattern-legend)",
                          backgroundColor: "transparent",
                        }
                      : { backgroundColor: item.color }
                  }
                />
              ))}
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="max-h-[calc(100vh-2rem)] w-auto max-w-[calc(100vw-2rem)] overflow-auto border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-sm"
        collisionPadding={16}
        side="bottom"
        sideOffset={8}
        style={{ zIndex: "var(--z-hover-card)" }}
      >
        <div className="space-y-3">
          <div className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs">
            <Info className="h-3 w-3" />
            {legendTitle}
          </div>
          <div className="flex flex-col gap-1.5">
            {filteredItems.map((item) => (
              <HeroPill
                animate
                className="mb-1"
                icon={
                  <span className="flex items-center">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shadow-sm",
                        item.key === "vacation" && "ring-1 ring-border/60"
                      )}
                      style={
                        item.key === "vacation"
                          ? {
                              backgroundImage: "var(--vacation-pattern-legend)",
                              backgroundColor: "transparent",
                            }
                          : { backgroundColor: item.color }
                      }
                    />
                  </span>
                }
                key={item.key}
                text={item.label}
              />
            ))}
          </div>

          {/* Keyboard Shortcuts */}
          <div className="border-border/50 border-t pt-3">
            <div className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs">
              <Keyboard className="h-3 w-3" />
              {shortcutsTitle}
            </div>
            <TooltipProvider delayDuration={0}>
              <div className="inline-grid w-fit grid-cols-3 gap-1">
                {/* Up: Change view up (Ctrl + Up) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={changeViewUpLabel}
                      className="col-start-2"
                      size="icon"
                      variant="outline"
                    >
                      <ChevronUpIcon aria-hidden="true" size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="px-2 py-1 text-xs" side="top">
                    {changeViewUpLabel}
                    <kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
                      Ctrl + ↑
                    </kbd>
                  </TooltipContent>
                </Tooltip>

                {/* Left: Navigate date left */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={prevDateLabel}
                      className="col-start-1"
                      size="icon"
                      variant="outline"
                    >
                      <ChevronLeftIcon aria-hidden="true" size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    className="px-2 py-1 text-xs"
                    side={isLocalized ? "right" : "left"}
                  >
                    {prevDateHint}
                    <kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
                      ←
                    </kbd>
                  </TooltipContent>
                </Tooltip>

                {/* Center dot */}
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center"
                >
                  <CircleIcon className="opacity-60" size={16} />
                </div>

                {/* Right: Navigate date right */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={nextDateLabel}
                      size="icon"
                      variant="outline"
                    >
                      <ChevronRightIcon aria-hidden="true" size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    className="px-2 py-1 text-xs"
                    side={isLocalized ? "left" : "right"}
                  >
                    {nextDateHint}
                    <kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
                      →
                    </kbd>
                  </TooltipContent>
                </Tooltip>

                {/* Down: Change view down (Ctrl + Down) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={changeViewDownLabel}
                      className="col-start-2"
                      size="icon"
                      variant="outline"
                    >
                      <ChevronDownIcon aria-hidden="true" size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="px-2 py-1 text-xs" side="bottom">
                    {changeViewDownLabel}
                    <kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
                      Ctrl + ↓
                    </kbd>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <div className="mt-2 flex flex-col gap-1.5">
              <HeroPill
                icon={<ArrowLeftRight className="h-3 w-3" />}
                text={arrowRepeatHint}
              />
              <HeroPill
                icon={<MoveUpRight className="-rotate-45 h-3 w-3" />}
                text={ctrlArrowHint}
              />
            </div>
          </div>

          {/* Video Tutorial Section */}
          <div className="border-border/50 border-t pt-3">
            <div className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs">
              <PlayCircle className="h-3 w-3" />
              {tutorialTitle}
            </div>
            <div className="w-48">
              <HeroVideoDialog
                animationStyle="from-center"
                className="overflow-hidden rounded-md border border-border/50"
                thumbnailAlt={tutorialAlt}
                thumbnailSrc="https://img.youtube.com/vi/Tdd1Shg7XPI/maxresdefault.jpg"
                videoSrc="https://www.youtube.com/embed/Tdd1Shg7XPI"
              />
            </div>
            <p className="mt-1 text-muted-foreground text-xs">{tutorialHint}</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
