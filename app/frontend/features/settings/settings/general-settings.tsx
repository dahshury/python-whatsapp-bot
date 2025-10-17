"use client";

import { useLanguage } from "@shared/libs/state/language-context";
import { toastService } from "@shared/libs/toast/toast-service";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { Label } from "@ui/label";
import { Languages } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type GeneralSettingsProps = {
	isLocalized?: boolean;
};

// Helper to get language change toast message
function getLanguageChangeMessage(value: string): string {
	if (value === "ar") {
		return "تم التبديل إلى العربية";
	}
	if (value === "en") {
		return "Switched to English";
	}
	return `Language changed: ${value}`;
}

export function GeneralSettings({ isLocalized = false }: GeneralSettingsProps) {
	const { locale, setLocale } = useLanguage();

	const handleLanguageChange = (value: string) => {
		setLocale(value);
		toastService.success(getLanguageChangeMessage(value));
	};

	return (
		<div className="space-y-4">
			{/* Language Setting */}
			<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 font-medium text-sm">
						<Languages className="h-4 w-4" />
						{isLocalized ? "اللغة" : "Language"}
					</Label>
					<p className="text-muted-foreground text-xs">
						{isLocalized
							? "اختر لغتك المفضلة"
							: "Select your preferred language"}
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" variant="outline">
							<Languages className="h-4 w-4" />
							<span className="ml-1">{isLocalized ? "اللغة" : "Language"}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-48"
						style={{ zIndex: Z_INDEX.SELECT }}
					>
						<DropdownMenuLabel>
							{isLocalized ? "اختيار اللغة" : "Select Language"}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuRadioGroup
							onValueChange={handleLanguageChange}
							value={locale}
						>
							<DropdownMenuRadioItem value="en">
								<span className="flex items-center gap-2">
									<span>🇺🇸</span>
									<span>English</span>
								</span>
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="ar">
								<span className="flex items-center gap-2">
									<span>🇸🇦</span>
									<span>العربية</span>
								</span>
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
