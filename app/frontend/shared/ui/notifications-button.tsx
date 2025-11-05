"use client";

import { NotificationsButton as FeatureNotificationsButton } from "@/features/notifications/ui/notifications-button";

export type NotificationsButtonProps = Parameters<
  typeof FeatureNotificationsButton
>[0];

export function NotificationsButton(props: NotificationsButtonProps) {
  return <FeatureNotificationsButton {...props} />;
}
