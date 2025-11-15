"use client";

import { Columns, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, type UseFormReturn, useFieldArray } from "react-hook-form";
import { i18n, LANGUAGE_LABELS } from "@/shared/libs/i18n";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import type { AppConfigFormValues, ColumnFormValue } from "../../model";
import { createDefaultColumn } from "../../model";

const COLUMN_DATA_TYPES = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Date & Time", value: "datetime" },
  { label: "Phone", value: "phone" },
  { label: "Dropdown", value: "dropdown" },
  { label: "Date", value: "date" },
  { label: "Time", value: "time" },
];

/**
 * Sanitizes a column identifier to be a valid i18n key:
 * - Removes leading/trailing whitespace
 * - Replaces spaces with underscores
 * - Removes dots
 * - Converts to lowercase
 */
const sanitizeColumnIdentifier = (value: string): string => {
  return value
    .trim()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/\./g, "") // Remove dots
    .toLowerCase(); // Convert to lowercase
};

type ColumnSectionProps = {
  form: UseFormReturn<AppConfigFormValues>;
  fieldName: "calendarColumns" | "documentsColumns";
  title: string;
  description: string;
  className?: string;
};

const MetadataEditor = ({
  value,
  onChange,
}: {
  value: Record<string, unknown> | null | undefined;
  onChange: (metadata: Record<string, unknown> | null) => void;
}) => {
  const stringValue = value ? JSON.stringify(value, null, 2) : "";

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = event.target.value;
    if (!raw.trim()) {
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        onChange(parsed);
      }
    } catch {
      onChange(value ?? null);
    }
  };

  return (
    <Textarea
      className="font-mono text-xs"
      onChange={handleChange}
      placeholder='Metadata JSON (e.g., { "options": ["appt_checkup"] })'
      value={stringValue}
    />
  );
};

