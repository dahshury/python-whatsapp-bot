"use client";

import { i18n } from "@shared/libs/i18n";
import { type Theme, useSettings } from "@shared/libs/state/settings-context";
import { useSpacemanTheme } from "@space-man/react-theme-animation";
import { Label } from "@ui/label";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme as useNextThemes } from "next-themes";
import { toastService } from "@/shared/libs/toast/toast-service";
import { ExpandableTabs } from "@/shared/ui/expandable-tabs";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { getThemeNameLocalized, THEME_OPTIONS } from "./theme-data";

interface ThemeSelectorProps {
	isLocalized?: boolean;
}

export function ThemeSelector({ isLocalized = false }: ThemeSelectorProps) {
	const { theme: appTheme, setTheme: setAppTheme } = useSettings();
	const { setColorTheme } = useSpacemanTheme();
	const { theme: nextTheme, setTheme: setNextTheme } = useNextThemes();

	const handleAppThemeChange = (value: string) => {
		// Cache the user's explicit mode selection (light/dark/system)
		const currentMode = nextTheme;

		// Apply the style theme through both animation and settings store
		setColorTheme(value as Theme);
		setAppTheme(value as Theme);

		// Preserve previously selected mode exactly as-is
		if (currentMode) {
			// Apply immediately and then again on the next frame to override late mutations
			setNextTheme(currentMode);
			requestAnimationFrame(() => setNextTheme(currentMode));
		}

		const themeName = getThemeNameLocalized(value, isLocalized);
		toastService.success(isLocalized ? `تم تغيير المظهر إلى ${themeName}` : `Theme changed to ${themeName}`);
	};

	return (
		<div className="space-y-3 rounded-lg border p-3 relative bg-background/40 backdrop-blur-sm">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Palette className="h-4 w-4" />
					<span className="text-sm font-medium">{isLocalized ? "المظهر" : "Theme"}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<ExpandableTabs
						activeColor="text-primary"
						tabs={[
							{
								title: i18n.getMessage("theme_mode_system", isLocalized),
								icon: Monitor,
							},
							{ type: "separator" as const },
							{
								title: i18n.getMessage("theme_mode_light", isLocalized),
								icon: Sun,
							},
							{ type: "separator" as const },
							{
								title: i18n.getMessage("theme_mode_dark", isLocalized),
								icon: Moon,
							},
						]}
						selectedIndex={(nextTheme ?? "system") === "system" ? 0 : (nextTheme ?? "system") === "light" ? 2 : 4}
						onChange={(index) => {
							if (index === null) return;
							let normalized = -1;
							if (index === 0) normalized = 0;
							else if (index === 2) normalized = 1;
							else if (index === 4) normalized = 2;
							if (normalized < 0 || normalized > 2) return;
							const map = ["system", "light", "dark"] as const;
							const mode = map[normalized as 0 | 1 | 2];
							if (mode) setNextTheme(mode);
						}}
					/>
				</div>
			</div>

			<RadioGroup value={appTheme} onValueChange={handleAppThemeChange} className="grid grid-cols-3 gap-2">
				{THEME_OPTIONS.map((themeOption) => {
					const isRounded = !themeOption.borderStyle || themeOption.borderStyle === "0px";

					return (
						<div key={themeOption.value}>
							<RadioGroupItem value={themeOption.value} id={themeOption.value} className="peer sr-only" />
							<Label
								htmlFor={themeOption.value}
								className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
							>
								<div className="flex gap-1 mb-0.5">
									<div
										className={`w-3 h-3 ${isRounded ? "rounded-full" : "rounded"}`}
										style={{
											backgroundColor: themeOption.colors.primary,
											...(themeOption.borderStyle && themeOption.borderStyle !== "0px"
												? {
														border: themeOption.borderStyle,
													}
												: {}),
										}}
									/>
									<div
										className={`w-3 h-3 ${isRounded ? "rounded-full" : "rounded"}`}
										style={{
											backgroundColor: themeOption.colors.secondary,
											...(themeOption.borderStyle && themeOption.borderStyle !== "0px"
												? {
														border: themeOption.borderStyle,
													}
												: {}),
										}}
									/>
								</div>
								<span className="text-xs">{isLocalized ? themeOption.nameRTL : themeOption.name}</span>
							</Label>
						</div>
					);
				})}
			</RadioGroup>
		</div>
	);
}
