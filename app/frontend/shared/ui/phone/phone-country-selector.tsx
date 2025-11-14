import { i18n } from "@shared/libs/i18n";
import { getLocalizedCountryOptions } from "@shared/libs/phone/countries";
import { getSizeClasses } from "@shared/libs/ui/size";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { CheckCircle2, ChevronsUpDown } from "lucide-react";
import React, { type RefObject } from "react";
import type * as RPNInput from "react-phone-number-input";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Flag as FlagComponent } from "@/shared/ui/flag";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

type CountrySelectorProps = {
  country: RPNInput.Country | undefined;
  setCountry: (c: RPNInput.Country) => void;
  search: string;
  setSearch: (s: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedRef?: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Optional: Only show countries that exist in this list */
  availableCountries?: Set<RPNInput.Country>;
  showCountryLabel?: boolean;
};

export const PhoneCountrySelector: React.FC<CountrySelectorProps> = ({
  country,
  setCountry,
  search,
  setSearch,
  isOpen,
  setIsOpen,
  selectedRef,
  disabled,
  size = "default",
  className,
  availableCountries,
  showCountryLabel = false,
}) => {
  const { isLocalized } = useLanguageStore();
  const countryOptions = React.useMemo(() => {
    const allOptions = getLocalizedCountryOptions(isLocalized);
    // Filter to only show countries that exist in availableCountries
    if (availableCountries && availableCountries.size > 0) {
      return allOptions.filter((option) =>
        availableCountries.has(option.value)
      );
    }
    return allOptions;
  }, [isLocalized, availableCountries]);
  const selectedOption = React.useMemo(() => {
    if (!country) {
      return;
    }
    return countryOptions.find((option) => option.value === country);
  }, [countryOptions, country]);
  const selectPlaceholder = React.useMemo(
    () => i18n.getMessage("phone_country_select_placeholder", isLocalized),
    [isLocalized]
  );
  const displayLabel = selectedOption?.label ?? country ?? selectPlaceholder;
  const isPlaceholderLabel = !country;

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "flex gap-1 rounded-s-lg rounded-e-none border-r-0 focus:z-10",
            showCountryLabel && "w-full justify-between",
            getSizeClasses(size),
            className
          )}
          dir="ltr"
          disabled={disabled}
          type="button"
          variant="outline"
        >
          {country ? (
            <FlagComponent country={country} title={country} />
          ) : (
            <span className="text-muted-foreground">🌍</span>
          )}
          {showCountryLabel && (
            <span
              className={cn(
                "ms-2 flex-1 truncate text-left text-sm",
                isPlaceholderLabel && "text-muted-foreground"
              )}
            >
              {displayLabel}
            </span>
          )}
          <ChevronsUpDown className="-mr-2 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        avoidCollisions={false}
        className={cn("w-[18.75rem] p-0", "click-outside-ignore")}
        dir="ltr"
        side="bottom"
      >
        <Command dir="ltr" shouldFilter={false}>
          <CommandInput
            dir="ltr"
            onValueChange={setSearch}
            placeholder={i18n.getMessage(
              "phone_country_search_placeholder",
              isLocalized
            )}
            value={search}
          />
          <CommandList className="!overflow-visible" dir="ltr">
            <ThemedScrollbar className="h-72" rtl={false}>
              <CommandEmpty>
                {i18n.getMessage("phone_no_country_found", isLocalized)}
              </CommandEmpty>
              <CommandGroup dir="ltr">
                {countryOptions
                  .filter((option) => {
                    const searchLower = search.toLowerCase();
                    // Search in both label and searchText (which includes both languages)
                    return (
                      option.label.toLowerCase().includes(searchLower) ||
                      ("searchText" in option &&
                        option.searchText.includes(searchLower))
                    );
                  })
                  .map((option) => (
                    <CommandItem
                      className="gap-2"
                      data-option-country={option.value}
                      key={option.value}
                      value={option.value}
                      {...(country === option.value && selectedRef
                        ? {
                            ref: selectedRef as RefObject<HTMLDivElement | null>,
                          }
                        : {})}
                      onSelect={() => setCountry(option.value)}
                    >
                      <FlagComponent
                        country={option.value}
                        title={option.label}
                      />
                      <span className="flex-1 text-sm">{option.label}</span>
                      {country === option.value && (
                        <CheckCircle2 className="ms-auto size-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ThemedScrollbar>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
