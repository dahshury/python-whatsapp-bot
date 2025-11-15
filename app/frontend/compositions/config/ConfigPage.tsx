"use client";

import {
  Calendar,
  Columns,
  Download,
  Globe,
  Save,
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
import { useCalendarColorVariablesPreview } from "@/features/app-config/hooks/useCalendarColorVariablesPreview";
import {
  type AppConfigFormValues,
  type ColumnFormValue,
  createAppConfigFormValues,
  createDefaultAppConfigFormValues,
  mapFormValuesToUpdateInput,
} from "@/features/app-config/model";
import { CalendarDisplaySection } from "@/features/app-config/ui/calendar-display";
import { ColumnsSection } from "@/features/app-config/ui/columns";
import { GeneralSection } from "@/features/app-config/ui/general";
import { ConfigPageShell } from "@/features/app-config/ui/layout";
import { NotificationPreferencesSection } from "@/features/app-config/ui/notifications";
import { WorkingHoursSection } from "@/features/app-config/ui/working-hours";
import { i18n } from "@/shared/libs/i18n";
import { toastService } from "@/shared/libs/toast";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
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

  // Watch form values for real-time color preview
  const eventColors = form.watch("eventColors");
  useCalendarColorVariablesPreview(eventColors);

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
  const dirtyFields = form.formState.dirtyFields;
  const isValid = form.formState.isValid;

  // Watch column values for reactive validation
  const calendarColumns = form.watch("calendarColumns") || [];
  const documentsColumns = form.watch("documentsColumns") || [];
  const availableLanguages = form.watch("availableLanguages") || [];

  // Custom validation function to check columns
  const validateColumns = (): boolean => {
    if (availableLanguages.length === 0) {
      return true; // No languages enabled, skip translation validation
    }

    // Helper to check if translation exists (either in metadata or i18n system)
    const hasTranslation = (column: ColumnFormValue, lang: string): boolean => {
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

    // Validate calendar columns
    for (const column of calendarColumns) {
      // Check required fields
      if (
        !(column.id && column.dataType) ||
        column.width === null ||
        column.width === undefined
      ) {
        return false;
      }

      // Check translations for all available languages
      for (const lang of availableLanguages) {
        if (!hasTranslation(column, lang)) {
          return false;
        }
      }
    }

    // Validate document columns
    for (const column of documentsColumns) {
      // Check required fields
      if (
        !(column.id && column.dataType) ||
        column.width === null ||
        column.width === undefined
      ) {
        return false;
      }

      // Check translations for all available languages
      for (const lang of availableLanguages) {
        if (!hasTranslation(column, lang)) {
          return false;
        }
      }
    }

    return true;
  };

  // Watch calendar values for reactive validation
  const workingDays = form.watch("workingDays") || [];
  const defaultWorkingHours = form.watch("defaultWorkingHours");
  const slotDurationHours = form.watch("slotDurationHours");

  // Custom validation function to check calendar fields
  const validateCalendar = (): boolean => {
    // Check at least one working day is selected
    if (!workingDays || workingDays.length === 0) {
      return false;
    }

    // Check start time and end time are provided
    if (!(defaultWorkingHours?.startTime && defaultWorkingHours?.endTime)) {
      return false;
    }

    // Check slot duration is provided
    if (!slotDurationHours || slotDurationHours <= 0) {
      return false;
    }

    return true;
  };

  // Check if columns are valid (reactive)
  const columnsValid = validateColumns();
  // Check if calendar is valid (reactive)
  const calendarValid = validateCalendar();
  const canSave = isDirty && isValid && columnsValid && calendarValid;

  // Count changes per tab section
  const getCalendarChanges = () => {
    let count = 0;
    if (dirtyFields.workingDays) {
      count += 1;
    }
    if (dirtyFields.defaultWorkingHours) {
      const hours = dirtyFields.defaultWorkingHours;
      if (hours.startTime || hours.endTime) {
        count += 1;
      }
    }
    if (dirtyFields.daySpecificWorkingHours) {
      count += 1;
    }
    if (dirtyFields.slotDurationHours) {
      count += 1;
    }
    if (dirtyFields.daySpecificSlotDurations) {
      count += 1;
    }
    if (dirtyFields.customCalendarRanges) {
      count += 1;
    }
    if (dirtyFields.calendarFirstDay) {
      count += 1;
    }
    if (dirtyFields.eventTimeFormat) {
      const etf = dirtyFields.eventTimeFormat as
        | Record<string, unknown>
        | undefined;
      if (etf) {
        // Count each changed event time format field
        if (etf.format) {
          count += 1;
        }
        if (etf.showMinutes) {
          count += 1;
        }
        if (etf.showMeridiem) {
          count += 1;
        }
      }
    }
    if (dirtyFields.defaultCalendarView) {
      count += 1;
    }
    if (dirtyFields.calendarLocale) {
      count += 1;
    }
    if (dirtyFields.calendarDirection) {
      count += 1;
    }
    if (dirtyFields.eventColors) {
      const ec = dirtyFields.eventColors as Record<string, unknown> | undefined;
      if (ec) {
        // Count each changed event color field
        if (ec.defaultEventColor) {
          count += 1;
        }
        if (ec.eventColorByType) {
          count += 1;
        }
        if (ec.useEventColors) {
          count += 1;
        }
        if (ec.eventColorByStatus) {
          count += 1;
        }
        if (ec.eventColorByPriority) {
          count += 1;
        }
        if (ec.documentStrokeColor) {
          count += 1;
        }
      }
    }
    if (dirtyFields.eventLoading) {
      const el = dirtyFields.eventLoading as
        | Record<string, unknown>
        | undefined;
      if (el) {
        // Count each changed event loading field
        if (el.dayMaxEvents) {
          count += 1;
        }
        if (el.dayMaxEventRows) {
          count += 1;
        }
        if (el.moreLinkClick) {
          count += 1;
        }
      }
    }
    return count;
  };

  const getColumnsChanges = () => {
    let count = 0;
    if (dirtyFields.calendarColumns) {
      count += 1;
    }
    if (dirtyFields.documentsColumns) {
      count += 1;
    }
    return count;
  };

  const getGeneralChanges = () => {
    let count = 0;
    if (dirtyFields.defaultCountryPrefix) {
      count += 1;
    }
    if (dirtyFields.availableLanguages) {
      count += 1;
    }
    if (dirtyFields.timezone) {
      count += 1;
    }
    if (dirtyFields.llmProvider) {
      count += 1;
    }
    // Count notification preference changes individually
    if (dirtyFields.notificationPreferences) {
      const np = dirtyFields.notificationPreferences as
        | Record<string, unknown>
        | undefined;
      if (np) {
        // Count each changed notification preference field
        if (np.notifyOnEventCreate) {
          count += 1;
        }
        if (np.notifyOnEventUpdate) {
          count += 1;
        }
        if (np.notifyOnEventDelete) {
          count += 1;
        }
        if (np.notifyOnEventReminder) {
          count += 1;
        }
        if (np.notificationSound) {
          count += 1;
        }
        if (np.notificationDesktop) {
          count += 1;
        }
        if (np.quietHours) {
          count += 1;
        }
      }
    }
    return count;
  };

  const calendarChanges = getCalendarChanges();
  const columnsChanges = getColumnsChanges();
  const generalChanges = getGeneralChanges();

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
        <form className="w-full" onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-3xl tracking-tight">
                  App Configuration
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
                ref={fileInputRef}
                type="file"
              />
              <ButtonGroup>
                <Button
                  disabled={!data}
                  onClick={handleExport}
                  type="button"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={handleImportTrigger}
                  type="button"
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button
                  disabled={!canSave || isSaving}
                  type="submit"
                  variant="outline"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </ButtonGroup>
            </div>
          </div>

          <div className="h-10" />

          <div>
            <Tabs
              className="flex w-full flex-row gap-3"
              defaultValue="calendar"
            >
              <div className="sticky top-0 self-start">
                <TabsList className="flex h-auto flex-col">
                  <TabsTrigger
                    className="w-full justify-start"
                    value="calendar"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendar
                    {calendarChanges > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {calendarChanges}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger className="w-full justify-start" value="columns">
                    <Columns className="mr-2 h-4 w-4" />
                    Columns
                    {columnsChanges > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {columnsChanges}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger className="w-full justify-start" value="general">
                    <Globe className="mr-2 h-4 w-4" />
                    General
                    {generalChanges > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {generalChanges}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1">
                <TabsContent className="mt-0" value="calendar">
                  <Tabs className="space-y-4" defaultValue="working-hours">
                    <TabsList>
                      <TabsTrigger value="working-hours">
                        Working Hours
                      </TabsTrigger>
                      <TabsTrigger value="display">Display</TabsTrigger>
                    </TabsList>
                    <TabsContent value="working-hours">
                      <WorkingHoursSection form={form} />
                    </TabsContent>
                    <TabsContent value="display">
                      <CalendarDisplaySection form={form} />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent className="mt-0" value="columns">
                  <Tabs className="space-y-4" defaultValue="calendar-columns">
                    <TabsList>
                      <TabsTrigger value="calendar-columns">
                        Calendar
                      </TabsTrigger>
                      <TabsTrigger value="documents-columns">
                        Documents
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="calendar-columns">
                      <ColumnsSection
                        description="Columns shown on the calendar/data table page"
                        fieldName="calendarColumns"
                        form={form}
                        title="Calendar Columns"
                      />
                    </TabsContent>
                    <TabsContent value="documents-columns">
                      <ColumnsSection
                        description="Columns shown on the documents page"
                        fieldName="documentsColumns"
                        form={form}
                        title="Documents Columns"
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent className="mt-0" value="general">
                  <div className="space-y-6">
                    <GeneralSection form={form} />
                    <NotificationPreferencesSection form={form} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </form>
      ) : null}
    </ConfigPageShell>
  );
};
