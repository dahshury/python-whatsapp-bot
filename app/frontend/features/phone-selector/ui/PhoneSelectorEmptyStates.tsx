"use client";

import { i18n } from "@shared/libs/i18n";
import { Search } from "lucide-react";
import { CommandEmpty } from "@/shared/ui/command";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";

type PhoneSelectorEmptyStatesProps = {
  showNoResults: boolean;
  showNoData: boolean;
  isLocalized: boolean;
};

export function PhoneSelectorEmptyStates({
  showNoResults,
  showNoData,
  isLocalized,
}: PhoneSelectorEmptyStatesProps) {
  return (
    <>
      {showNoResults && (
        <CommandEmpty className="flex items-center justify-center py-6">
          <Empty className="mx-auto w-full max-w-[280px]">
            <EmptyHeader>
              <EmptyMedia>
                <Search className="size-8 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle className="text-balance">
                {i18n.getMessage("phone_no_results_title", isLocalized) ||
                  "No results for your search"}
              </EmptyTitle>
              <EmptyDescription className="text-balance">
                {i18n.getMessage("phone_no_results_description", isLocalized) ||
                  "Try using different keywords or check the spelling. You can also browse our categories to find what you're looking for."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CommandEmpty>
      )}

      {showNoData && (
        <CommandEmpty>
          {i18n.getMessage("phone_no_phone_found", isLocalized)}
        </CommandEmpty>
      )}
    </>
  );
}
