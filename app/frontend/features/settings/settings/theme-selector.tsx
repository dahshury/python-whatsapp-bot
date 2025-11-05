"use client";

import { i18n } from "@shared/libs/i18n";
import { type Theme, useSettings } from "@shared/libs/state/settings-context";
import { useSpacemanTheme } from "@space-man/react-theme-animation";
import { Label } from "@ui/label";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme as useNextThemes } from "next-themes";
import { useThemeSetting } from "@/features/settings";
import { toastService } from "@/shared/libs/toast/toast-service";
import { ExpandableTabs } from "@/shared/ui/expandable-tabs";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { getThemeNameLocalized, THEME_OPTIONS } from "./theme-data";

type ThemeSelectorProps = {
  isLocalized?: boolean;
};

export function ThemeSelector({ isLocalized = false }: ThemeSelectorProps) {
  const { theme: appTheme, setTheme: setAppTheme } = useSettings();
  const { setTheme } = useThemeSetting();
  const { setColorTheme } = useSpacemanTheme();
  const { theme: nextTheme, setTheme: setNextTheme } = useNextThemes();

  const handleAppThemeChange = (value: string) => {
    // Cache the user's explicit mode selection (light/dark/system)
    const currentMode = nextTheme;

    // Apply the style theme through both animation and settings store
    setColorTheme(value as Theme);
    setAppTheme(value as Theme);
    try {
      setTheme((value as unknown as "light" | "dark") ?? "light");
    } catch {
      // Silently ignore errors when setting theme (theme may not be supported)
    }

    // Preserve previously selected mode exactly as-is
    if (currentMode) {
      // Apply immediately and then again on the next frame to override late mutations
      setNextTheme(currentMode);
      requestAnimationFrame(() => setNextTheme(currentMode));
    }

    const themeName = getThemeNameLocalized(value, isLocalized);
    toastService.success(
      isLocalized
        ? `تم تغيير المظهر إلى ${themeName}`
        : `Theme changed to ${themeName}`
    );
  };

  return (
    <div className="relative space-y-3 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="font-medium text-sm">
            {i18n.getMessage("theme_label", isLocalized)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ExpandableTabs
            activeColor="text-primary"
            onChange={(index) => {
              if (index === null) {
                return;
              }
              // Normalize indices: separators at 1 and 3, actual tabs at 0, 2, 4
              const INDEX_SYSTEM = 0;
              const INDEX_LIGHT = 2;
              const INDEX_DARK = 4;
              const MAX_NORMALIZED = 2;
              let normalized = -1;
              if (index === INDEX_SYSTEM) {
                normalized = 0;
              } else if (index === INDEX_LIGHT) {
                normalized = 1;
              } else if (index === INDEX_DARK) {
                normalized = 2;
              }
              if (normalized < 0 || normalized > MAX_NORMALIZED) {
                return;
              }
              const map = ["system", "light", "dark"] as const;
              const mode = map[normalized as 0 | 1 | 2];
              if (mode) {
                setNextTheme(mode);
              }
            }}
            selectedIndex={(() => {
              // Normalize indices: separators at 1 and 3, actual tabs at 0, 2, 4
              const INDEX_SYSTEM = 0;
              const INDEX_LIGHT = 2;
              const INDEX_DARK = 4;
              if ((nextTheme ?? "system") === "system") {
                return INDEX_SYSTEM;
              }
              if ((nextTheme ?? "system") === "light") {
                return INDEX_LIGHT;
              }
              return INDEX_DARK;
            })()}
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
          />
        </div>
      </div>

      <RadioGroup
        className="grid grid-cols-3 gap-2"
        onValueChange={handleAppThemeChange}
        value={appTheme}
      >
        {THEME_OPTIONS.map((themeOption) => {
          const isRounded =
            !themeOption.borderStyle || themeOption.borderStyle === "0px";

          return (
            <div key={themeOption.value}>
              <RadioGroupItem
                className="peer sr-only"
                id={themeOption.value}
                value={themeOption.value}
              />
              <Label
                className="flex cursor-pointer flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                htmlFor={themeOption.value}
              >
                <div className="mb-0.5 flex gap-1">
                  <div
                    className={`h-3 w-3 ${isRounded ? "rounded-full" : "rounded"}`}
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
                    className={`h-3 w-3 ${isRounded ? "rounded-full" : "rounded"}`}
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
