"use client";

import { i18n } from "@shared/libs/i18n";
import { useSettings } from "@shared/libs/state/settings-context";
import { toastService } from "@shared/libs/toast";
import { Label } from "@ui/label";
import { Eye, MessageCircle, Wrench } from "lucide-react";
import * as React from "react";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { getCalendarViewOptions } from "@/widgets/calendar/CalendarToolbar";
import { ViewModeToolbar } from "./view-mode-toolbar";

interface ViewSettingsProps {
	isLocalized?: boolean;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	hideChatSettings?: boolean;
	/** Hide free roam / dual / default selector toolbar */
	hideViewModeToolbar?: boolean;
}

export function ViewSettings({
	isLocalized = false,
	currentCalendarView = "timeGridWeek",
	activeView,
	onCalendarViewChange,
	hideChatSettings = false,
	hideViewModeToolbar = false,
}: ViewSettingsProps) {
	const {
		showToolCalls,
		setShowToolCalls,
		chatMessageLimit,
		setChatMessageLimit,
		sendTypingIndicator,
		setSendTypingIndicator,
	} = useSettings();

	const viewOptions = getCalendarViewOptions(isLocalized);
	const idPrefix = React.useId();

	const handleToolCallsToggle = (checked: boolean) => {
		setShowToolCalls(checked);
		toastService.success(
			checked
				? i18n.getMessage("settings_send_typing_on", isLocalized)
				: i18n.getMessage("settings_send_typing_off", isLocalized)
		);
	};

	const handleMessageLimitChange = (value: string) => {
		const numValue = Number(value);
		setChatMessageLimit(numValue);
		toastService.success(`${i18n.getMessage("settings_message_limit_set_prefix", isLocalized)} ${numValue}`);
	};

	const handleTypingToggle = (checked: boolean) => {
		setSendTypingIndicator(checked);
		toastService.success(
			checked
				? i18n.getMessage("settings_send_typing_on", isLocalized)
				: i18n.getMessage("settings_send_typing_off", isLocalized)
		);
	};

	return (
		<div className="space-y-4">
			{/* Calendar View Settings + Chat Settings unified container */}
			<div className="space-y-2 rounded-md border p-2 bg-background/40 backdrop-blur-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Eye className="h-3.5 w-3.5" />
						<span className="text-[0.8rem] font-medium leading-none">
							{i18n.getMessage("settings_view", isLocalized)}
						</span>
					</div>

					{!hideViewModeToolbar && <ViewModeToolbar />}
				</div>

				<RadioGroup
					value={activeView || currentCalendarView}
					onValueChange={onCalendarViewChange ?? (() => {})}
					className="grid grid-cols-2 sm:grid-cols-4 gap-2"
				>
					{viewOptions.map((option) => {
						const itemId = `${idPrefix}-${option.value}`;
						return (
							<div
								key={option.value}
								className="border-input [&:has([data-state=checked])]:border-primary/60 relative flex flex-col gap-3 rounded-md border p-3 shadow-xs outline-none"
							>
								<div className="flex justify-between gap-2">
									<RadioGroupItem id={itemId} value={option.value} className="order-1 after:absolute after:inset-0" />
									<option.icon className="opacity-70" size={16} aria-hidden="true" />
								</div>
								<Label htmlFor={itemId} className="text-[0.82rem] leading-none">
									{option.label}
								</Label>
							</div>
						);
					})}
				</RadioGroup>
				{!hideChatSettings && (
					<>
						<hr className="border-border/70" />
						{/* Chat Settings Section */}
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<MessageCircle className="h-4 w-4" />
								<span className="text-sm font-medium">{i18n.getMessage("settings_chat", isLocalized)}</span>
							</div>

							{/* Tool Calls Display Setting */}
							<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
								<div className="space-y-0.5">
									<Label className="text-sm font-medium flex items-center gap-2">
										<Wrench className="h-4 w-4" />
										{i18n.getMessage("settings_show_tool_calls", isLocalized)}
									</Label>
									<p className="text-xs text-muted-foreground">
										{i18n.getMessage("settings_tool_calls_hint", isLocalized)}
									</p>
								</div>
								<Switch
									checked={showToolCalls}
									onCheckedChange={handleToolCallsToggle}
									className="data-[state=checked]:bg-primary"
								/>
							</div>

							{/* Typing Indicator Setting */}
							<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
								<div className="space-y-0.5">
									<Label className="text-sm font-medium flex items-center gap-2">
										<MessageCircle className="h-4 w-4" />
										{i18n.getMessage("settings_send_typing", isLocalized)}
									</Label>
									<p className="text-xs text-muted-foreground">
										{i18n.getMessage("settings_send_typing_on", isLocalized)}
									</p>
								</div>
								<Switch
									checked={sendTypingIndicator}
									onCheckedChange={handleTypingToggle}
									className="data-[state=checked]:bg-primary"
								/>
							</div>

							{/* Chat Message Limit Setting */}
							<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
								<div className="space-y-0.5 flex-1">
									<Label className="text-sm font-medium flex items-center gap-2">
										<MessageCircle className="h-4 w-4" />
										{i18n.getMessage("settings_message_load_limit", isLocalized)}
									</Label>
									<p className="text-xs text-muted-foreground">
										{i18n.getMessage("settings_message_load_limit_desc", isLocalized)}
									</p>
								</div>
								<Select value={String(chatMessageLimit)} onValueChange={handleMessageLimitChange}>
									<SelectTrigger className="w-24">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="20">20</SelectItem>
										<SelectItem value="50">50</SelectItem>
										<SelectItem value="100">100</SelectItem>
										<SelectItem value="200">200</SelectItem>
										<SelectItem value="500">500</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</>
				)}
				{/* End unified container */}
			</div>
		</div>
	);
}
