"use client";

import { hashToHue } from "@shared/libs/color/hash-to-hue";
import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { formatTimeAgo as formatTimeAgoUtil } from "@shared/libs/time/format-time-ago";
import { cn } from "@shared/libs/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@shared/ui/empty";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import React from "react";
import type {
  GroupEntry,
  ItemEntry,
  RenderEntry,
} from "@/entities/notification/types";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { useNotifications } from "../hooks/use-notifications";

type NotificationsButtonProps = {
  className?: string;
  notificationCount?: number;
};

function Dot({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      height="6"
      viewBox="0 0 6 6"
      width="6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

const EASE_C1 = 0.45;
const EASE_C2 = 0;
const EASE_C3 = 0.55;
const EASE_C4 = 1;
const ANIM_EASE: [number, number, number, number] = [
  EASE_C1,
  EASE_C2,
  EASE_C3,
  EASE_C4,
];
const ENTER_DURATION = 0.18;
const CLIP_DURATION = 0.16;
const CHILD_STAGGER = 0.015;
const HUE_SHIFT = 35;
const HUE_RANGE = 360;
const MAX_BADGE_COUNT = 99;
const PANEL_MAX_HEIGHT = "min(60vh, 420px)";
const PANEL_EASE_C1 = 0.16;
const PANEL_EASE_C2 = 1;
const PANEL_EASE_C3 = 0.3;
const PANEL_EASE_C4 = 1;
const PANEL_EASE: [number, number, number, number] = [
  PANEL_EASE_C1,
  PANEL_EASE_C2,
  PANEL_EASE_C3,
  PANEL_EASE_C4,
];

export function NotificationsButton({
  className,
  notificationCount: _notificationCount = 0,
}: NotificationsButtonProps) {
  const { isLocalized } = useLanguageStore();
  const { data: customerNames } = useCustomerNames();

  const getMessage = React.useCallback(
    (key: string) => i18n.getMessage(key, isLocalized),
    [isLocalized]
  );

  const resolveCustomerName = React.useCallback(
    (waId?: string, fallbackName?: string): string | undefined => {
      try {
        if (fallbackName && String(fallbackName).trim()) {
          return String(fallbackName);
        }
        const id = String(waId || "");
        if (!id) {
          return;
        }
        if (!customerNames) {
          return;
        }
        const customer = customerNames[id];
        return customer?.customer_name || undefined;
      } catch {
        /* noop */
      }
      return;
    },
    [customerNames]
  );

  const {
    open,
    setOpen,
    computedUnreadCount,
    renderEntries,
    markAllAsRead,
    markItemAsRead,
    markGroupAsRead,
  } = useNotifications({
    getMessage,
    resolveCustomerName,
  });

  const timeMessages = React.useMemo(
    () => ({
      justNow: () => i18n.messages.time.justNow(),
      minAgo: (m: number) => i18n.messages.time.minAgo(m),
      hoursAgo: (h: number) => i18n.messages.time.hoursAgo(h),
      daysAgo: (d: number) => i18n.messages.time.daysAgo(d),
    }),
    []
  );

  const renderTimeAgo = React.useCallback(
    (ts: number) => formatTimeAgoUtil(ts, timeMessages),
    [timeMessages]
  );

  const handleNotificationClick = React.useCallback(
    (entry: ItemEntry) => {
      const notification = entry.item;
      markItemAsRead(notification.id);

      try {
        if (
          notification.type === "conversation_new_message" &&
          notification.data
        ) {
          const data = notification.data as {
            wa_id?: string;
            waId?: string;
            date?: string;
            time?: string;
            message?: string;
            role?: string;
          };
          const waId = String(data.wa_id || data.waId || "");
          if (waId) {
            useSidebarChatStore.getState().openConversation(waId);
            try {
              (
                globalThis as unknown as { __chatScrollTarget?: unknown }
              ).__chatScrollTarget = {
                waId,
                date: data.date,
                time: data.time,
                message: data.message,
              };
            } catch {
              /* noop */
            }
            try {
              const evt = new CustomEvent("chat:scrollToMessage", {
                detail: {
                  wa_id: waId,
                  date: data.date,
                  time: data.time,
                  message: data.message,
                },
              });
              window.dispatchEvent(evt);
            } catch {
              /* noop */
            }
          }
        }
      } catch {
        /* noop */
      }

      setOpen(false);
    },
    [markItemAsRead, setOpen]
  );

  const handleGroupClick = React.useCallback(
    (group: GroupEntry) => {
      markGroupAsRead(group.waId, group.date);
      try {
        if (group.waId) {
          useSidebarChatStore.getState().openConversation(group.waId);
        }
      } catch {
        /* noop */
      }
      setOpen(false);
    },
    [markGroupAsRead, setOpen]
  );

  const listVariants = React.useMemo(
    () => ({
      hidden: { transition: { staggerChildren: 0.0 } },
      shown: { transition: { staggerChildren: CHILD_STAGGER } },
    }),
    []
  );

  const itemVariants = React.useMemo(
    () => ({
      hidden: { opacity: 0, filter: "blur(6px)" },
      shown: { opacity: 1, filter: "blur(0px)" },
    }),
    []
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={i18n.getMessage("notifications", isLocalized)}
          className={cn("relative shadow-xs", className)}
          size="icon"
          variant="outline"
        >
          <Bell className="h-4 w-4" />
          {computedUnreadCount > 0 && (
            <Badge className="-top-2 -translate-x-1/2 absolute left-full min-w-5 px-1">
              {computedUnreadCount > MAX_BADGE_COUNT
                ? "99+"
                : computedUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-1 shadow-lg"
        forceMount
        side="bottom"
        sideOffset={8}
      >
        <AnimatePresence mode="sync">
          {open && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              key="notifications-panel"
              style={{ overflow: "hidden", willChange: "height, opacity" }}
              transition={{ duration: ENTER_DURATION, ease: ANIM_EASE }}
            >
              <motion.div
                animate={{
                  clipPath: "inset(0% 0% 0% 0%)",
                  filter: "blur(0px)",
                  opacity: 1,
                }}
                exit={{
                  clipPath: "inset(0% 0% 100% 0%)",
                  filter: "blur(6px)",
                  opacity: 0,
                }}
                initial={{
                  clipPath: "inset(0% 0% 100% 0%)",
                  filter: "blur(8px)",
                  opacity: 0,
                }}
                style={{ willChange: "clip-path, filter, opacity" }}
                transition={{ duration: CLIP_DURATION, ease: ANIM_EASE }}
              >
                <div className="flex items-baseline justify-between gap-4 px-3 py-2">
                  <div className="font-semibold text-sm">
                    {i18n.getMessage("notifications", isLocalized)}
                  </div>
                  {computedUnreadCount > 0 && (
                    <button
                      className="font-medium text-xs hover:underline"
                      onClick={markAllAsRead}
                      type="button"
                    >
                      {i18n.getMessage("mark_all_as_read", isLocalized)}
                    </button>
                  )}
                </div>
                <hr className="-mx-1 my-1 h-px bg-border" />

                <ThemedScrollbar
                  className="max-h-[min(60vh,420px)]"
                  noScrollX={true}
                  removeTracksWhenNotUsed={true}
                  style={{ height: PANEL_MAX_HEIGHT }}
                >
                  <motion.div
                    animate="shown"
                    initial="hidden"
                    variants={listVariants}
                  >
                    {renderEntries.length > 0 ? (
                      renderEntries.map((entry: RenderEntry) => {
                        if (entry.kind === "item") {
                          const notification = entry.item;
                          return (
                            <motion.div
                              className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                              key={notification.id}
                              transition={{ duration: 0.14, ease: ANIM_EASE }}
                              variants={itemVariants}
                            >
                              <div className="relative flex items-start pe-3">
                                <div className="flex-1 space-y-1">
                                  <button
                                    className="text-left text-foreground/80 after:absolute after:inset-0"
                                    onClick={() =>
                                      handleNotificationClick(entry)
                                    }
                                    type="button"
                                  >
                                    <span className="font-medium text-foreground">
                                      {notification.text}
                                    </span>
                                  </button>
                                  <div className="text-muted-foreground text-xs">
                                    {renderTimeAgo(notification.timestamp)}
                                  </div>
                                </div>
                                {notification.unread && (
                                  <div className="absolute end-0 self-center">
                                    <span className="sr-only">
                                      {i18n.getMessage("unread", isLocalized)}
                                    </span>
                                    <Dot />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        }

                        const group = entry as GroupEntry;
                        const label = i18n.getMessage(
                          "new_message",
                          isLocalized
                        );
                        const hue = hashToHue(group.waId);
                        const start = `hsl(${hue} 85% 45%)`;
                        const end = `hsl(${(hue + HUE_SHIFT) % HUE_RANGE} 85% 55%)`;
                        const badgeStyle: React.CSSProperties = {
                          backgroundImage: `linear-gradient(135deg, ${start}, ${end})`,
                          color: "hsl(var(--primary-foreground))",
                          borderColor: "transparent",
                        };
                        const countToShow =
                          group.unreadCount > 0
                            ? group.unreadCount
                            : group.totalCount;

                        return (
                          <motion.div
                            className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                            key={`group:${group.waId}:${group.date}`}
                            transition={{ duration: 0.14, ease: ANIM_EASE }}
                            variants={itemVariants}
                          >
                            <div className="relative flex items-start pe-12">
                              <div className="flex-1 space-y-1">
                                <button
                                  className="text-left text-foreground/80 after:absolute after:inset-0"
                                  onClick={() => handleGroupClick(group)}
                                  type="button"
                                >
                                  <span className="font-medium text-foreground">
                                    {label}: {group.customerName}
                                  </span>
                                </button>
                                <div className="text-muted-foreground text-xs">
                                  {renderTimeAgo(group.latest.timestamp)}
                                </div>
                              </div>
                              <div className="-translate-y-1/2 absolute end-0 top-1/2 flex items-center gap-1">
                                {group.unreadCount > 0 && (
                                  <>
                                    <span className="sr-only">
                                      {i18n.getMessage("unread", isLocalized)}
                                    </span>
                                    <Dot />
                                  </>
                                )}
                                <Badge
                                  className="min-w-6 rounded-full border px-2 py-0.5 font-semibold text-[0.625rem] shadow-sm"
                                  style={badgeStyle}
                                  variant="outline"
                                >
                                  {countToShow > MAX_BADGE_COUNT
                                    ? "99+"
                                    : countToShow}
                                </Badge>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        className="px-2 py-8"
                        initial={{ opacity: 0, filter: "blur(6px)" }}
                        transition={{ duration: 0.2, ease: PANEL_EASE }}
                      >
                        <Empty className="!py-6 gap-3">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Bell className="h-5 w-5" />
                            </EmptyMedia>
                            <EmptyTitle>
                              {i18n.getMessage("no_notifications", isLocalized)}
                            </EmptyTitle>
                            <EmptyDescription>
                              {i18n.getMessage(
                                "notifications_empty_state_description",
                                isLocalized
                              )}
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </motion.div>
                    )}
                  </motion.div>
                </ThemedScrollbar>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
