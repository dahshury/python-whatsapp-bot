"use client";

import { Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { DateRangeFilter } from "../hooks/useDateRangeFilter";
import { FilterButtonGroup } from "./FilterButtonGroup";

type DateRangeFilterProps = {
  dateRangeFilter: DateRangeFilter;
  formatDateRangeLabel: (filter: DateRangeFilter) => string;
  onRemove: () => void;
};

export function DateRangeFilter({
  dateRangeFilter,
  formatDateRangeLabel,
  onRemove,
}: DateRangeFilterProps) {
  const Icon = dateRangeFilter.type === "messages" ? MessageCircle : Calendar;

  return (
    <FilterButtonGroup
      filterButton={
        <Button
          size="sm"
          variant="outline"
          className="h-[18px] gap-1 px-1.5 text-xs"
        >
          <Icon className="size-3" />
          <span>{formatDateRangeLabel(dateRangeFilter)}</span>
        </Button>
      }
      onRemove={(event) => {
        event.stopPropagation();
        onRemove();
      }}
    />
  );
}


