"use client";

import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { Label } from "@ui/label";
import { Eye, Lock, Minimize2, Minus, Plus } from "lucide-react";
import { useEffect } from "react";
import { useSettingsStore } from "@/infrastructure/store/app-store";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";

// Toolbar size constants
const TOOLBAR_SIZE_MIN = 100;
const TOOLBAR_SIZE_MAX = 200;
const TOOLBAR_SIZE_STEP = 25;
const TOOLBAR_SIZE_BASE = 100;

type DocumentsViewSettingsProps = {
  isLocalized?: boolean;
};

export function DocumentsViewSettings({
  isLocalized = false,
}: DocumentsViewSettingsProps) {
  const {
    viewerEnabled,
    setViewerEnabled,
    viewerSplitPaneLocked,
    setViewerSplitPaneLocked,
    editorMinimalMode,
    setEditorMinimalMode,
    editorToolbarSize,
    setEditorToolbarSize,
  } = useSettingsStore();

  // Sync CSS variable when toolbar size changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty(
        "--tldraw-toolbar-scale",
        String(editorToolbarSize / TOOLBAR_SIZE_BASE)
      );
    }
  }, [editorToolbarSize]);

  const handleViewerToggle = (checked: boolean) => {
    setViewerEnabled(checked);
    toastService.success(
      checked
        ? i18n.getMessage("settings_viewer_enabled", isLocalized) ||
            "Viewer enabled"
        : i18n.getMessage("settings_viewer_disabled", isLocalized) ||
            "Viewer disabled"
    );
  };

  const handleLockToggle = (checked: boolean) => {
    setViewerSplitPaneLocked(checked);
    toastService.success(
      checked
        ? i18n.getMessage("settings_viewer_split_locked", isLocalized) ||
            "Split pane locked"
        : i18n.getMessage("settings_viewer_split_unlocked", isLocalized) ||
            "Split pane unlocked"
    );
  };

  const handleMinimalModeToggle = (checked: boolean) => {
    setEditorMinimalMode(checked);
    toastService.success(
      checked
        ? i18n.getMessage("settings_editor_minimal_enabled", isLocalized) ||
            "Minimal mode enabled"
        : i18n.getMessage("settings_editor_minimal_disabled", isLocalized) ||
            "Minimal mode disabled"
    );
  };

  const handleToolbarSizeChange = (value: string) => {
    const numValue = Number(value);
    if (Number.isNaN(numValue)) {
      return;
    }
    // Allow any number while typing
    setEditorToolbarSize(numValue);
  };

  const handleToolbarSizeBlur = () => {
    // Clamp value on blur
    const clampedValue = Math.max(
      TOOLBAR_SIZE_MIN,
      Math.min(TOOLBAR_SIZE_MAX, editorToolbarSize)
    );
    if (clampedValue !== editorToolbarSize) {
      setEditorToolbarSize(clampedValue);
    }
    toastService.success(
      `${i18n.getMessage("settings_toolbar_size_set_prefix", isLocalized) || "Toolbar size set to"} ${clampedValue}%`
    );
  };

  const handleDecreaseToolbarSize = () => {
    if (editorToolbarSize > TOOLBAR_SIZE_MIN) {
      const newValue = Math.max(
        TOOLBAR_SIZE_MIN,
        editorToolbarSize - TOOLBAR_SIZE_STEP
      );
      setEditorToolbarSize(newValue);
      toastService.success(
        `${i18n.getMessage("settings_toolbar_size_set_prefix", isLocalized) || "Toolbar size set to"} ${newValue}%`
      );
    }
  };

  const handleIncreaseToolbarSize = () => {
    if (editorToolbarSize < TOOLBAR_SIZE_MAX) {
      const newValue = Math.min(
        TOOLBAR_SIZE_MAX,
        editorToolbarSize + TOOLBAR_SIZE_STEP
      );
      setEditorToolbarSize(newValue);
      toastService.success(
        `${i18n.getMessage("settings_toolbar_size_set_prefix", isLocalized) || "Toolbar size set to"} ${newValue}%`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Viewer Settings */}
      <div className="space-y-2 rounded-md border bg-background/40 p-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-medium text-[0.8rem] leading-none">
            {i18n.getMessage("settings_view", isLocalized)}
          </span>
        </div>

        {/* Viewer Enable/Disable Setting */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2 font-medium text-sm">
              <Eye className="h-4 w-4" />
              {i18n.getMessage("settings_viewer_enable", isLocalized) ||
                "Enable Viewer"}
            </Label>
            <p className="text-muted-foreground text-xs">
              {i18n.getMessage("settings_viewer_enable_desc", isLocalized) ||
                "Show the top viewer canvas for document preview"}
            </p>
          </div>
          <Switch
            checked={viewerEnabled}
            className="data-[state=checked]:bg-primary"
            onCheckedChange={handleViewerToggle}
          />
        </div>

        {/* Lock Split Pane Setting */}
        {viewerEnabled && (
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 font-medium text-sm">
                <Lock className="h-4 w-4" />
                {i18n.getMessage("settings_viewer_split_lock", isLocalized) ||
                  "Lock Split Pane"}
              </Label>
              <p className="text-muted-foreground text-xs">
                {i18n.getMessage(
                  "settings_viewer_split_lock_desc",
                  isLocalized
                ) || "Prevent the resizable split pane from being moved"}
              </p>
            </div>
            <Switch
              checked={viewerSplitPaneLocked}
              className="data-[state=checked]:bg-primary"
              onCheckedChange={handleLockToggle}
            />
          </div>
        )}
      </div>

      {/* Editor Settings */}
      <div className="space-y-2 rounded-md border bg-background/40 p-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Minimize2 className="h-3.5 w-3.5" />
          <span className="font-medium text-[0.8rem] leading-none">
            {i18n.getMessage("settings_editor", isLocalized) || "Editor"}
          </span>
        </div>

        {/* Minimal Mode Setting */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2 font-medium text-sm">
              <Minimize2 className="h-4 w-4" />
              {i18n.getMessage("settings_editor_minimal_mode", isLocalized) ||
                "Minimal Mode"}
            </Label>
            <p className="text-muted-foreground text-xs">
              {i18n.getMessage(
                "settings_editor_minimal_mode_desc",
                isLocalized
              ) ||
                "Hide advanced styling controls (fill, dash, color picker) in the editor toolbar"}
            </p>
          </div>
          <Switch
            checked={editorMinimalMode}
            className="data-[state=checked]:bg-primary"
            onCheckedChange={handleMinimalModeToggle}
          />
        </div>

        {/* Toolbar Size Setting */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
          <div className="flex-1 space-y-0.5">
            <Label className="flex items-center gap-2 font-medium text-sm">
              <Minimize2 className="h-4 w-4" />
              {i18n.getMessage("settings_editor_toolbar_size", isLocalized) ||
                "Toolbar Size"}
            </Label>
            <p className="text-muted-foreground text-xs">
              {i18n.getMessage(
                "settings_editor_toolbar_size_desc",
                isLocalized
              ) || "Resize the top-left toolbar buttons"}
            </p>
          </div>
          <ButtonGroup>
            <Button
              className="h-8 px-1"
              disabled={editorToolbarSize <= TOOLBAR_SIZE_MIN}
              onClick={handleDecreaseToolbarSize}
              size="sm"
              variant="outline"
            >
              <Minus />
            </Button>
            <div className="relative flex h-8 w-16 items-center rounded-md border border-input bg-background shadow-sm">
              <Input
                className="toolbar-size-input h-8 w-full border-0 bg-transparent px-2 text-center text-sm shadow-none focus-visible:ring-0"
                max={TOOLBAR_SIZE_MAX}
                min={TOOLBAR_SIZE_MIN}
                onBlur={handleToolbarSizeBlur}
                onChange={(e) => handleToolbarSizeChange(e.target.value)}
                style={{
                  MozAppearance: "textfield",
                  paddingRight: "1.5rem",
                }}
                type="number"
                value={editorToolbarSize}
              />
              <span className="pointer-events-none absolute right-2 text-muted-foreground text-sm">
                %
              </span>
            </div>
            <Button
              className="h-8 px-1"
              disabled={editorToolbarSize >= TOOLBAR_SIZE_MAX}
              onClick={handleIncreaseToolbarSize}
              size="sm"
              variant="outline"
            >
              <Plus />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}
