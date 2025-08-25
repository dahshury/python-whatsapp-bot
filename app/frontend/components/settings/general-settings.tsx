"use client";

import { Languages } from "lucide-react";
import { toastService } from "@/lib/toast-service";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/language-context";

interface GeneralSettingsProps {
	isRTL?: boolean;
}

export function GeneralSettings({ isRTL = false }: GeneralSettingsProps) {
	const { isRTL: currentIsRTL, setUseArabicText } = useLanguage();

	const handleLanguageToggle = (checked: boolean) => {
		setUseArabicText(checked);
		toastService.success(checked ? "تم التبديل إلى العربية" : "Switched to English");
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
				<div className="space-y-0.5">
					<Label className="text-sm font-medium flex items-center gap-2">
						<Languages className="h-4 w-4" />
						{isRTL ? "اللغة" : "Language"}
					</Label>
					<p className="text-xs text-muted-foreground">
						{isRTL
							? "التبديل بين العربية والإنجليزية"
							: "Switch between Arabic and English"}
					</p>
				</div>
				<Switch
					checked={currentIsRTL}
					onCheckedChange={handleLanguageToggle}
					className="data-[state=checked]:bg-primary"
				/>
			</div>
		</div>
	);
}
