"use client";

import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { Label } from "@ui/label";
import { Eye, MessageCircle, Minus, Plus, Wrench } from "lucide-react";
import { useCallback, useMemo } from "react";
import { getCalendarViewOptions } from "@/features/calendar";
import { useSettingsStore } from "@/infrastructure/store/app-store";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { ViewModeToolbar } from "./view-mode-toolbar";

// Chat message limit constants
const CHAT_MESSAGE_LIMIT_MIN = 50;
const CHAT_MESSAGE_LIMIT_MAX = 300;
const CHAT_MESSAGE_LIMIT_STEP = 50;

type ViewSettingsProps = {
  isLocalized?: boolean;
  currentCalendarView?: string;
  activeView?: string;
  onCalendarViewChange?: (view: string) => void;
  hideChatSettings?: boolean;
  /** Hide free roam / dual / default selector toolbar */
  hideViewModeToolbar?: boolean;
};

export function ViewSettings({
  isLocalized = false,
  currentCalendarView = "timeGridWeek",
  activeView,
  onCalendarViewChange,
  hideChatSettings = false,
  hideViewModeToolbar = false,
}: ViewSettingsProps) {
  const {
    showToolCalls,
    setShowToolCalls,
    chatMessageLimit,
    setChatMessageLimit,
    sendTypingIndicator,
    setSendTypingIndicator,
  } = useSettingsStore();

  const viewOptions = useMemo(
    () => getCalendarViewOptions(isLocalized),
    [isLocalized]
  );

  // Stabilize the selected view to prevent unnecessary re-renders
  const selectedView = useMemo(
    () => activeView || currentCalendarView,
    [activeView, currentCalendarView]
  );

  // Memoize the view change handler to prevent recreating on every render
  const handleViewChange = useCallback(
    (view: string) => {
      // Guard: don't trigger change if already selected
      if (view === selectedView) {
        return;
      }
      onCalendarViewChange?.(view);
    },
    [onCalendarViewChange, selectedView]
  );

  const handleToolCallsToggle = (checked: boolean) => {
    setShowToolCalls(checked);
    toastService.success(
      checked
        ? i18n.getMessage("settings_tool_calls_on", isLocalized)
        : i18n.getMessage("settings_tool_calls_off", isLocalized)
    );
  };

  const handleMessageLimitChange = (value: string) => {
    const numValue = Number(value);
    if (
      Number.isNaN(numValue) ||
      numValue < CHAT_MESSAGE_LIMIT_MIN ||
      numValue > CHAT_MESSAGE_LIMIT_MAX
    ) {
      return;
    }
    setChatMessageLimit(numValue);
    toastService.success(
      `${i18n.getMessage("settings_message_limit_set_prefix", isLocalized)} ${numValue}`
    );
  };

  const handleDecreaseLimit = () => {
    if (chatMessageLimit > CHAT_MESSAGE_LIMIT_MIN) {
      const newValue = Math.max(
        CHAT_MESSAGE_LIMIT_MIN,
        chatMessageLimit - CHAT_MESSAGE_LIMIT_STEP
      );
      setChatMessageLimit(newValue);
      toastService.success(
        `${i18n.getMessage("settings_message_limit_set_prefix", isLocalized)} ${newValue}`
      );
    }
  };

  const handleIncreaseLimit = () => {
    if (chatMessageLimit < CHAT_MESSAGE_LIMIT_MAX) {
      const newValue = Math.min(
        CHAT_MESSAGE_LIMIT_MAX,
        chatMessageLimit + CHAT_MESSAGE_LIMIT_STEP
      );
      setChatMessageLimit(newValue);
      toastService.success(
        `${i18n.getMessage("settings_message_limit_set_prefix", isLocalized)} ${newValue}`
      );
    }
  };

  const handleTypingToggle = (checked: boolean) => {
    setSendTypingIndicator(checked);
    toastService.success(
      checked
        ? i18n.getMessage("settings_send_typing_on", isLocalized)
        : i18n.getMessage("settings_send_typing_off", isLocalized)
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar View Settings + Chat Settings unified container */}
      <div className="space-y-2 rounded-md border bg-background/40 p-2 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span className="font-medium text-[0.8rem] leading-none">
              {i18n.getMessage("settings_view", isLocalized)}
            </span>
          </div>

          {!hideViewModeToolbar && <ViewModeToolbar />}
        </div>

        <div className="flex justify-center">
          <ButtonGroup className="justify-center">
            {viewOptions.map((option) => {
              const isSelected = selectedView === option.value;
              return (
                <Button
                  className="h-7 gap-2"
                  key={option.value}
                  onClick={() => {
                    handleViewChange(option.value);
                  }}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                >
                  <option.icon
                    aria-hidden="true"
                    className="opacity-70"
                    size={16}
                  />
                  {option.label}
                </Button>
              );
            })}
          </ButtonGroup>
        </div>
        {!hideChatSettings && (
          <>
            <hr className="border-border/70" />
            {/* Chat Settings Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {i18n.getMessage("settings_chat", isLocalized)}
                </span>
              </div>

              {/* Tool Calls Display Setting */}
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 font-medium text-sm">
                    <Wrench className="h-4 w-4" />
                    {i18n.getMessage("settings_show_tool_calls", isLocalized)}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {i18n.getMessage("settings_tool_calls_hint", isLocalized)}
                  </p>
                </div>
                <Switch
                  checked={showToolCalls}
                  className="data-[state=checked]:bg-primary"
                  onCheckedChange={handleToolCallsToggle}
                />
              </div>

              {/* Typing Indicator Setting */}
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 font-medium text-sm">
                    <MessageCircle className="h-4 w-4" />
                    {i18n.getMessage("settings_send_typing", isLocalized)}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {i18n.getMessage("settings_send_typing_on", isLocalized)}
                  </p>
                </div>
                <Switch
                  checked={sendTypingIndicator}
                  className="data-[state=checked]:bg-primary"
                  onCheckedChange={handleTypingToggle}
                />
              </div>

              {/* Chat Message Limit Setting */}
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
                <div className="flex-1 space-y-0.5">
                  <Label className="flex items-center gap-2 font-medium text-sm">
                    <MessageCircle className="h-4 w-4" />
                    {i18n.getMessage(
                      "settings_message_load_limit",
                      isLocalized
                    )}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {i18n.getMessage(
                      "settings_message_load_limit_desc",
                      isLocalized
                    )}
                  </p>
                </div>
                <ButtonGroup>
                  <Button
                    className="h-8 px-1"
                    disabled={chatMessageLimit <= CHAT_MESSAGE_LIMIT_MIN}
                    onClick={handleDecreaseLimit}
                    size="sm"
                    variant="outline"
                  >
                    <Minus />
                  </Button>
                  <Input
                    className="h-8 w-12 bg-background text-center text-sm"
                    max={CHAT_MESSAGE_LIMIT_MAX}
                    min={CHAT_MESSAGE_LIMIT_MIN}
                    onChange={(e) => handleMessageLimitChange(e.target.value)}
                    readOnly
                    type="number"
                    value={chatMessageLimit}
                  />
                  <Button
                    className="h-8 px-1"
                    disabled={chatMessageLimit >= CHAT_MESSAGE_LIMIT_MAX}
                    onClick={handleIncreaseLimit}
                    size="sm"
                    variant="outline"
                  >
                    <Plus />
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          </>
        )}
        {/* End unified container */}
      </div>
    </div>
  );
}
