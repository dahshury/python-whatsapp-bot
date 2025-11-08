"use client";

import { i18n } from "@shared/libs/i18n";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Split, Unlock } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { ViewMode } from "@/features/navigation/types";
import {
  useLanguageStore,
  useSettingsStore,
} from "@/infrastructure/store/app-store";
import { toastService } from "@/shared/libs/toast/toast-service";
import { ExpandableTabs } from "@/shared/ui/expandable-tabs";

type ViewModeToolbarProps = {
  className?: string;
};

export function ViewModeToolbar({ className = "" }: ViewModeToolbarProps) {
  const { isLocalized } = useLanguageStore();
  const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } =
    useSettingsStore();

  const items = useMemo(
    () => [
      {
        id: "default",
        title: i18n.getMessage("view_default", isLocalized),
        icon: LayoutGrid,
        tooltipTitle: i18n.getMessage(
          "view_default_tooltip_title",
          isLocalized
        ),
        tooltipDescription: i18n.getMessage(
          "view_default_tooltip_desc",
          isLocalized
        ),
      },
      {
        id: "freeRoam",
        title: i18n.getMessage("view_free", isLocalized),
        icon: Unlock,
        tooltipTitle: i18n.getMessage("view_free_tooltip_title", isLocalized),
        tooltipDescription: i18n.getMessage(
          "view_free_tooltip_desc",
          isLocalized
        ),
      },
      {
        id: "dual",
        title: i18n.getMessage("view_dual", isLocalized),
        icon: Split,
        tooltipTitle: i18n.getMessage("view_dual_tooltip_title", isLocalized),
        tooltipDescription: i18n.getMessage(
          "view_dual_tooltip_desc",
          isLocalized
        ),
      },
    ],
    [isLocalized]
  );

  const handleChange = useCallback(
    (id: string) => {
      const value = id as ViewMode["value"];
      const isFreeRoam = value === "freeRoam";
      const isDual = value === "dual";

      setFreeRoam(isFreeRoam);
      setShowDualCalendar(isDual);

      try {
        const title = i18n.getMessage("view_changed", isLocalized);
        toastService.success(title);
      } catch {
        // Silently ignore errors when showing toast (toast service may be unavailable)
      }
    },
    [isLocalized, setFreeRoam, setShowDualCalendar]
  );

  const tabs = items.map((it) => ({
    title: it.title,
    icon: it.icon as LucideIcon,
  }));

  // Compute selected index based on current state
  const INDEX_FREE_ROAM = 2;
  const INDEX_DUAL_CALENDAR = 4;
  const INDEX_DEFAULT = 0;
  let currentSelectedIndex: number;
  if (freeRoam) {
    currentSelectedIndex = INDEX_FREE_ROAM;
  } else if (showDualCalendar) {
    currentSelectedIndex = INDEX_DUAL_CALENDAR;
  } else {
    currentSelectedIndex = INDEX_DEFAULT;
  }

  const tab0 = tabs[0];
  const tab1 = tabs[1];
  const tab2 = tabs[2];
  if (!(tab0 && tab1 && tab2)) {
    return null;
  }

  return (
    <ExpandableTabs
      className={className}
      onChange={(index) => {
        if (index === null) {
          return;
        }
        const map = ["default", "freeRoam", "dual"] as const;
        // We inserted separators at 1 and 3; normalize indices 0,2,4 to 0,1,2
        const NORMALIZED_START_INDEX = 0;
        const NORMALIZED_MIDDLE_INDEX = 1;
        const NORMALIZED_END_INDEX = 2;
        const INDEX_MULTIPLIER = 2;
        const INDEX_AFTER_SEPARATOR_3 = 4;
        let normalized = -1;
        if (index === NORMALIZED_START_INDEX) {
          normalized = NORMALIZED_START_INDEX;
        } else if (index === INDEX_MULTIPLIER) {
          normalized = NORMALIZED_MIDDLE_INDEX;
        } else if (index === INDEX_AFTER_SEPARATOR_3) {
          normalized = NORMALIZED_END_INDEX;
        }
        if (normalized >= 0 && normalized < map.length) {
          const mode = map[normalized as 0 | 1 | 2];
          if (mode) {
            handleChange(mode);
          }
        }
      }}
      selectedIndex={currentSelectedIndex}
      tabs={[
        tab0,
        { type: "separator" as const },
        tab1,
        { type: "separator" as const },
        tab2,
      ]}
    />
  );
}
