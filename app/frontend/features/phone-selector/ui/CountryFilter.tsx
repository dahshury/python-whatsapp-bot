"use client";

import { i18n } from "@shared/libs/i18n";
import { CheckCircle2 } from "lucide-react";
import type React from "react";
import type * as RPNInput from "react-phone-number-input";
import { Button } from "@/shared/ui/button";
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
import { FilterButtonGroup } from "./FilterButtonGroup";

type CountryFilterProps = {
  countryFilter: RPNInput.Country;
  getCountryName: (countryCode: RPNInput.Country) => string;
  isCountryOpen: boolean;
  setIsCountryOpen: (open: boolean) => void;
  countrySearch: string;
  setCountrySearch: (value: string) => void;
  countryOptions: ReadonlyArray<{
    value: RPNInput.Country;
    label: string;
    searchText?: string;
    count?: number;
  }>;
  countryFilterRef: React.RefObject<HTMLDivElement | null>;
  handleCountryFilterSelect: (country: RPNInput.Country) => void;
  handleRemoveCountryFilter: (event: React.MouseEvent) => void;
  isLocalized: boolean;
};

export function CountryFilter({
  countryFilter,
  getCountryName,
  isCountryOpen,
  setIsCountryOpen,
  countrySearch,
  setCountrySearch,
  countryOptions,
  countryFilterRef,
  handleCountryFilterSelect,
  handleRemoveCountryFilter,
  isLocalized,
}: CountryFilterProps) {
  return (
    <Popover onOpenChange={setIsCountryOpen} open={isCountryOpen}>
      <FilterButtonGroup
        filterButton={
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-[18px] gap-1 px-1.5 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                setIsCountryOpen(true);
              }}
            >
              <FlagComponent className="size-3" country={countryFilter} />
              <span>{getCountryName(countryFilter)}</span>
            </Button>
          </PopoverTrigger>
        }
        onRemove={handleRemoveCountryFilter}
      />
      <PopoverContent
        className="w-[18.75rem] p-0"
        dir="ltr"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command dir="ltr" shouldFilter={false}>
          <CommandInput
            dir="ltr"
            onValueChange={setCountrySearch}
            placeholder={
              i18n.getMessage(
                "phone_country_search_placeholder",
                isLocalized
              ) || "Search country..."
            }
            value={countrySearch}
          />
          <CommandList dir="ltr">
            <ThemedScrollbar className="h-72" rtl={false}>
              <CommandEmpty>
                {i18n.getMessage("phone_no_country_found", isLocalized) ||
                  "No country found."}
              </CommandEmpty>
              <CommandGroup dir="ltr">
                {countryOptions
                  .filter((option) => {
                    const searchLower = countrySearch.toLowerCase();
                    return (
                      option.label.toLowerCase().includes(searchLower) ||
                      option.searchText?.includes(searchLower)
                    );
                  })
                  .map((option) => (
                    <CommandItem
                      className="gap-2"
                      data-option-country={option.value}
                      key={option.value}
                      {...(countryFilter === option.value && countryFilterRef
                        ? {
                            ref: countryFilterRef as React.RefObject<HTMLDivElement | null>,
                          }
                        : {})}
                      onSelect={() => {
                        handleCountryFilterSelect(option.value);
                      }}
                      value={option.value}
                    >
                      <FlagComponent
                        country={option.value}
                        title={option.label}
                      />
                      <span className="flex-1 text-sm">{option.label}</span>
                      {countryFilter === option.value && (
                        <CheckCircle2 className="mr-2 size-4 text-primary" />
                      )}
                      {option.count !== undefined && option.count > 0 && (
                        <span className="text-muted-foreground text-xs">
                          ({option.count})
                        </span>
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
}


