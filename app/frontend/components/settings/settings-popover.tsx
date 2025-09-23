"use client";

import { Settings } from "lucide-react";
import React from "react";
import { DockIcon } from "@/components/ui/dock";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { StablePopoverButton } from "@/components/ui/stable-popover-button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useVacation } from "@/lib/vacation-context";
import { SettingsTabs } from "./settings-tabs";

interface SettingsPopoverProps {
	isLocalized?: boolean;
	activeTab?: string;
	onTabChange?: (value: string) => void;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	isCalendarPage?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

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
}: SettingsPopoverProps) {
	const { recordingState, stopRecording } = useVacation();

	// Manage popover and tooltip state to avoid tooltip showing on outside close
	const [internalOpen, setInternalOpen] = React.useState(false);
	const [suppressTooltip, setSuppressTooltip] = React.useState(false);

	const isControlled = typeof controlledOpen === "boolean";
	const open = isControlled ? (controlledOpen as boolean) : internalOpen;

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			if (isControlled) {
				onOpenChange?.(next);
			} else {
				setInternalOpen(next);
			}
			if (!next) {
				// If closing while recording, stop and reset recording
				try {
					if (
						recordingState?.periodIndex !== null &&
						recordingState?.field !== null
					) {
						stopRecording();
					}
				} catch {}
				setSuppressTooltip(true);
				window.setTimeout(() => setSuppressTooltip(false), 300);
			}
		},
		[
			isControlled,
			onOpenChange,
			recordingState?.periodIndex,
			recordingState?.field,
			stopRecording,
		],
	);

	// Button animation is tied to open state (rotate 90deg when open)

	return (
		<DockIcon>
			<Popover
				open={open}
				onOpenChange={handleOpenChange}
				modal={
					!(
						recordingState?.periodIndex !== null &&
						recordingState?.field !== null
					)
				}
			>
				<Tooltip {...(open || suppressTooltip ? { open: false } : {})}>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<StablePopoverButton
								className="size-9 rounded-full transition-colors duration-300 ease-out"
								aria-label={isLocalized ? "الإعدادات" : "Settings"}
								variant={open ? "default" : "ghost"}
							>
								<Settings
									className={cn(
										"size-4 transform transition-transform duration-300 ease-out",
										open ? "rotate-90" : "rotate-0",
									)}
								/>
							</StablePopoverButton>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>
						<p>{isLocalized ? "الإعدادات" : "Settings"}</p>
					</TooltipContent>
				</Tooltip>

				<PopoverContent
					align="center"
					className="w-auto max-w-[31.25rem] bg-background/70 backdrop-blur-md border-border/40"
					onInteractOutside={(e) => {
						try {
							// While actively recording, do not close the popover on any outside interaction
							const isRecording =
								recordingState?.periodIndex !== null &&
								recordingState?.field !== null;
							if (isRecording) {
								e.preventDefault();
							}
						} catch {}
					}}
				>
					<SettingsTabs
						isLocalized={isLocalized}
						activeTab={activeTab ?? "view"}
						onTabChange={onTabChange ?? (() => {})}
						currentCalendarView={currentCalendarView ?? "multiMonthYear"}
						activeView={activeView ?? currentCalendarView ?? "multiMonthYear"}
						onCalendarViewChange={onCalendarViewChange ?? (() => {})}
						isCalendarPage={isCalendarPage}
					/>
				</PopoverContent>
			</Popover>
		</DockIcon>
	);
}
