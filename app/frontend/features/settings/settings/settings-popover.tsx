"use client";

import { i18n } from "@shared/libs/i18n";
import { useVacation } from "@shared/libs/state/vacation-context";
import { cn } from "@shared/libs/utils";
import { Settings } from "lucide-react";
import React from "react";
import { DockIcon } from "@/shared/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { StablePopoverButton } from "@/shared/ui/stable-popover-button";
import { SettingsTabs } from "./settings-tabs";

// No-op function for empty handlers
function noop(): void {
	// Handler managed by parent component
}

type SettingsPopoverProps = {
	isLocalized?: boolean;
	activeTab?: string;
	onTabChange?: (value: string) => void;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	isCalendarPage?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	customViewSelector?: React.ReactElement;
	allowedTabs?: ReadonlyArray<"view" | "general" | "vacation">;
	/** Hide free roam / dual calendar / default selector toolbar */
	hideViewModeToolbar?: boolean;
};

export function SettingsPopover({
	isLocalized = false,
	activeTab,
	onTabChange,
	currentCalendarView,
	activeView,
	onCalendarViewChange,
	isCalendarPage = true,
	open: controlledOpen,
	onOpenChange,
	customViewSelector,
	allowedTabs,
	hideViewModeToolbar,
}: SettingsPopoverProps) {
	const { recordingState, stopRecording } = useVacation();

	// Manage popover state to avoid tooltip showing on outside close
	const [internalOpen, setInternalOpen] = React.useState(false);
	const suppressTimerRef = React.useRef<number | null>(null);

	const isControlled = typeof controlledOpen === "boolean";
	const open = isControlled ? (controlledOpen as boolean) : internalOpen;

	// Helper to check if currently recording
	const isRecording = React.useCallback(
		(): boolean =>
			recordingState?.periodIndex !== null && recordingState?.field !== null,
		[recordingState?.periodIndex, recordingState?.field]
	);

	// Helper to stop recording if active
	const handleStopRecording = React.useCallback((): void => {
		try {
			if (isRecording()) {
				stopRecording();
			}
		} catch {
			// Recording stop may fail in some contexts
		}
	}, [isRecording, stopRecording]);

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			const currentOpen = isControlled
				? (controlledOpen as boolean)
				: internalOpen;
			if (next === currentOpen) {
				return;
			}
			if (isControlled) {
				onOpenChange?.(next);
			} else {
				setInternalOpen(next);
			}
			if (!next) {
				// If closing while recording, stop and reset recording
				handleStopRecording();
				if (suppressTimerRef.current) {
					window.clearTimeout(suppressTimerRef.current);
					suppressTimerRef.current = null;
				}
			}
		},
		[
			isControlled,
			controlledOpen,
			internalOpen,
			onOpenChange,
			handleStopRecording,
		]
	);

	// Button animation is tied to open state (rotate 90deg when open)

	return (
		<DockIcon>
			<Popover
				modal={
					!(
						recordingState?.periodIndex !== null &&
						recordingState?.field !== null
					)
				}
				onOpenChange={handleOpenChange}
				open={open}
			>
				<PopoverTrigger asChild>
					<StablePopoverButton
						aria-label={i18n.getMessage("settings", isLocalized)}
						className="size-9 rounded-full transition-colors duration-300 ease-out"
						variant={open ? "default" : "ghost"}
					>
						<Settings
							className={cn(
								"size-4 transform transition-transform duration-300 ease-out",
								open ? "rotate-90" : "rotate-0"
							)}
						/>
					</StablePopoverButton>
				</PopoverTrigger>

				<PopoverContent
					align="center"
					className="w-auto max-w-[31.25rem] border-border/40 bg-background/70 backdrop-blur-md"
					onInteractOutside={(e) => {
						try {
							// While actively recording, do not close the popover on any outside interaction
							const recordingActive =
								recordingState?.periodIndex !== null &&
								recordingState?.field !== null;
							if (recordingActive) {
								e.preventDefault();
							}
						} catch {
							// Popover interaction handling may fail in some contexts
						}
					}}
				>
					<SettingsTabs
						activeTab={activeTab ?? "view"}
						activeView={activeView ?? currentCalendarView ?? "timeGridWeek"}
						currentCalendarView={currentCalendarView ?? "timeGridWeek"}
						isCalendarPage={isCalendarPage}
						isLocalized={isLocalized}
						onCalendarViewChange={onCalendarViewChange ?? noop}
						onTabChange={onTabChange ?? noop}
						{...(allowedTabs ? { allowedTabs } : {})}
						{...(customViewSelector ? { customViewSelector } : {})}
						{...(typeof hideViewModeToolbar === "boolean"
							? { hideViewModeToolbar }
							: {})}
					/>
				</PopoverContent>
			</Popover>
		</DockIcon>
	);
}
