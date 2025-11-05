"use client";

import { Phone, Plus } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CommandEmpty } from "@/shared/ui/command";

type CreatePhonePanelProps = {
  showCreatePanel: boolean;
  previewDisplay: string;
  previewFallback: string;
  addNewTitle: string;
  addNewDescription: string;
  addButtonLabel: string;
  search: string;
  onCreateNew: (raw: string) => void;
};

export function CreatePhonePanel({
  showCreatePanel,
  previewDisplay,
  previewFallback,
  addNewTitle,
  addNewDescription,
  addButtonLabel,
  search,
  onCreateNew,
}: CreatePhonePanelProps) {
  if (!showCreatePanel) {
    return null;
  }

  return (
    <CommandEmpty className="flex items-center justify-center py-6">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-primary/30 border-dashed bg-muted/40 p-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Phone className="size-6" />
        </div>
        <div className="w-full space-y-1">
          <p className="font-semibold text-sm">{addNewTitle}</p>
          <p className="break-words text-muted-foreground text-xs">
            {addNewDescription}
          </p>
        </div>
        <Badge
          className="rounded-md px-3 py-1 font-medium text-sm"
          variant="secondary"
        >
          {previewDisplay || previewFallback}
        </Badge>
        <Button
          className="w-full max-w-xs"
          onClick={() => onCreateNew(search)}
          size="sm"
          variant="default"
        >
          <Plus className="mr-2 size-3" />
          {addButtonLabel}
        </Button>
      </div>
    </CommandEmpty>
  );
}
