"use client";

import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { Label } from "@ui/label";
import { Globe, Languages } from "lucide-react";
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

export function GeneralSettings({ isLocalized = false }: GeneralSettingsProps) {
  const { locale, setLocale } = useLanguageStore();

  const handleLanguageChange = (value: string) => {
    setLocale(value);
    toastService.success(
      value === "ar"
        ? i18n.getMessage("language_switched_to_arabic", true)
        : "Switched to English"
    );
  };

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
              value={locale}
            >
              <DropdownMenuRadioItem value="en">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>English</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ar">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <span>العربية</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
