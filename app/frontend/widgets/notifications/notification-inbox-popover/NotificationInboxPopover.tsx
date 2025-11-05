"use client";

import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tabs } from "@/shared/ui/tabs";

const MAX_UNREAD_COUNT_DISPLAY = 99;

function NotificationInboxPopover() {
  const { isLocalized } = useLanguage();
  const { data: customerNames } = useCustomerNames();
  const [tab, setTab] = useState("all");

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
    getMessage: (key: string) => i18n.getMessage(key, isLocalized),
    resolveCustomerName: resolveCustomerNameCallback,
  });

  const filteredEntries = useMemo(
    () =>
      tab === "unread"
        ? renderEntries.filter((e) =>
            e.kind === "item" ? e.item.unread : e.unreadCount > 0
          )
        : renderEntries,
    [renderEntries, tab]
  );

  const uiEntries = useMemo(() => {
    return filteredEntries.map((entry) => {
      if (entry.kind === "item") {
        return mapNotificationItemToUIEntry(
          entry.item,
          isLocalized,
          resolveCustomerNameCallback
        );
      }
      // group entry
      return mapNotificationGroupToUIEntry(entry, isLocalized);
    });
  }, [filteredEntries, isLocalized, resolveCustomerNameCallback]);

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

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {uiEntries.length === 0 ? (
              <NotificationEmptyState isLocalized={isLocalized} />
            ) : (
              <NotificationList
                entries={uiEntries}
                items={items}
                onClose={() => setOpen(false)}
                onGroupClick={onGroupClick}
                onItemClick={onItemClick}
              />
            )}
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-3 py-2 text-center">
          <Button className="w-full" size="sm" variant="ghost">
            {i18n.getMessage("view_all_notifications", isLocalized)}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationInboxPopover };
