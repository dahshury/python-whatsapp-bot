"use client";

import { ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { DAYS_OF_WEEK } from "../../lib";

type WorkingDayMultiSelectProps = {
  value: number[];
  onChange: (days: number[]) => void;
};

export const WorkingDayMultiSelect = ({
  value,
  onChange,
}: WorkingDayMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const safeValue = Array.isArray(value) ? value : [];
  const selectedValues = safeValue.map(String);

  const handleDayToggle = (dayValue: number) => {
    const dayValueStr = String(dayValue);
    const newValues = selectedValues.includes(dayValueStr)
      ? selectedValues.filter((v) => v !== dayValueStr)
      : [...selectedValues, dayValueStr];

    const days = newValues.map((val) => Number.parseInt(val, 10)).sort();
    onChange(days);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between"
          role="combobox"
          variant="outline"
        >
          <div className="flex flex-wrap gap-1">
            {selectedValues.length > 0 ? (
              selectedValues.map((dayValueStr) => {
                const dayValue = Number.parseInt(dayValueStr, 10);
                const day = DAYS_OF_WEEK.find((d) => d.value === dayValue);
                return (
                  <Badge className="mr-1" key={dayValueStr} variant="secondary">
                    {day?.label || dayValueStr}
                    {/* biome-ignore lint/a11y/useSemanticElements: Cannot use button here due to nested button restriction */}
                    <span
                      className="ml-1 cursor-pointer rounded-full outline-none ring-offset-background hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDayToggle(dayValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDayToggle(dayValue);
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
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground">Select days...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search days..." />
          <CommandList>
            <CommandEmpty>No day found.</CommandEmpty>
            <CommandGroup>
              {DAYS_OF_WEEK.map((day) => {
                const isChecked = selectedValues.includes(String(day.value));
                return (
                  <CommandItem
                    key={day.value}
                    onSelect={(selectedValue) => {
                      const dayValue = Number.parseInt(selectedValue, 10);
                      handleDayToggle(dayValue);
                    }}
                    value={String(day.value)}
                  >
                    <Checkbox checked={isChecked} className="mr-2" />
                    {day.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
