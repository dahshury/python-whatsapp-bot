"use client";

import { i18n } from "@shared/libs/i18n";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@shared/ui/empty";
import { Bell } from "lucide-react";

type NotificationEmptyStateProps = {
  isLocalized: boolean;
};

export function NotificationEmptyState({
  isLocalized,
}: NotificationEmptyStateProps) {
  return (
    <div className="px-3 py-6">
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
    </div>
  );
}