const ColumnTranslationInputs = ({
  form,
  fieldName,
  index,
  i18nKey,
}: {
  form: UseFormReturn<AppConfigFormValues>;
  fieldName: ColumnSectionProps["fieldName"];
  index: number;
  i18nKey: string;
}) => {
  const availableLanguages = form.watch("availableLanguages") || [];

  if (availableLanguages.length === 0) {
    return null;
  }

  return (
    <Controller
      control={form.control}
      name={`${fieldName}.${index}.metadata`}
      render={({ field: metadataField }) => {
        const metadata = metadataField.value as
          | Record<string, unknown>
          | null
          | undefined;
        const translations =
          (metadata?.translations as Record<string, string> | undefined) || {};

        return (
          <div className="space-y-2">
            <Label>Display Titles (for all enabled languages)</Label>
            <p className="text-muted-foreground text-xs">
              These translations will be used when displaying the column in the
              data grid.
            </p>
            <div className="space-y-2">
              {availableLanguages.map((lang) => {
                // For i18n keys, get the current translation from i18n, but allow override via metadata
                let translationValue = translations[lang] || "";

                // Check if this is an i18n key
                const isI18nKey =
                  i18nKey?.startsWith("field_") ||
                  i18nKey?.startsWith("appt_") ||
                  i18nKey?.startsWith("msg_");

                if (!translationValue && isI18nKey && i18nKey) {
                  const isLocalized = lang === "ar";
                  const i18nTranslation = i18n.getMessage(i18nKey, isLocalized);
                  // Use i18n translation if it exists and is different from the key
                  if (
                    i18nTranslation &&
                    i18nTranslation !== i18nKey &&
                    i18nTranslation.trim() !== ""
                  ) {
                    translationValue = i18nTranslation;
                  }
                }

                const isInvalid =
                  !translationValue || translationValue.trim() === "";

                return (
                  <div className="space-y-1" key={lang}>
                    <Label className="font-normal text-xs">
                      {LANGUAGE_LABELS[lang] || lang} *
                    </Label>
                    <Input
                      className={isInvalid ? "border-destructive" : ""}
                      onChange={(e) => {
                        const newMetadata = {
                          ...(metadata || {}),
                          translations: {
                            ...translations,
                            [lang]: e.target.value,
                          },
                        };
                        metadataField.onChange(newMetadata);
                      }}
                      placeholder={`Enter translation for ${LANGUAGE_LABELS[lang] || lang}`}
                      value={translationValue}
                    />
                    {isInvalid && (
                      <p className="text-destructive text-xs">Required</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    />
  );
};

const ColumnList = ({
  form,
  fieldName,
}: {
  form: UseFormReturn<AppConfigFormValues>;
  fieldName: ColumnSectionProps["fieldName"];
}) => {
  const fieldArray = useFieldArray({
    control: form.control,
    name: fieldName,
  });
  const availableLanguages = form.watch("availableLanguages") || [];
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddColumn = () => {
    fieldArray.append(createDefaultColumn());
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }
    // Move the dragged item to the drop position
    fieldArray.move(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Helper function to check if a column is valid
  const isColumnValid = (
    column: ColumnFormValue
  ): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];

    if (!column.id || column.id.trim() === "") {
      missingFields.push("Column Identifier");
    }
    if (!column.dataType) {
      missingFields.push("Data Type");
    }
    if (column.width === null || column.width === undefined) {
      missingFields.push("Width");
    }

    // Helper to check if translation exists (either in metadata or i18n system)
    const hasTranslation = (lang: string): boolean => {
      const metadata = column.metadata as
        | Record<string, unknown>
        | null
        | undefined;
      const translations =
        (metadata?.translations as Record<string, string> | undefined) || {};
      const translationValue = translations[lang];

      // If translation exists in metadata and is not empty, it's valid
      if (translationValue && translationValue.trim() !== "") {
        return true;
      }

      // Use the same logic as display: prefer title, fallback to id
      const columnKey = column.title || column.id || "";

      // For i18n keys, check if translation exists in i18n system
      const isI18nKey =
        columnKey.startsWith("field_") ||
        columnKey.startsWith("appt_") ||
        columnKey.startsWith("msg_");
      if (isI18nKey && columnKey) {
        const isLocalized = lang === "ar";
        const i18nTranslation = i18n.getMessage(columnKey, isLocalized);
        // Check translation exists, is different from key, and not empty
        if (
          i18nTranslation &&
          i18nTranslation !== columnKey &&
          i18nTranslation.trim() !== ""
        ) {
          return true;
        }
      }

      return false;
    };

    // Check translations
    if (availableLanguages.length > 0) {
      for (const lang of availableLanguages) {
        if (!hasTranslation(lang)) {
          const langLabel = LANGUAGE_LABELS[lang] || lang;
          missingFields.push(`Translation (${langLabel})`);
        }
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  return (
    <div className="space-y-4">
      {fieldArray.fields.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No columns configured yet.
        </p>
      ) : (
        fieldArray.fields.map((column, index) => {
          const columnValue = form.watch(
            `${fieldName}.${index}`
          ) as ColumnFormValue;
          const validation = isColumnValid(columnValue);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: Drag and drop requires div element
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag and drop requires div element
            <div
              className={cn(
                "cursor-move space-y-4 rounded-lg border p-4 shadow-sm transition-all",
                validation.isValid
                  ? "border-border/50 bg-card/50"
                  : "border-destructive/50 bg-destructive/5",
                isDragging && "scale-95 opacity-50",
                isDragOver && "border-2 border-primary"
              )}
              draggable
              key={column.id}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragStart={() => handleDragStart(index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
                      {index + 1}
                    </div>
                    <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="truncate font-semibold text-sm">
                      {form.getValues(`${fieldName}.${index}.title`) ??
                        column.id ??
                        `Column ${index + 1}`}
                    </h4>
                    {!validation.isValid && (
                      <p className="text-destructive text-xs">
                        Missing: {validation.missingFields.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <Controller
                    control={form.control}
                    name={`${fieldName}.${index}.isEditable`}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label className="whitespace-nowrap font-normal text-sm">
                          Editable
                        </Label>
                      </div>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`${fieldName}.${index}.isRequired`}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label className="whitespace-nowrap font-normal text-sm">
                          Required
                        </Label>
                      </div>
                    )}
                  />
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      fieldArray.remove(index);
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {/* Column Identifier, Data Type, Width in one row */}
                <div className="grid grid-cols-3 gap-4">
                  <Controller
                    control={form.control}
                    name={`${fieldName}.${index}.id`}
                    render={({ field: idField }) => {
                      const titleValue =
                        form.watch(`${fieldName}.${index}.title`) ||
                        idField.value ||
                        "";
                      const displayValue = titleValue || idField.value || "";

                      const isInvalid =
                        !displayValue || displayValue.trim() === "";

                      return (
                        <div className="space-y-2">
                          <Label>Column Identifier *</Label>
                          <Input
                            className={isInvalid ? "border-destructive" : ""}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              // Sanitize the value to be a valid i18n key
                              const sanitizedValue =
                                sanitizeColumnIdentifier(rawValue);
                              // Sync id, name, and title all together
                              idField.onChange(sanitizedValue);
                              form.setValue(
                                `${fieldName}.${index}.name`,
                                sanitizedValue,
                                {
                                  shouldDirty: true,
                                }
                              );
                              form.setValue(
                                `${fieldName}.${index}.title`,
                                sanitizedValue,
                                {
                                  shouldDirty: true,
                                }
                              );
                            }}
                            placeholder="e.g., field_time_scheduled"
                            value={displayValue}
                          />
                          <p
                            className={cn(
                              "text-xs",
                              isInvalid
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {isInvalid
                              ? "Required"
                              : "i18n key (spaces, dots removed)"}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Controller
                    control={form.control}
                    name={`${fieldName}.${index}.dataType`}
                    render={({ field }) => {
                      const isInvalid = !field.value;
                      return (
                        <div className="space-y-2">
                          <Label>Data Type *</Label>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? "text"}
                          >
                            <SelectTrigger
                              className={isInvalid ? "border-destructive" : ""}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLUMN_DATA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <p className="text-destructive text-xs">Required</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Controller
                    control={form.control}
                    name={`${fieldName}.${index}.width`}
                    render={({ field }) => {
                      const isInvalid =
                        field.value === null || field.value === undefined;
                      return (
                        <div className="space-y-2">
                          <Label>Width (px) *</Label>
                          <Input
                            className={isInvalid ? "border-destructive" : ""}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value
                                  ? Number.parseInt(event.target.value, 10)
                                  : null
                              )
                            }
                            type="number"
                            value={field.value ?? ""}
                          />
                          {isInvalid && (
                            <p className="text-destructive text-xs">Required</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                {/* Translation inputs - each on their own row */}
                {(() => {
                  const titleValue =
                    form.watch(`${fieldName}.${index}.title`) ||
                    form.watch(`${fieldName}.${index}.id`) ||
                    "";
                  const i18nKey = titleValue || "";
                  return (
                    <ColumnTranslationInputs
                      fieldName={fieldName}
                      form={form}
                      i18nKey={i18nKey}
                      index={index}
                    />
                  );
                })()}
                {!validation.isValid && (
                  <p className="font-medium text-destructive text-xs">
                    Please fill in all required fields and translations to save.
                  </p>
                )}
              </div>
              <Controller
                control={form.control}
                name={`${fieldName}.${index}.metadata`}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>Metadata</Label>
                    <MetadataEditor
                      onChange={(metadata) => field.onChange(metadata)}
                      value={field.value}
                    />
                  </div>
                )}
              />
            </div>
          );
        })
      )}
      <Button onClick={handleAddColumn} type="button" variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Add Column
      </Button>
    </div>
  );
};

export const ColumnsSection = ({
  form,
  fieldName,
  title,
  description,
  className,
}: ColumnSectionProps) => (
  <Card className={cn("space-y-4 border bg-background/40 p-4", className)}>
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Columns className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {description}
          {form.watch(fieldName).length > 0 && (
            <span className="mt-1 block text-xs">
              Drag to reorder • Order determines grid column position (left to
              right)
            </span>
          )}
        </p>
      </div>
      <span className="text-muted-foreground text-sm">
        {form.watch(fieldName).length} field
        {form.watch(fieldName).length !== 1 ? "s" : ""}
      </span>
    </div>
    <ColumnList fieldName={fieldName} form={form} />
  </Card>
);
