"use client";
import { Button } from "@ui/button";
import { Save } from "lucide-react";
import type { ValidationError } from "@/shared/libs/validation/areValidationErrorsEqual";
import { Spinner } from "@/shared/ui/spinner";
import { ValidationErrorsPopover } from "../data-table-editor/data-table-editor/ValidationErrorsPopover";

type FooterProps = {
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
  saveLabel: string;
  savingLabel: string;
  validationErrors: ValidationError[];
};

export function Footer({
  canSave,
  isSaving,
  onSave,
  saveLabel,
  savingLabel,
  validationErrors,
}: FooterProps) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t px-4 py-1 sm:flex-row sm:justify-between sm:space-x-2">
      <div className="relative ms-auto flex items-center gap-2">
        <Button
          className="h-8 gap-2"
          disabled={!canSave || isSaving}
          onClick={onSave}
        >
          {isSaving ? (
            <>
              <Spinner className="h-4 w-4" />
              {savingLabel}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {saveLabel}
            </>
          )}
        </Button>
        {validationErrors?.length > 0 && (
          <div className="-top-1 -left-1 absolute">
            <ValidationErrorsPopover
              errors={validationErrors}
              triggerClassName=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
