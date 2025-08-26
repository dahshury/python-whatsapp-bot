"use client";

import {
	CalendarDays,
	Circle,
	Plane,
	Plus,
	Square,
	Trash2,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useVacation } from "@/lib/vacation-context";

function VacationPeriodsComponent() {
	const { isRTL } = useLanguage();
	const {
		vacationPeriods,
		recordingState,
		addVacationPeriod,
		removeVacationPeriod,
		startRecording,
		stopRecording,
	} = useVacation();

	// No loading state in context; render directly

	const formatDate = (date: Date) => {
		return date.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const isRecording = (periodIndex: number, field: "start" | "end") => {
		return (
			recordingState.periodIndex === periodIndex &&
			recordingState.field === field
		);
	};

	const isAnyRecording = recordingState.periodIndex !== null;

	return (
		<div className="space-y-2">
			{/* Top-right controls only when no periods exist, to avoid extra row space when periods are present */}
			{vacationPeriods.length === 0 && (
				<div className="flex items-center justify-end">
					<div className="flex items-center gap-2">
						{isAnyRecording && (
							<Button variant="secondary" size="sm" onClick={stopRecording}>
								<Square className="h-3.5 w-3.5 mr-1" />
								{isRTL ? "إيقاف" : "Stop"}
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={addVacationPeriod}
							aria-label={isRTL ? "إضافة إجازة" : "Add vacation"}
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
						{isRTL ? "لا توجد فترات إجازة" : "No vacation periods"}
					</p>
				</div>
			) : (
				vacationPeriods.map((period, index) => (
					<div
						key={`vacation-period-${period.start || index}-${period.end || index}`}
						className="relative border rounded-md p-2"
					>
						<div className="flex items-center justify-between mb-2">
							<Badge variant="secondary" className="text-xs">
								{isRTL ? `فترة ${index + 1}` : `Period ${index + 1}`}
							</Badge>
							<div className="flex items-center">
								<Badge variant="outline" className="text-xs mr-2">
									<CalendarDays className="h-3 w-3 mr-1" />
									{Math.ceil(
										(period.end.getTime() - period.start.getTime()) /
											(1000 * 60 * 60 * 24),
									) + 1}{" "}
									{isRTL ? "أيام" : "days"}
								</Badge>
								{/* Add button inline with first period header only on index 0 to save space */}
								{index === 0 && (
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 mr-1"
										onClick={addVacationPeriod}
										aria-label={isRTL ? "إضافة إجازة" : "Add vacation"}
									>
										<Plus className="h-4 w-4" />
									</Button>
								)}
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => removeVacationPeriod(index)}
									aria-label={isRTL ? "حذف الفترة" : "Remove period"}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2">
							{/* Start Date */}
							<div
								className={`flex items-center justify-between border rounded-md p-2 ${isRecording(index, "start") ? "ring-2 ring-red-500/40 animate-pulse" : ""}`}
							>
								<div className="flex-1">
									<p className="text-xs text-muted-foreground">
										{isRTL ? "البداية" : "Start"}
									</p>
									<p className="text-sm font-medium">
										{formatDate(period.start)}
									</p>
								</div>
								<div className="flex items-center gap-1">
									{isRecording(index, "start") ? (
										<Button
											variant="secondary"
											size="sm"
											onClick={stopRecording}
											className="gap-1"
										>
											<Circle className="h-3 w-3 text-red-500" />
											<span className="text-[10px] opacity-80">
												{isRTL ? "تسجيل..." : "Rec..."}
											</span>
										</Button>
									) : (
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => startRecording(index, "start")}
											aria-label={isRTL ? "بدء التسجيل" : "Record start"}
										>
											<Circle className="h-4 w-4 text-red-500" />
										</Button>
									)}
								</div>
							</div>

							{/* End Date */}
							<div
								className={`flex items-center justify-between border rounded-md p-2 ${isRecording(index, "end") ? "ring-2 ring-red-500/40 animate-pulse" : ""}`}
							>
								<div className="flex-1">
									<p className="text-xs text-muted-foreground">
										{isRTL ? "النهاية" : "End"}
									</p>
									<p className="text-sm font-medium">
										{formatDate(period.end)}
									</p>
								</div>
								<div className="flex items-center gap-1">
									{isRecording(index, "end") ? (
										<Button
											variant="secondary"
											size="sm"
											onClick={stopRecording}
											className="gap-1"
										>
											<Circle className="h-3 w-3 text-red-500" />
											<span className="text-[10px] opacity-80">
												{isRTL ? "تسجيل..." : "Rec..."}
											</span>
										</Button>
									) : (
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => startRecording(index, "end")}
											aria-label={isRTL ? "بدء التسجيل" : "Record end"}
										>
											<Circle className="h-4 w-4 text-red-500" />
										</Button>
									)}
								</div>
							</div>

							{/* (Recording indicator moved into the buttons; container glows when active) */}
						</div>
					</div>
				))
			)}
		</div>
	);
}

export const VacationPeriods = React.memo(VacationPeriodsComponent);
