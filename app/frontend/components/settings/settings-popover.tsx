"use client";

import React from "react";
import { Settings } from "lucide-react";
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
import { useVacation } from "@/lib/vacation-context";
import { SettingsTabs } from "./settings-tabs";
import { cn } from "@/lib/utils";

interface SettingsPopoverProps {
	isLocalized?: boolean;
	activeTab?: string;
	onTabChange?: (value: string) => void;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	isCalendarPage?: boolean;
}

export function SettingsPopover({
	isLocalized = false,
	activeTab,
	onTabChange,
	currentCalendarView,
	activeView,
	onCalendarViewChange,
	isCalendarPage = true,
}: SettingsPopoverProps) {
	const { recordingState, stopRecording } = useVacation();

	// Manage popover and tooltip state to avoid tooltip showing on outside close
	const [open, setOpen] = React.useState(false);
	const [suppressTooltip, setSuppressTooltip] = React.useState(false);

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			setOpen(next);
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
		[recordingState?.periodIndex, recordingState?.field, stopRecording],
	);

	// Button animation is tied to open state (rotate 90deg when open)

	return (
		<DockIcon>
			<Popover
				open={open}
				onOpenChange={handleOpenChange}
				modal={!(recordingState?.periodIndex !== null && recordingState?.field !== null)}
			>
				<Tooltip open={open || suppressTooltip ? false : undefined}>
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
					className="w-auto max-w-[500px] bg-background/70 backdrop-blur-md border-border/40"
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
