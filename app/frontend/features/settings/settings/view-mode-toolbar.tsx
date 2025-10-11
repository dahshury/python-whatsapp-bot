"use client";

import type { ViewMode } from "@features/navigation/types";
import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Split, Unlock } from "lucide-react";
import * as React from "react";
import { toastService } from "@/shared/libs/toast/toast-service";
import { ExpandableTabs } from "@/shared/ui/expandable-tabs";

interface ViewModeToolbarProps {
	className?: string;
}

export function ViewModeToolbar({ className = "" }: ViewModeToolbarProps) {
	const { isLocalized } = useLanguage();
	const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } = useSettings();

	const items = React.useMemo(
		() => [
			{
				id: "default",
				title: i18n.getMessage("view_default", isLocalized),
				icon: LayoutGrid,
				tooltipTitle: i18n.getMessage("view_default_tooltip_title", isLocalized),
				tooltipDescription: i18n.getMessage("view_default_tooltip_desc", isLocalized),
			},
			{
				id: "freeRoam",
				title: i18n.getMessage("view_free", isLocalized),
				icon: Unlock,
				tooltipTitle: i18n.getMessage("view_free_tooltip_title", isLocalized),
				tooltipDescription: i18n.getMessage("view_free_tooltip_desc", isLocalized),
			},
			{
				id: "dual",
				title: i18n.getMessage("view_dual", isLocalized),
				icon: Split,
				tooltipTitle: i18n.getMessage("view_dual_tooltip_title", isLocalized),
				tooltipDescription: i18n.getMessage("view_dual_tooltip_desc", isLocalized),
			},
		],
		[isLocalized]
	);

	const handleChange = React.useCallback(
		(id: string) => {
			const value = id as ViewMode["value"];
			const isFreeRoam = value === "freeRoam";
			const isDual = value === "dual";

			setFreeRoam(isFreeRoam);
			setShowDualCalendar(isDual);

			try {
				const title = i18n.getMessage("view_changed", isLocalized);
				toastService.success(title);
			} catch {}
		},
		[isLocalized, setFreeRoam, setShowDualCalendar]
	);

	const tabs = items.map((it) => ({
		title: it.title,
		icon: it.icon as LucideIcon,
	}));

	// Compute selected index based on current state
	const currentSelectedIndex = freeRoam ? 2 : showDualCalendar ? 4 : 0;

	const tab0 = tabs[0];
	const tab1 = tabs[1];
	const tab2 = tabs[2];
	if (!tab0 || !tab1 || !tab2) return null;

	return (
		<ExpandableTabs
			className={className}
			tabs={[tab0, { type: "separator" as const }, tab1, { type: "separator" as const }, tab2]}
			selectedIndex={currentSelectedIndex}
			onChange={(index) => {
				if (index === null) return;
				const map = ["default", "freeRoam", "dual"] as const;
				// We inserted separators at 1 and 3; normalize indices 0,2,4 to 0,1,2
				let normalized = -1;
				if (index === 0) normalized = 0;
				else if (index === 2) normalized = 1;
				else if (index === 4) normalized = 2;
				if (normalized >= 0 && normalized < map.length) {
					const mode = map[normalized as 0 | 1 | 2];
					if (mode) handleChange(mode);
				}
			}}
		/>
	);
}
