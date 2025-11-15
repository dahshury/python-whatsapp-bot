"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import type * as RPNInput from "react-phone-number-input";
import { TIMEZONE_OPTIONS } from "@/shared/data/timezones";
import { AVAILABLE_LANGUAGES, LANGUAGE_LABELS } from "@/shared/libs/i18n";
import { cn } from "@/shared/libs/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Label } from "@/shared/ui/label";
import { PhoneCountrySelector } from "@/shared/ui/phone/phone-country-selector";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import type { AppConfigFormValues } from "../../model";

// Dynamically discover language options from i18n resources
const LANGUAGE_OPTIONS = AVAILABLE_LANGUAGES.map((lang) => ({
  value: lang,
  label: LANGUAGE_LABELS[lang] || lang,
}));

const LLM_PROVIDER_OPTIONS = [
  { value: "google", label: "Google" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

type GeneralSectionProps = {
  form: UseFormReturn<AppConfigFormValues>;
  className?: string;
};

export const GeneralSection = ({ form, className }: GeneralSectionProps) => {
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const selectedRef = useRef<HTMLDivElement | null>(null);

  const filteredTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    if (!query) {
      return TIMEZONE_OPTIONS;
    }
    return TIMEZONE_OPTIONS.filter((tz) => tz.toLowerCase().includes(query));
  }, [timezoneSearch]);

  return (
    <div className={cn("w-full space-y-4", className)}>
      <Card className="space-y-4 border bg-background/40 p-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">Default Country Prefix</h3>
          <p className="text-muted-foreground text-sm">
            Default country code used for phone selectors
          </p>
        </div>
        <Controller
          control={form.control}
          name="defaultCountryPrefix"
          render={({ field }) => (
            <div className="w-full sm:w-80" dir="ltr">
              <PhoneCountrySelector
                className="w-full"
                country={field.value as RPNInput.Country}
                isOpen={isCountryOpen}
                search={countrySearch}
                selectedRef={selectedRef}
                setCountry={(country) => {
                  field.onChange(country);
                  setIsCountryOpen(false);
                  setCountrySearch("");
                }}
                setIsOpen={setIsCountryOpen}
                setSearch={setCountrySearch}
                showCountryLabel
                size="default"
              />
            </div>
          )}
        />
      </Card>

      <Card className="space-y-4 border bg-background/40 p-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">Available Languages</h3>
          <p className="text-muted-foreground text-sm">
            Enable or disable UI languages for end users
          </p>
        </div>
        <Controller
          control={form.control}
          name="availableLanguages"
          render={({ field }) => {
            // Ensure English is always included
            const currentValue = field.value ?? [];
            const hasEnglish = currentValue.includes("en");
            const normalizedValue = hasEnglish
              ? currentValue
              : [...currentValue, "en"].sort();

            // Update field if English was missing
            if (!hasEnglish) {
              field.onChange(normalizedValue);
            }

            const handleLanguageToggle = (langValue: string) => {
              const isEnglish = langValue === "en";
              // Prevent disabling English
              if (isEnglish && normalizedValue.includes(langValue)) {
                return;
              }

              const newValue = normalizedValue.includes(langValue)
                ? normalizedValue.filter((v) => v !== langValue)
                : [...normalizedValue, langValue];

              // Always ensure English is included
              const finalValue = newValue.includes("en")
                ? newValue.sort()
                : [...newValue, "en"].sort();

              field.onChange(finalValue.length > 0 ? finalValue : ["en"]);
            };

            return (
              <Popover onOpenChange={setIsLanguagesOpen} open={isLanguagesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-expanded={isLanguagesOpen}
                    className="w-full justify-between"
                    role="combobox"
                    variant="outline"
                  >
                    <div className="flex flex-wrap gap-1">
                      {normalizedValue.length > 0 ? (
                        normalizedValue.map((value) => {
                          const lang = LANGUAGE_OPTIONS.find(
                            (opt) => opt.value === value
                          );
                          const isEnglish = value === "en";
                          return (
                            <Badge
                              className="mr-1"
                              key={value}
                              variant="secondary"
                            >
                              {lang?.label || value}
                              {!isEnglish && (
                                // biome-ignore lint/a11y/useSemanticElements: Cannot use button here due to nested button restriction
                                <span
                                  className="ml-1 cursor-pointer rounded-full outline-none ring-offset-background hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleLanguageToggle(value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleLanguageToggle(value);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <X className="size-3 text-muted-foreground hover:text-foreground" />
                                </span>
                              )}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground">
                          Select languages...
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search languages..." />
                    <CommandList>
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup>
                        {LANGUAGE_OPTIONS.map((lang) => {
                          const isEnglish = lang.value === "en";
                          const isChecked = normalizedValue.includes(
                            lang.value
                          );
                          return (
                            <CommandItem
                              key={lang.value}
                              onSelect={(selectedValue) => {
                                if (isEnglish && isChecked) {
                                  return; // Prevent disabling English
                                }
                                handleLanguageToggle(selectedValue);
                              }}
                              value={lang.value}
                            >
                              <Checkbox
                                checked={isChecked}
                                className="mr-2"
                                disabled={isEnglish && isChecked}
                              />
                              {lang.label}
                              {isEnglish && (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  (always enabled)
                                </span>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          }}
        />
      </Card>

      <Card className="space-y-4 border bg-background/40 p-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">System Defaults</h3>
          <p className="text-muted-foreground text-sm">
            Configure timezone-sensitive behavior and AI provider
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Popover onOpenChange={setIsTimezoneOpen} open={isTimezoneOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn(
                        "flex w-full items-center justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      role="combobox"
                      variant="outline"
                    >
                      <span className="truncate">
                        {field.value || "Asia/Riyadh"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[22rem] p-0">
                    <Command>
                      <CommandInput
                        onValueChange={setTimezoneSearch}
                        placeholder="Search timezones..."
                        value={timezoneSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <ThemedScrollbar className="max-h-64">
                          <CommandGroup>
                            {filteredTimezones.map((timezone) => (
                              <CommandItem
                                className="flex items-center justify-between"
                                key={timezone}
                                onSelect={(value) => {
                                  field.onChange(value);
                                  setTimezoneSearch("");
                                  setIsTimezoneOpen(false);
                                }}
                                value={timezone}
                              >
                                <span className="truncate">{timezone}</span>
                                {field.value === timezone && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </ThemedScrollbar>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">
                  Determines calendar slots, document timestamps, and AI time
                  responses.
                </p>
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="llmProvider"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>LLM Provider</Label>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? "openai"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Controls which AI vendor handles automated replies and agent
                  workflows.
                </p>
              </div>
            )}
          />
        </div>
      </Card>
    </div>
  );
};
