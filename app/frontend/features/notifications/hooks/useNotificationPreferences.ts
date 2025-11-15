import { useMemo } from "react";
import { useAppConfigQuery } from "@/features/app-config";
import { mergeNotificationPreferences } from "@/shared/constants/notification-preferences";

export function useNotificationPreferences() {
  const { data: appConfig } = useAppConfigQuery();

  return useMemo(() => {
    const snapshot = appConfig?.toSnapshot();
    const preferences = mergeNotificationPreferences(
      snapshot?.notificationPreferences
    );
    const timezone = snapshot?.timezone ?? "UTC";

    return {
      preferences,
      timezone,
    };
  }, [appConfig]);
}
