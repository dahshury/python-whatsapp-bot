"use client";

import { i18n } from "@shared/libs/i18n";
import { useSettings } from "@shared/libs/state/settings-context";
import { toastService } from "@shared/libs/toast/toast-service";
import { Label } from "@ui/label";
import { Eye, MessageCircle, Wrench } from "lucide-react";
import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { getCalendarViewOptions } from "@/widgets/calendar/calendar-toolbar";
import { ViewModeToolbar } from "./view-mode-toolbar";

type ViewSettingsProps = {
	isLocalized?: boolean;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	hideChatSettings?: boolean;
	/** Hide free roam / dual / default selector toolbar */
	hideViewModeToolbar?: boolean;
};

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
	const idPrefix = useId();
	const toolCallsCardId = `${idPrefix}-card-show-tool-calls`;
	const typingCardId = `${idPrefix}-card-send-typing`;

	const handleToolCallsToggle = (checked: boolean) => {
		setShowToolCalls(checked);
		toastService.success(
			checked
				? i18n.getMessage("settings_tool_calls_on", isLocalized)
				: i18n.getMessage("settings_tool_calls_off", isLocalized)
		);
	};

	const handleMessageLimitChange = (value: string) => {
		const numValue = Number(value);
		setChatMessageLimit(numValue);
		toastService.success(
			`${i18n.getMessage("settings_message_limit_set_prefix", isLocalized)} ${numValue}`
		);
	};

	const handleTypingToggle = (checked: boolean) => {
		setSendTypingIndicator(checked);
		toastService.success(
			checked
				? i18n.getMessage("settings_send_typing_on", isLocalized)
				: i18n.getMessage("settings_send_typing_off", isLocalized)
		);
	};

	// Helper function to handle view change
	const handleViewChange = (view: string) => {
		onCalendarViewChange?.(view);
	};

	return (
		<div className="space-y-4">
			{/* Calendar View Settings + Chat Settings unified container */}
			<div className="space-y-2 rounded-md border bg-background/40 p-2 backdrop-blur-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Eye className="h-3.5 w-3.5" />
						<span className="font-medium text-[0.8rem] leading-none">
							{i18n.getMessage("settings_view", isLocalized)}
						</span>
					</div>

					{!hideViewModeToolbar && <ViewModeToolbar />}
				</div>

				<RadioGroup
					className="grid grid-cols-2 gap-2 sm:grid-cols-4"
					onValueChange={handleViewChange}
					value={activeView || currentCalendarView}
				>
					{viewOptions.map((option) => {
						const itemId = `${idPrefix}-${option.value}`;
						return (
							<div
								className="relative flex flex-col gap-3 rounded-md border border-input p-3 shadow-xs outline-none [&:has([data-state=checked])]:border-primary/60"
								key={option.value}
							>
								<div className="flex justify-between gap-2">
									<RadioGroupItem
										className="order-1 after:absolute after:inset-0"
										id={itemId}
										value={option.value}
									/>
									<option.icon
										aria-hidden="true"
										className="opacity-70"
										size={16}
									/>
								</div>
								<Label className="text-[0.82rem] leading-none" htmlFor={itemId}>
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
								<span className="font-medium text-sm">
									{i18n.getMessage("settings_chat", isLocalized)}
								</span>
							</div>

							{/* Tool Calls Display Setting - settings card */}
							<div className="flex items-start gap-3 rounded-lg border bg-background/40 p-4 backdrop-blur-sm">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
									<Wrench className="h-5 w-5 text-background" />
								</div>
								<div className="flex flex-1 flex-col gap-1">
									<div className="flex items-center justify-between gap-4">
										<Label
											className="font-medium text-sm"
											htmlFor={toolCallsCardId}
										>
											{i18n.getMessage("settings_show_tool_calls", isLocalized)}
										</Label>
										<Switch
											checked={showToolCalls}
											id={toolCallsCardId}
											onCheckedChange={handleToolCallsToggle}
										/>
									</div>
									<p className="text-muted-foreground text-sm">
										{i18n.getMessage("settings_tool_calls_hint", isLocalized)}
									</p>
								</div>
							</div>

							{/* Typing Indicator Setting - settings card */}
							<div className="flex items-start gap-3 rounded-lg border bg-background/40 p-4 backdrop-blur-sm">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
									<MessageCircle className="h-5 w-5 text-background" />
								</div>
								<div className="flex flex-1 flex-col gap-1">
									<div className="flex items-center justify-between gap-4">
										<Label
											className="font-medium text-sm"
											htmlFor={typingCardId}
										>
											{i18n.getMessage("settings_send_typing", isLocalized)}
										</Label>
										<Switch
											checked={sendTypingIndicator}
											id={typingCardId}
											onCheckedChange={handleTypingToggle}
										/>
									</div>
									<p className="text-muted-foreground text-sm">
										{i18n.getMessage("settings_send_typing_on", isLocalized)}
									</p>
								</div>
							</div>

							{/* Chat Message Limit Setting */}
							<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
								<div className="flex-1 space-y-0.5">
									<Label className="flex items-center gap-2 font-medium text-sm">
										<MessageCircle className="h-4 w-4" />
										{i18n.getMessage(
											"settings_message_load_limit",
											isLocalized
										)}
									</Label>
									<p className="text-muted-foreground text-xs">
										{i18n.getMessage(
											"settings_message_load_limit_desc",
											isLocalized
										)}
									</p>
								</div>
								<Select
									onValueChange={handleMessageLimitChange}
									value={String(chatMessageLimit)}
								>
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
