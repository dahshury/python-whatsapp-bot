"use client";

import { Columns, Plus, Trash2 } from "lucide-react";
import { Controller, type UseFormReturn, useFieldArray } from "react-hook-form";
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
import type { AppConfigFormValues } from "../../model";
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

  const handleAddColumn = () => {
    fieldArray.append(createDefaultColumn());
  };

  return (
    <div className="space-y-4">
      {fieldArray.fields.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No columns configured yet.
        </p>
      ) : (
        fieldArray.fields.map((column, index) => (
          <div
            className="space-y-4 rounded-lg border border-border/50 bg-card/50 p-4 shadow-sm"
            key={column.id}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                {form.getValues(`${fieldName}.${index}.title`) ?? column.id}
              </h4>
              <Button
                onClick={() => fieldArray.remove(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Controller
                control={form.control}
                name={`${fieldName}.${index}.id`}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>ID</Label>
                    <Input {...field} />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name={`${fieldName}.${index}.name`}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input {...field} />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name={`${fieldName}.${index}.title`}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input {...field} />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name={`${fieldName}.${index}.dataType`}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>Data Type</Label>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "text"}
                    >
                      <SelectTrigger>
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
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name={`${fieldName}.${index}.width`}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
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
                  </div>
                )}
              />
              <div className="flex items-center gap-4">
                <Controller
                  control={form.control}
                  name={`${fieldName}.${index}.isEditable`}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label className="font-normal text-sm">Editable</Label>
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
                      <Label className="font-normal text-sm">Required</Label>
                    </div>
                  )}
                />
              </div>
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
        ))
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
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <span className="text-muted-foreground text-sm">
        {form.watch(fieldName).length} fields
      </span>
    </div>
    <ColumnList fieldName={fieldName} form={form} />
  </Card>
);
