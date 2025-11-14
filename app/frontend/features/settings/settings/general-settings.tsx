"use client";

import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { Label } from "@ui/label";
import { Globe, Languages } from "lucide-react";
import { useEffect } from "react";
import { useAppConfigQuery } from "@/features/app-config";
import { useLanguageStore } from "@/infrastructure/store/app-store";
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

const LANGUAGE_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  en: { label: "English", icon: Globe },
  ar: { label: "العربية", icon: Languages },
};

export function GeneralSettings({ isLocalized = false }: GeneralSettingsProps) {
  const { locale, setLocale } = useLanguageStore();
  const { data: appConfig } = useAppConfigQuery();
  const configSnapshot = appConfig?.toSnapshot();

  const fallbackLanguages = ["en", "ar"];
  const availableLanguages = configSnapshot
    ? configSnapshot.availableLanguages
    : fallbackLanguages;

  const languageOptions = availableLanguages.filter(
    (lang) => lang in LANGUAGE_LABELS
  );

  const handleLanguageChange = (value: string) => {
    // Only allow switching to available languages
    if (!availableLanguages.includes(value)) {
      toastService.error("This language is not available");
      return;
    }

    setLocale(value);
    toastService.success(
      value === "ar"
        ? i18n.getMessage("language_switched_to_arabic", true)
        : "Switched to English"
    );
  };

  // If current locale is not available, switch to first available language
  useEffect(() => {
    if (
      locale &&
      !availableLanguages.includes(locale) &&
      languageOptions.length > 0
    ) {
      const firstAvailable = languageOptions[0];
      if (firstAvailable) {
        setLocale(firstAvailable);
      }
    }
  }, [locale, availableLanguages, languageOptions, setLocale]);

  // Don't render if no languages are available
  if (configSnapshot && languageOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Language Setting */}
      <div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 font-medium text-sm">
            <Languages className="h-4 w-4" />
            {i18n.getMessage("language_label", isLocalized)}
          </Label>
          <p className="text-muted-foreground text-xs">
            {i18n.getMessage("language_toggle_hint", isLocalized)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuLabel>
              {i18n.getMessage("language_label", isLocalized)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              onValueChange={handleLanguageChange}
              value={
                availableLanguages.includes(locale)
                  ? locale
                  : (languageOptions[0] ?? "")
              }
            >
              {languageOptions.map((lang) => {
                const langInfo = LANGUAGE_LABELS[lang];
                if (!langInfo) {
                  return null;
                }
                const Icon = langInfo.icon;
                return (
                  <DropdownMenuRadioItem key={lang} value={lang}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{langInfo.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
