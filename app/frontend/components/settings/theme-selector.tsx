"use client";

import {
	useSpacemanTheme,
} from "@space-man/react-theme-animation";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { MiniToolbar } from "@/components/kokonutui/toolbar";
import { useTheme as useNextThemes } from "next-themes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type Theme, useSettings } from "@/lib/settings-context";
import { toastService } from "@/lib/toast-service";
import { getThemeName, THEME_OPTIONS } from "./theme-data";

interface ThemeSelectorProps {
	isLocalized?: boolean;
}

export function ThemeSelector({ isLocalized = false }: ThemeSelectorProps) {
	const { theme: appTheme, setTheme: setAppTheme } = useSettings();
	const { setColorTheme } = useSpacemanTheme();
	const { theme: nextTheme, setTheme: setNextTheme } = useNextThemes();

	const handleAppThemeChange = (value: string) => {
		// Animate via Spaceman and also update our Settings immediately
		setColorTheme(value as Theme);
		setAppTheme(value as Theme);
		const themeName = getThemeName(value);
		toastService.success(
			isLocalized
				? `تم تغيير المظهر إلى ${themeName}`
				: `Theme changed to ${themeName}`,
		);
	};

	return (
		<div className="space-y-3 rounded-lg border p-3 relative bg-background/40 backdrop-blur-sm">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Palette className="h-4 w-4" />
					<span className="text-sm font-medium">
						{isLocalized ? "المظهر" : "Theme"}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<MiniToolbar
						compact
						items={[
							{ id: "system", icon: Monitor, title: "System" },
							{ id: "light", icon: Sun, title: "Light" },
							{ id: "dark", icon: Moon, title: "Dark" },
						]}
						value={(nextTheme ?? "system") as string}
						onChange={(id) => setNextTheme(id)}
						className="h-[1.8rem]"
					/>
				</div>
			</div>

			<RadioGroup
				value={appTheme}
				onValueChange={handleAppThemeChange}
				className="grid grid-cols-3 gap-2"
			>
				{THEME_OPTIONS.map((themeOption) => {
					const isRounded =
						!themeOption.borderStyle || themeOption.borderStyle === "0px";

					return (
						<div key={themeOption.value}>
							<RadioGroupItem
								value={themeOption.value}
								id={themeOption.value}
								className="peer sr-only"
							/>
							<Label
								htmlFor={themeOption.value}
								className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm"
							>
								<div className="flex gap-1 mb-0.5">
									<div
										className={`w-3 h-3 ${isRounded ? "rounded-full" : "rounded"}`}
										style={{
											backgroundColor: themeOption.colors.primary,
											...(themeOption.borderStyle &&
											themeOption.borderStyle !== "0px"
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
											...(themeOption.borderStyle &&
											themeOption.borderStyle !== "0px"
												? {
														border: themeOption.borderStyle,
												  }
												: {}),
										}}
									/>
								</div>
								<span className="text-xs">
									{isLocalized ? themeOption.nameRTL : themeOption.name}
								</span>
							</Label>
						</div>
					);
				})}
			</RadioGroup>
		</div>
	);
}
