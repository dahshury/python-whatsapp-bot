"use client";

import { Eye, MessageCircle, Wrench } from "lucide-react";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/lib/settings-context";
import { toastService } from "@/lib/toast-service";
import { ViewModeToolbar } from "./view-mode-toolbar";

interface ViewSettingsProps {
	isLocalized?: boolean;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
}

export function ViewSettings({
	isLocalized = false,
	currentCalendarView = "timeGridWeek",
	activeView,
	onCalendarViewChange,
}: ViewSettingsProps) {
	const {
		showToolCalls,
		setShowToolCalls,
		chatMessageLimit,
		setChatMessageLimit,
	} = useSettings();

	const viewOptions = getCalendarViewOptions(isLocalized);

	const handleToolCallsToggle = (checked: boolean) => {
		setShowToolCalls(checked);
		toastService.success(
			checked
				? isLocalized
					? "سيتم عرض أدوات الاستدعاء في الدردشة"
					: "Tool calls will be shown in chat"
				: isLocalized
					? "سيتم إخفاء أدوات الاستدعاء من الدردشة"
					: "Tool calls will be hidden from chat",
		);
	};

	const handleMessageLimitChange = (value: string) => {
		const numValue = Number(value);
		setChatMessageLimit(numValue);
		toastService.success(
			isLocalized
				? `تم تعيين حد الرسائل إلى ${numValue}`
				: `Message limit set to ${numValue}`,
		);
	};

	return (
		<div className="space-y-4">
			{/* Calendar View Settings + Chat Settings unified container */}
			<div className="space-y-3 rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Eye className="h-4 w-4" />
						<span className="text-sm font-medium">
							{isLocalized ? "إعدادات العرض" : "View Settings"}
						</span>
					</div>

					<ViewModeToolbar />
				</div>

				<RadioGroup
					value={activeView || currentCalendarView}
					onValueChange={onCalendarViewChange ?? (() => {})}
					className="grid grid-cols-4 gap-2"
				>
					{viewOptions.map((option) => (
						<div key={option.value}>
							<RadioGroupItem
								value={option.value}
								id={`calendar-view-${option.value}`}
								className="peer sr-only"
							/>
							<Label
								htmlFor={`calendar-view-${option.value}`}
								className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
							>
								<option.icon className="mb-1 h-3.5 w-3.5" />
								{option.label}
							</Label>
						</div>
					))}
				</RadioGroup>
				<hr className="border-border/70" />

				{/* Chat Settings Section */}
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<MessageCircle className="h-4 w-4" />
						<span className="text-sm font-medium">
							{isLocalized ? "إعدادات الدردشة" : "Chat Settings"}
						</span>
					</div>

					{/* Tool Calls Display Setting */}
					<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
						<div className="space-y-0.5">
							<Label className="text-sm font-medium flex items-center gap-2">
								<Wrench className="h-4 w-4" />
								{isLocalized ? "عرض أدوات الاستدعاء" : "Show Tool Calls"}
							</Label>
							<p className="text-xs text-muted-foreground">
								{isLocalized
									? "إظهار/إخفاء أدوات الاستدعاء في الدردشة"
									: "Show/hide tool calls in chat messages"}
							</p>
						</div>
						<Switch
							checked={showToolCalls}
							onCheckedChange={handleToolCallsToggle}
							className="data-[state=checked]:bg-primary"
						/>
					</div>

					{/* Chat Message Limit Setting */}
					<div className="flex items-center justify-between rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
						<div className="space-y-0.5 flex-1">
							<Label className="text-sm font-medium flex items-center gap-2">
								<MessageCircle className="h-4 w-4" />
								{isLocalized ? "حد الرسائل المحملة" : "Message Load Limit"}
							</Label>
							<p className="text-xs text-muted-foreground">
								{isLocalized
									? "عدد الرسائل التي يتم تحميلها افتراضيًا"
									: "Number of messages to load by default"}
							</p>
						</div>
						<Select
							value={String(chatMessageLimit)}
							onValueChange={handleMessageLimitChange}
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
				{/* End unified container */}
			</div>
		</div>
	);
}
