"use client";

import { i18n } from "@shared/libs/i18n";
import { useVacation } from "@shared/libs/state/vacation-context";
import { cn } from "@shared/libs/utils";
import { Settings } from "lucide-react";
import React from "react";
import { DockIcon } from "@/shared/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { StablePopoverButton } from "@/shared/ui/stable-popover-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { SettingsTabs } from "./settings-tabs";

type SettingsPopoverProps = {
  isLocalized?: boolean;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  currentCalendarView?: string;
  activeView?: string;
  onCalendarViewChange?: (view: string) => void;
  isCalendarPage?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  customViewSelector?: React.ReactElement;
  allowedTabs?: ReadonlyArray<"view" | "general" | "vacation">;
  /** Hide free roam / dual calendar / default selector toolbar */
  hideViewModeToolbar?: boolean;
  /** Whether this is the documents page */
  isDocumentsPage?: boolean;
};

export function SettingsPopover({
  isLocalized = false,
  activeTab,
  onTabChange,
  currentCalendarView,
  activeView,
  onCalendarViewChange,
  isCalendarPage = true,
  open: controlledOpen,
  onOpenChange,
  customViewSelector,
  allowedTabs,
  hideViewModeToolbar,
  isDocumentsPage = false,
}: SettingsPopoverProps) {
  const { recordingState, stopRecording } = useVacation();

  // Manage popover and tooltip state to avoid tooltip showing on outside close
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [suppressTooltip, setSuppressTooltip] = React.useState(false);

  const isControlled = typeof controlledOpen === "boolean";
  const open = isControlled ? (controlledOpen as boolean) : internalOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (isControlled) {
        onOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
      if (!next) {
        // If closing while recording, stop and reset recording
        try {
          if (
            recordingState?.periodIndex !== null &&
            recordingState?.field !== null
          ) {
            stopRecording();
          }
        } catch {
          // Silently ignore errors when stopping recording (may already be stopped)
        }
        setSuppressTooltip(true);
        // Tooltip suppression timeout (300ms)
        const TOOLTIP_SUPPRESSION_TIMEOUT_MS = 300;
        window.setTimeout(
          () => setSuppressTooltip(false),
          TOOLTIP_SUPPRESSION_TIMEOUT_MS
        );
      }
    },
    [
      isControlled,
      onOpenChange,
      recordingState?.periodIndex,
      recordingState?.field,
      stopRecording,
    ]
  );

  // Button animation is tied to open state (rotate 90deg when open)

  return (
    <DockIcon>
      <Popover
        modal={
          !(
            recordingState?.periodIndex !== null &&
            recordingState?.field !== null
          )
        }
        onOpenChange={handleOpenChange}
        open={open}
      >
        <Tooltip {...(open || suppressTooltip ? { open: false } : {})}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <StablePopoverButton
                aria-label={i18n.getMessage("settings", isLocalized)}
                className="size-9 rounded-full transition-colors duration-300 ease-out"
                variant={open ? "default" : "ghost"}
              >
                <Settings
                  className={cn(
                    "size-4 transform transition-transform duration-300 ease-out",
                    open ? "rotate-90" : "rotate-0"
                  )}
                />
              </StablePopoverButton>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{i18n.getMessage("settings", isLocalized)}</p>
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          align="center"
          className="w-auto max-w-[31.25rem] border-border/40 bg-background/70 backdrop-blur-md"
          onInteractOutside={(e) => {
            try {
              // While actively recording, do not close the popover on any outside interaction
              const isRecording =
                recordingState?.periodIndex !== null &&
                recordingState?.field !== null;
              if (isRecording) {
                e.preventDefault();
              }
            } catch {
              // Silently ignore errors when handling outside interaction (non-critical)
            }
          }}
        >
          <SettingsTabs
            activeTab={activeTab ?? "view"}
            activeView={activeView ?? currentCalendarView ?? "timeGridWeek"}
            currentCalendarView={currentCalendarView ?? "timeGridWeek"}
            isCalendarPage={isCalendarPage}
            isDocumentsPage={isDocumentsPage}
            isLocalized={isLocalized}
            onCalendarViewChange={
              onCalendarViewChange ??
              (() => {
                // Default no-op handler
              })
            }
            onTabChange={
              onTabChange ??
              (() => {
                // Default no-op handler
              })
            }
            {...(allowedTabs ? { allowedTabs } : {})}
            {...(customViewSelector ? { customViewSelector } : {})}
            {...(typeof hideViewModeToolbar === "boolean"
              ? { hideViewModeToolbar }
              : {})}
          />
        </PopoverContent>
      </Popover>
    </DockIcon>
  );
}
