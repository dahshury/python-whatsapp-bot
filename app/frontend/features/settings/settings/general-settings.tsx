"use client";

import { useLanguage } from "@shared/libs/state/language-context";
import { toastService } from "@shared/libs/toast";
import { Label } from "@ui/label";
import { Languages } from "lucide-react";
import { Switch } from "@/shared/ui/switch";

interface GeneralSettingsProps {
	isLocalized?: boolean;
}

export function GeneralSettings({ isLocalized = false }: GeneralSettingsProps) {
	const { isLocalized: currentIsLocalized, setUseLocalizedText } = useLanguage();

	const handleLanguageToggle = (checked: boolean) => {
		setUseLocalizedText(checked);
		toastService.success(checked ? "تم التبديل إلى العربية" : "Switched to English");
	};

	return (
		<div className="space-y-4">
			{/* Language Setting */}
			<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
				<div className="space-y-0.5">
					<Label className="text-sm font-medium flex items-center gap-2">
						<Languages className="h-4 w-4" />
						{isLocalized ? "اللغة" : "Language"}
					</Label>
					<p className="text-xs text-muted-foreground">
						{isLocalized ? "التبديل بين العربية والإنجليزية" : "Switch between Arabic and English"}
					</p>
				</div>
				<Switch
					checked={currentIsLocalized}
					onCheckedChange={handleLanguageToggle}
					className="data-[state=checked]:bg-primary"
				/>
			</div>
		</div>
	);
}
