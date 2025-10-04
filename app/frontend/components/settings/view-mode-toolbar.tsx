"use client";

import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Split, Unlock } from "lucide-react";
import * as React from "react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { toastService } from "@/lib/toast-service";
import type { ViewMode } from "@/types/navigation";

interface ViewModeToolbarProps {
	className?: string;
}

export function ViewModeToolbar({ className = "" }: ViewModeToolbarProps) {
	const { isLocalized } = useLanguage();
	const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } =
		useSettings();

	const items = React.useMemo(
		() => [
			{
				id: "default",
				title: isLocalized ? "افتراضي" : "Default",
				icon: LayoutGrid,
				tooltipTitle: isLocalized ? "الوضع الافتراضي" : "Default view",
				tooltipDescription: isLocalized
					? "عرض تقاويم قياسي بواجهة متوازنة وسهلة الاستخدام."
					: "Standard single calendar layout with a balanced, familiar UI.",
			},
			{
				id: "freeRoam",
				title: isLocalized ? "حر" : "Free",
				icon: Unlock,
				tooltipTitle: isLocalized ? "الوضع الحر" : "Free roam",
				tooltipDescription: isLocalized
					? "تحكم مرن في التنقل والعرض بلا قيود لتصفح سريع."
					: "Flexible navigation and layout for fast, unconstrained browsing.",
			},
			{
				id: "dual",
				title: isLocalized ? "مزدوج" : "Dual",
				icon: Split,
				tooltipTitle: isLocalized ? "تقويم مزدوج" : "Dual calendar",
				tooltipDescription: isLocalized
					? "اعرض تقويمين جنبًا إلى جنب للمقارنة والتخطيط المتزامن."
					: "View two calendars side by side for comparison and parallel planning.",
			},
		],
		[isLocalized],
	);

	const handleChange = React.useCallback(
		(id: string) => {
			const value = id as ViewMode["value"];
			const isFreeRoam = value === "freeRoam";
			const isDual = value === "dual";

			setFreeRoam(isFreeRoam);
			setShowDualCalendar(isDual);

			try {
				const selected = items.find((i) => i.id === value);
				const modeLabel = selected?.title ?? value;
				toastService.success(
					isLocalized
						? `تم تغيير وضع العرض إلى ${modeLabel}`
						: `View mode changed to ${modeLabel}`,
				);
			} catch {}
		},
		[isLocalized, items, setFreeRoam, setShowDualCalendar],
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
			tabs={[
				tab0,
				{ type: "separator" as const },
				tab1,
				{ type: "separator" as const },
				tab2,
			]}
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
