"use client";

import {
  Calendar,
  Columns,
  Download,
  Globe,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  type AppConfigDto,
  AppConfigFactory,
  AppConfigMapper,
  type AppConfigSnapshot,
} from "@/entities/app-config";
import {
  useAppConfigQuery,
  useConfigLiveSync,
  useUpdateAppConfig,
} from "@/features/app-config";
import {
  type AppConfigFormValues,
  createAppConfigFormValues,
  createDefaultAppConfigFormValues,
  mapFormValuesToUpdateInput,
} from "@/features/app-config/model";
import { ColumnsSection } from "@/features/app-config/ui/columns";
import { GeneralSection } from "@/features/app-config/ui/general";
import { ConfigPageShell } from "@/features/app-config/ui/layout";
import { WorkingHoursSection } from "@/features/app-config/ui/working-hours";
import { toastService } from "@/shared/libs/toast";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export const ConfigPage = () => {
  const { data, isLoading, isError, refetch } = useAppConfigQuery();
  const updateConfig = useUpdateAppConfig();
  useConfigLiveSync();
  const cleanedVersionRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<AppConfigFormValues>({
    defaultValues: createDefaultAppConfigFormValues(),
    mode: "onChange",
  });

  useEffect(() => {
    if (data) {
      form.reset(createAppConfigFormValues(data));
    }
  }, [data, form]);

  useEffect(() => {
    if (!data || updateConfig.isPending) {
      return;
    }

    const expiredRanges = data.expiredCustomRanges ?? [];
    if (expiredRanges.length === 0) {
      return;
    }

    const snapshot = data.toSnapshot();
    if (cleanedVersionRef.current === snapshot.updatedAt) {
      return;
    }

    cleanedVersionRef.current = snapshot.updatedAt;
    const sanitizedValues = createAppConfigFormValues(data);

    updateConfig
      .mutateAsync(mapFormValuesToUpdateInput(sanitizedValues))
      .then(() => {
        const rangeLabel =
          expiredRanges.length === 1
            ? "1 expired custom range was removed automatically"
            : `${expiredRanges.length} expired custom ranges were removed automatically`;
        toastService.info(rangeLabel);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        toastService.error(
          `Failed to auto-clean expired custom ranges: ${message}`
        );
      });
  }, [data, updateConfig]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateConfig.mutateAsync(
        mapFormValuesToUpdateInput(values)
      );
      form.reset(createAppConfigFormValues(updated));
      toastService.success("Configuration saved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      toastService.error(`Failed to save configuration: ${message}`);
    }
  });

  const isSaving = updateConfig.isPending;
  const isDirty = form.formState.isDirty;

  const handleExport = () => {
    if (!data) {
      toastService.error("Nothing to export yet");
      return;
    }
    try {
      const dto = AppConfigMapper.toDto(data);
      const blob = new Blob([JSON.stringify(dto, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `app-config-${new Date()
        .toISOString()
        .replace(/[:]/g, "-")}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toastService.success("Configuration exported");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      toastService.error(`Failed to export configuration: ${message}`);
    }
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const normalizeImportedConfig = (raw: unknown): AppConfigDto => {
    if (raw && typeof raw === "object") {
      if ("working_days" in (raw as Record<string, unknown>)) {
        // Already a DTO
        return raw as AppConfigDto;
      }
      if ("workingDays" in (raw as Record<string, unknown>)) {
        // Snapshot format - convert to domain then to DTO
        const domain = AppConfigFactory.create(raw as AppConfigSnapshot);
        return AppConfigMapper.toDto(domain);
      }
    }
    throw new Error(
      "Unsupported config format. Please use a JSON file exported from this page."
    );
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const dto = normalizeImportedConfig(parsed);
      // Update config with imported data
      const updated = await updateConfig.mutateAsync(
        AppConfigMapper.toUpdateDto(AppConfigMapper.toDomain(dto).toSnapshot())
      );
      form.reset(createAppConfigFormValues(updated));
      cleanedVersionRef.current = null;
      toastService.success("Configuration imported successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid configuration file";
      toastService.error(`Failed to import configuration: ${message}`);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <ConfigPageShell
      isError={isError}
      isLoading={isLoading && !data}
      onRetry={refetch}
    >
      {data ? (
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-3xl tracking-tight">
                  App Configuration
                </h1>
              </div>
              <p className="text-muted-foreground">
                Manage working hours, columns, languages, and other defaults
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
                ref={fileInputRef}
                type="file"
              />
              <Button
                disabled={!data}
                onClick={handleExport}
                type="button"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button
                disabled={isSaving}
                onClick={handleImportTrigger}
                type="button"
                variant="outline"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </Button>
              <Button
                className="shrink-0"
                disabled={!isDirty || isSaving}
                size="lg"
                type="submit"
              >
                <Settings className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          <Tabs className="space-y-4" defaultValue="calendar">
            <TabsList>
              <TabsTrigger value="calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="columns">
                <Columns className="mr-2 h-4 w-4" />
                Columns
              </TabsTrigger>
              <TabsTrigger value="general">
                <Globe className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <WorkingHoursSection form={form} />
            </TabsContent>

            <TabsContent value="columns">
              <div className="space-y-4">
                <ColumnsSection
                  description="Columns shown on the calendar/data table page"
                  fieldName="calendarColumns"
                  form={form}
                  title="Calendar Columns"
                />
                <ColumnsSection
                  description="Columns shown on the documents page"
                  fieldName="documentsColumns"
                  form={form}
                  title="Documents Columns"
                />
              </div>
            </TabsContent>

            <TabsContent value="general">
              <GeneralSection form={form} />
            </TabsContent>
          </Tabs>
        </form>
      ) : null}
    </ConfigPageShell>
  );
};
