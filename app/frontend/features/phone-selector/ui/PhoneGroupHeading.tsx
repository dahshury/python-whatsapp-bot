"use client";

import { cn } from "@shared/libs/utils";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import type { PhoneGroup } from "@/shared/libs/phone/phone-groups";

type PhoneGroupHeadingProps = {
  groupKey: PhoneGroup<IndexedPhoneOption>["key"];
  count: number;
  selectedHeading: string;
  recentHeading: string;
  allHeading: string;
};

export function PhoneGroupHeading({
  groupKey,
  count,
  selectedHeading,
  recentHeading,
  allHeading,
}: PhoneGroupHeadingProps) {
  let headingText = "";
  if (groupKey === "selected") {
    headingText = selectedHeading;
  } else if (groupKey === "recent") {
    headingText = recentHeading;
  } else {
    headingText = allHeading;
  }
  const isSelectedGroup = groupKey === "selected";
  return (
    <div
      className={cn(
        "flex items-center justify-between pr-1",
        isSelectedGroup && "py-0.5"
      )}
    >
      <span
        className={cn(
          "font-medium text-muted-foreground uppercase tracking-wide",
          isSelectedGroup ? "font-semibold text-[10px] text-primary" : "text-xs"
        )}
      >
        {headingText}
      </span>
      <span
        className={cn(
          "text-muted-foreground",
          isSelectedGroup ? "font-medium text-[10px] text-primary" : "text-xs"
        )}
      >
        {count}
      </span>
    </div>
  );
}
