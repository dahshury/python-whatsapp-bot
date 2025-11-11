"use client";

import { X } from "lucide-react";
import type React from "react";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";

type FilterButtonGroupProps = {
  filterButton: React.ReactNode;
  onRemove: (event: React.MouseEvent) => void;
};

export function FilterButtonGroup({
  filterButton,
  onRemove,
}: FilterButtonGroupProps) {
  return (
    <ButtonGroup>
      {filterButton}
      <Button
        className="h-[18px] px-1.5"
        onClick={onRemove}
        size="sm"
        variant="outline"
      >
        <X className="size-3" />
      </Button>
    </ButtonGroup>
  );
}
