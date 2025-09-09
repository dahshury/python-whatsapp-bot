"use client";

import {
	CalendarDays,
	Circle,
	Plane,
	Plus,
	Trash2,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useVacation } from "@/lib/vacation-context";

interface VacationPeriodRowProps {
	index: number;
	startText: string;
	endText: string;
	isLocalized: boolean;
	isRecordingStart: boolean;
	isRecordingEnd: boolean;
	daysCount: number;
	onStartRecord: () => void;
	onEndRecord: () => void;
	onStopRecord: () => void;
	onRemove: () => void;
	onAdd: () => void; // new prop to add a new period
}

const VacationPeriodRow = React.memo(function VacationPeriodRow({
	index,
	startText,
	endText,
	isLocalized,
	isRecordingStart,
	isRecordingEnd,
	daysCount,
	onStartRecord,
	onEndRecord,
	onStopRecord,
	onRemove,
	onAdd,
}: VacationPeriodRowProps) {
	return (
		<div
			key={`vacation-period-${index}`}
			className="relative border rounded-md p-2"
		>
			<div className="flex items-center justify-between mb-2">
				<Badge variant="secondary" className="text-xs">
					{isLocalized ? `فترة ${index + 1}` : `Period ${index + 1}`}
				</Badge>
				<div className="flex items-center">
					<Badge variant="outline" className="text-xs mr-2">
						<CalendarDays className="h-3 w-3 mr-1" />
						{daysCount} {isLocalized ? "أيام" : "days"}
					</Badge>
					{/* Add button inline only on first row to save space */}
					{index === 0 && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 mr-1"
							onClick={onAdd}
							aria-label={isLocalized ? "إضافة إجازة" : "Add vacation"}
						>
							<Plus className="h-4 w-4" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={onRemove}
						aria-label={isLocalized ? "حذف الفترة" : "Remove period"}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				{/* Start Date */}
				<div
					className={`relative flex items-center justify-between border rounded-md p-2 ${isRecordingStart ? "ring-2 ring-red-500/40" : ""}`}
				>
					{/* Recording overlay */}
					{isRecordingStart && (
						<span className="absolute right-2 top-1 text-[10px] font-medium text-red-600 animate-pulse select-none">
							{isLocalized ? "تسجيل" : "Recording"}
						</span>
					)}
					<div className="flex-1">
						<p className="text-xs text-muted-foreground">
							{isLocalized ? "البداية" : "Start"}
						</p>
						<p className="text-sm font-medium">{startText}</p>
					</div>
					<div className="flex items-center gap-1">
						{isRecordingStart ? (
							<Button
								variant="secondary"
								size="icon"
								className="h-7 w-7"
								onClick={onStopRecord}
								aria-label={isLocalized ? "إيقاف التسجيل" : "Stop recording"}
							>
								<Circle className="h-3.5 w-3.5 text-red-500" />
							</Button>
						) : (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={onStartRecord}
								aria-label={isLocalized ? "بدء تسجيل البداية" : "Record start"}
							>
								<Circle className="h-4 w-4 text-red-500" />
							</Button>
						)}
					</div>
				</div>

				{/* End Date */}
				<div
					className={`relative flex items-center justify-between border rounded-md p-2 ${isRecordingEnd ? "ring-2 ring-red-500/40" : ""}`}
				>
					{/* Recording overlay */}
					{isRecordingEnd && (
						<span className="absolute right-2 top-1 text-[10px] font-medium text-red-600 animate-pulse select-none">
							{isLocalized ? "تسجيل" : "Recording"}
						</span>
					)}
					<div className="flex-1">
						<p className="text-xs text-muted-foreground">
							{isLocalized ? "النهاية" : "End"}
						</p>
						<p className="text-sm font-medium">{endText}</p>
					</div>
					<div className="flex items-center gap-1">
						{isRecordingEnd ? (
							<Button
								variant="secondary"
								size="icon"
								className="h-7 w-7"
								onClick={onStopRecord}
								aria-label={isLocalized ? "إيقاف التسجيل" : "Stop recording"}
							>
								<Circle className="h-3.5 w-3.5 text-red-500" />
							</Button>
						) : (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={onEndRecord}
								aria-label={isLocalized ? "بدء تسجيل النهاية" : "Record end"}
							>
								<Circle className="h-4 w-4 text-red-500" />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}, (prev, next) => {
	// Custom memo comparator: only re-render when visible bits change
	return (
		prev.startText === next.startText &&
		prev.endText === next.endText &&
		prev.isRecordingStart === next.isRecordingStart &&
		prev.isRecordingEnd === next.isRecordingEnd &&
		prev.daysCount === next.daysCount
	);
});

function VacationPeriodsComponent() {
	const { isLocalized } = useLanguage();
	const {
		vacationPeriods,
		recordingState,
		addVacationPeriod,
		removeVacationPeriod,
		startRecording,
		stopRecording,
	} = useVacation();

	const formatDate = React.useCallback(
		(date: Date) =>
			date.toLocaleDateString(isLocalized ? "ar-SA" : "en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			}),
		[isLocalized],
	);

	const isRecordingStart = React.useCallback(
		(index: number) => recordingState.periodIndex === index && recordingState.field === "start",
		[recordingState.periodIndex, recordingState.field],
	);
	const isRecordingEnd = React.useCallback(
		(index: number) => recordingState.periodIndex === index && recordingState.field === "end",
		[recordingState.periodIndex, recordingState.field],
	);

	const onAdd = React.useCallback(() => addVacationPeriod(), [addVacationPeriod]);

	return (
		<div className="space-y-2">
			{/* Top-right controls when no periods exist */}
			{vacationPeriods.length === 0 && (
				<div className="flex items-center justify-end">
					<div className="flex items-center gap-2">
						{recordingState.periodIndex !== null && (
							<Button variant="secondary" size="sm" onClick={stopRecording}>
								{isLocalized ? "إيقاف" : "Stop"}
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={onAdd}
							aria-label={isLocalized ? "إضافة إجازة" : "Add vacation"}
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
			{vacationPeriods.length === 0 ? (
				<div className="text-center py-4 text-muted-foreground">
					<Plane className="h-6 w-6 mx-auto mb-1 opacity-50" />
					<p className="text-sm">
						{isLocalized ? "لا توجد فترات إجازة" : "No vacation periods"}
					</p>
				</div>
			) : (
				vacationPeriods.map((period, index) => {
					const startText = formatDate(period.start);
					const endText = formatDate(period.end);
					const daysCount = Math.ceil(
						(period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24),
					) + 1;
					return (
						<VacationPeriodRow
							key={`vac-period-row-${index}`}
							index={index}
							startText={startText}
							endText={endText}
							isLocalized={isLocalized ?? false}
							isRecordingStart={isRecordingStart(index)}
							isRecordingEnd={isRecordingEnd(index)}
							daysCount={daysCount}
							onStartRecord={() => startRecording(index, "start")}
							onEndRecord={() => startRecording(index, "end")}
							onStopRecord={stopRecording}
							onRemove={() => removeVacationPeriod(index)}
							onAdd={onAdd}
						/>
					);
				})
			)}
		</div>
	);
}

export const VacationPeriods = React.memo(VacationPeriodsComponent);
