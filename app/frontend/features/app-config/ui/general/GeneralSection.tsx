"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import type * as RPNInput from "react-phone-number-input";
import { TIMEZONE_OPTIONS } from "@/shared/data/timezones";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
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
import { Switch } from "@/shared/ui/switch";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import type { AppConfigFormValues } from "../../model";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية (Arabic)" },
];

const LLM_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "gemini", label: "Google Gemini" },
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
  const selectedRef = useRef<HTMLDivElement | null>(null);

  const filteredTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    if (!query) {
      return TIMEZONE_OPTIONS;
    }
    return TIMEZONE_OPTIONS.filter((tz) => tz.toLowerCase().includes(query));
  }, [timezoneSearch]);

  return (
    <div className={cn("space-y-4", className)}>
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
          render={({ field }) => (
            <div className="space-y-3">
              {LANGUAGE_OPTIONS.map((lang) => {
                const checked = field.value?.includes(lang.value) ?? false;
                const toggleLanguage = (next: boolean) => {
                  const current = field.value ?? [];
                  if (next) {
                    field.onChange(
                      Array.from(new Set([...current, lang.value]))
                    );
                  } else {
                    const filtered = current.filter(
                      (value) => value !== lang.value
                    );
                    field.onChange(filtered.length > 0 ? filtered : current);
                  }
                };

                return (
                  <button
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition-all",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background/40 hover:bg-accent/50"
                    )}
                    key={lang.value}
                    onClick={(event) => {
                      event.preventDefault();
                      toggleLanguage(!checked);
                    }}
                    type="button"
                  >
                    <Label className="font-normal text-sm">{lang.label}</Label>
                    <Switch
                      checked={checked}
                      onCheckedChange={toggleLanguage}
                    />
                  </button>
                );
              })}
            </div>
          )}
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
