"use client";

import { LayoutGrid, Split, Unlock } from "lucide-react";
import * as React from "react";
import type { SimpleToolbarItem } from "@/components/kokonutui/toolbar";
import { MiniToolbar } from "@/components/kokonutui/toolbar";
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

	const current: ViewMode["value"] = freeRoam
		? "freeRoam"
		: showDualCalendar
			? "dual"
			: "default";

	const items: SimpleToolbarItem[] = React.useMemo(
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

	return (
		<MiniToolbar
			className={className}
			items={items}
			value={current}
			onChange={handleChange}
			compact
		/>
	);
}
