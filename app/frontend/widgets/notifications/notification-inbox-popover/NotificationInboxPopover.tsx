"use client";

import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { Bell } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { NotificationItem } from "@/entities/notification/types";
import { getWaId } from "@/entities/notification/value-objects";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import {
  mapNotificationGroupToUIEntry,
  mapNotificationItemToUIEntry,
} from "@/features/notifications/ui/notification-item";
import {
  NotificationEmptyState,
  NotificationList,
} from "@/features/notifications/ui/notification-list";
import { NotificationTabsHeader } from "@/features/notifications/ui/notification-tabs";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tabs, TabsContent } from "@/shared/ui/tabs";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

const MAX_UNREAD_COUNT_DISPLAY = 99;

function NotificationInboxPopover() {
  const { isLocalized } = useLanguageStore();
  const { data: customerNames } = useCustomerNames();
  const [tab, setTab] = useState("all");

  const getMessage = useCallback(
    (key: string) => i18n.getMessage(key, isLocalized),
    [isLocalized]
  );

  const resolveCustomerNameCallback = useCallback(
    (waId?: string, fallbackName?: string): string | undefined => {
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
    },
    [customerNames]
  );

  const {
    open,
    setOpen,
    items,
    computedUnreadCount,
    renderEntries,
    markAllAsRead,
    markItemAsRead,
    markGroupAsRead,
  } = useNotifications({
    getMessage,
    resolveCustomerName: resolveCustomerNameCallback,
  });

  const mapEntriesToUI = useCallback(
    (entries: typeof renderEntries) =>
      entries.map((entry) => {
        if (entry.kind === "item") {
          return mapNotificationItemToUIEntry(
            entry.item,
            isLocalized,
            resolveCustomerNameCallback
          );
        }
        // group entry
        return mapNotificationGroupToUIEntry(entry, isLocalized);
      }),
    [isLocalized, resolveCustomerNameCallback]
  );

  const allUiEntries = useMemo(
    () => mapEntriesToUI(renderEntries),
    [mapEntriesToUI, renderEntries]
  );

  const unreadUiEntries = useMemo(() => {
    const unreadOnly = renderEntries.filter((entry) =>
      entry.kind === "item" ? entry.item.unread : entry.unreadCount > 0
    );
    return mapEntriesToUI(unreadOnly);
  }, [mapEntriesToUI, renderEntries]);

  const onItemClick = useCallback(
    (n: NotificationItem) => {
      markItemAsRead(n.id);
      try {
        if (n.type === "conversation_new_message" && n.data) {
          const waId = getWaId(n.data);
          if (waId) {
            useSidebarChatStore.getState().openConversation(waId);
          }
        }
      } catch {
        // Ignore errors when handling notification click
      }
      // Always close popover after clicking any notification
      setOpen(false);
    },
    [markItemAsRead, setOpen]
  );

  const onGroupClick = useCallback(
    (waId: string, date: string) => {
      markGroupAsRead(waId, date);
    },
    [markGroupAsRead]
  );

  const renderTabPane = useCallback(
    (entries: typeof allUiEntries) => {
      if (entries.length === 0) {
        return (
          <div className="flex min-h-[12rem] items-center justify-center p-6">
            <NotificationEmptyState isLocalized={isLocalized} />
          </div>
        );
      }
      return (
        <ThemedScrollbar
          className="max-h-80"
          noScrollX
          removeTrackXWhenNotUsed
          style={{ maxHeight: "20rem", minHeight: "12rem" }}
        >
          <NotificationList
            entries={entries}
            items={items}
            onClose={() => setOpen(false)}
            onGroupClick={onGroupClick}
            onItemClick={onItemClick}
          />
        </ThemedScrollbar>
      );
    },
    [isLocalized, items, onGroupClick, onItemClick, setOpen]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={isLocalized ? "الإشعارات" : "Open notifications"}
          className="relative"
          size="icon"
          variant="outline"
        >
          <Bell aria-hidden="true" size={16} strokeWidth={2} />
          {computedUnreadCount > 0 && (
            <Badge className="-top-2 -translate-x-1/2 absolute left-full min-w-5 px-1">
              {computedUnreadCount > MAX_UNREAD_COUNT_DISPLAY
                ? `${MAX_UNREAD_COUNT_DISPLAY}+`
                : computedUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <Tabs onValueChange={setTab} value={tab}>
          <NotificationTabsHeader
            isLocalized={isLocalized}
            onMarkAllAsRead={markAllAsRead}
            unreadCount={computedUnreadCount}
          />

          <TabsContent className="min-h-[12rem]" value="all">
            {renderTabPane(allUiEntries)}
          </TabsContent>
          <TabsContent className="min-h-[12rem]" value="unread">
            {renderTabPane(unreadUiEntries)}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationInboxPopover };
