"use client";

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
	const { recordingState } = useVacation();
	const _isRecording = recordingState.periodIndex !== null;

	return (
		<DockIcon>
			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<StablePopoverButton
								variant="ghost"
								size="icon"
								className="size-9 rounded-full"
								aria-label={isLocalized ? "الإعدادات" : "Settings"}
							>
								<Settings className="size-4" />
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
				>
					<SettingsTabs
						isLocalized={isLocalized}
						activeTab={activeTab}
						onTabChange={onTabChange}
						currentCalendarView={currentCalendarView}
						activeView={activeView}
						onCalendarViewChange={onCalendarViewChange}
						isCalendarPage={isCalendarPage}
					/>
				</PopoverContent>
			</Popover>
		</DockIcon>
	);
}
