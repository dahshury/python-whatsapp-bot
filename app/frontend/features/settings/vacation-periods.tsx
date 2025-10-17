"use client";

import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { CalendarDays, Circle, Plane, Plus, Trash2 } from "lucide-react";
import React from "react";

// Constants for date calculations
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY =
	MILLISECONDS_PER_SECOND *
	SECONDS_PER_MINUTE *
	MINUTES_PER_HOUR *
	HOURS_PER_DAY;

type VacationPeriodRowProps = {
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
};

const VacationPeriodRow = React.memo(
	function VacationPeriodRowComponent({
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
			<div className="relative rounded-md border p-2">
				<div className="mb-2 flex items-center justify-between">
					<Badge className="text-xs" variant="secondary">
						{i18n.getMessage("vacation_period", isLocalized)} {index + 1}
					</Badge>
					<div className="flex items-center">
						<Badge className="mr-2 text-xs" variant="outline">
							<CalendarDays className="mr-1 h-3 w-3" />
							{daysCount} {i18n.getMessage("vacation_days", isLocalized)}
						</Badge>
						{/* Add button inline only on first row to save space */}
						{index === 0 && (
							<Button
								aria-label={i18n.getMessage("vacation_add", isLocalized)}
								className="mr-1 h-8 w-8"
								onClick={onAdd}
								size="icon"
								variant="ghost"
							>
								<Plus className="h-4 w-4" />
							</Button>
						)}
						<Button
							aria-label={i18n.getMessage(
								"vacation_remove_period",
								isLocalized
							)}
							className="h-8 w-8"
							onClick={onRemove}
							size="icon"
							variant="ghost"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					{/* Start Date */}
					<div
						className={`relative flex items-center justify-between rounded-md border p-2 ${
							isRecordingStart ? "ring-2 ring-destructive/40" : ""
						}`}
					>
						{/* Recording overlay */}
						{isRecordingStart && (
							<span className="absolute top-1 right-2 animate-pulse select-none font-medium text-[0.625rem] text-destructive">
								{i18n.getMessage("vacation_recording", isLocalized)}
							</span>
						)}
						<div className="flex-1">
							<p className="text-muted-foreground text-xs">
								{i18n.getMessage("vacation_start", isLocalized)}
							</p>
							<p className="font-medium text-sm">{startText}</p>
						</div>
						<div className="flex items-center gap-1">
							{isRecordingStart ? (
								<Button
									aria-label={i18n.getMessage("vacation_stop", isLocalized)}
									className="h-7 w-7"
									onClick={onStopRecord}
									size="icon"
									variant="secondary"
								>
									<Circle className="h-3.5 w-3.5 text-destructive" />
								</Button>
							) : (
								<Button
									aria-label={i18n.getMessage("vacation_start", isLocalized)}
									className="h-8 w-8"
									onClick={onStartRecord}
									size="icon"
									variant="ghost"
								>
									<Circle className="h-4 w-4 text-destructive" />
								</Button>
							)}
						</div>
					</div>

					{/* End Date */}
					<div
						className={`relative flex items-center justify-between rounded-md border p-2 ${
							isRecordingEnd ? "ring-2 ring-destructive/40" : ""
						}`}
					>
						{/* Recording overlay */}
						{isRecordingEnd && (
							<span className="absolute top-1 right-2 animate-pulse select-none font-medium text-[0.625rem] text-destructive">
								{i18n.getMessage("vacation_recording", isLocalized)}
							</span>
						)}
						<div className="flex-1">
							<p className="text-muted-foreground text-xs">
								{i18n.getMessage("vacation_end", isLocalized)}
							</p>
							<p className="font-medium text-sm">{endText}</p>
						</div>
						<div className="flex items-center gap-1">
							{isRecordingEnd ? (
								<Button
									aria-label={i18n.getMessage("vacation_stop", isLocalized)}
									className="h-7 w-7"
									onClick={onStopRecord}
									size="icon"
									variant="secondary"
								>
									<Circle className="h-3.5 w-3.5 text-destructive" />
								</Button>
							) : (
								<Button
									aria-label={i18n.getMessage("vacation_end", isLocalized)}
									className="h-8 w-8"
									onClick={onEndRecord}
									size="icon"
									variant="ghost"
								>
									<Circle className="h-4 w-4 text-destructive" />
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
	(prev, next) => {
		// Custom memo comparator: only re-render when visible bits change
		return (
			prev.index === next.index &&
			prev.isLocalized === next.isLocalized &&
			prev.startText === next.startText &&
			prev.endText === next.endText &&
			prev.isRecordingStart === next.isRecordingStart &&
			prev.isRecordingEnd === next.isRecordingEnd &&
			prev.daysCount === next.daysCount
		);
	}
);

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

	// Show only upcoming vacations (start date strictly after today)
	const upcoming = React.useMemo(() => {
		const normalize = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const today = normalize(new Date());
		return (vacationPeriods || [])
			.map((p, i) => ({ period: p, originalIndex: i }))
			.filter(
				({ period }) => normalize(period.start).getTime() > today.getTime()
			);
	}, [vacationPeriods]);

	const formatDate = React.useCallback(
		(date: Date) =>
			date.toLocaleDateString(isLocalized ? "ar-SA" : "en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			}),
		[isLocalized]
	);

	const isRecordingStart = React.useCallback(
		(index: number) =>
			recordingState.periodIndex === index && recordingState.field === "start",
		[recordingState.periodIndex, recordingState.field]
	);
	const isRecordingEnd = React.useCallback(
		(index: number) =>
			recordingState.periodIndex === index && recordingState.field === "end",
		[recordingState.periodIndex, recordingState.field]
	);

	const onAdd = React.useCallback(
		() => addVacationPeriod(),
		[addVacationPeriod]
	);

	return (
		<div className="space-y-2">
			{/* Top-right controls when no periods exist */}
			{upcoming.length === 0 && (
				<div className="flex items-center justify-end">
					<div className="flex items-center gap-2">
						{recordingState.periodIndex !== null && (
							<Button onClick={stopRecording} size="sm" variant="secondary">
								{i18n.getMessage("vacation_stop", isLocalized)}
							</Button>
						)}
						<Button
							aria-label={i18n.getMessage("vacation_add", isLocalized)}
							className="h-8 w-8"
							onClick={onAdd}
							size="icon"
							variant="ghost"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
			{upcoming.length === 0 ? (
				<div className="py-4 text-center text-muted-foreground">
					<Plane className="mx-auto mb-1 h-6 w-6 opacity-50" />
					<p className="text-sm">
						{i18n.getMessage("vacation_none", isLocalized)}
					</p>
				</div>
			) : (
				upcoming.map(({ period, originalIndex }, index) => {
					const startText = formatDate(period.start);
					const endText = formatDate(period.end);
					const daysCount =
						Math.ceil(
							(period.end.getTime() - period.start.getTime()) / MS_PER_DAY
						) + 1;
					return (
						<VacationPeriodRow
							daysCount={daysCount}
							endText={endText}
							index={index}
							isLocalized={isLocalized ?? false}
							isRecordingEnd={isRecordingEnd(originalIndex)}
							isRecordingStart={isRecordingStart(originalIndex)}
							key={`vac-period-${period.start.getTime()}-${period.end.getTime()}`}
							onAdd={onAdd}
							onEndRecord={() => startRecording(originalIndex, "end")}
							onRemove={() => removeVacationPeriod(originalIndex)}
							onStartRecord={() => startRecording(originalIndex, "start")}
							onStopRecord={stopRecording}
							startText={startText}
						/>
					);
				})
			)}
		</div>
	);
}

export const VacationPeriods = React.memo(VacationPeriodsComponent);
