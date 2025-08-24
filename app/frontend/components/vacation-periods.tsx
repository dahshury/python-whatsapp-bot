"use client";

import { CalendarDays, Plane, Play, Plus, Square, Trash2 } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { useVacation } from "@/lib/vacation-context";

function VacationPeriodsComponent() {
	const { isRTL } = useLanguage();
	const { vacationPeriods, recordingState } = useVacation();

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

    // Recording controls not exposed in current context

	return (
		<div className="space-y-2">
			{vacationPeriods.length === 0 ? (
				<div className="text-center py-4 text-muted-foreground">
					<Plane className="h-6 w-6 mx-auto mb-1 opacity-50" />
					<p className="text-sm">
						{isRTL ? "لا توجد فترات إجازة" : "No vacation periods"}
					</p>
				</div>
			) : (
				vacationPeriods.map((period, index) => (
					<div key={index} className="relative border rounded-md p-2">
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
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2">
							{/* Start Date */}
							<div className="flex items-center justify-between border rounded-md p-2">
								<div className="flex-1">
									<p className="text-xs text-muted-foreground">
										{isRTL ? "البداية" : "Start"}
									</p>
									<p className="text-sm font-medium">
										{formatDate(period.start)}
									</p>
								</div>
								{/* Recording control unavailable */}
							</div>

							{/* End Date */}
							<div className="flex items-center justify-between border rounded-md p-2">
								<div className="flex-1">
									<p className="text-xs text-muted-foreground">
										{isRTL ? "النهاية" : "End"}
									</p>
									<p className="text-sm font-medium">
										{formatDate(period.end)}
									</p>
								</div>
								{/* Recording control unavailable */}
							</div>
						</div>

						{/* Recording indicator */}
						{(isRecording(index, "start") || isRecording(index, "end")) && (
							<div className="absolute inset-0 bg-primary/5 border-2 border-primary/20 rounded-md pointer-events-none">
								<div className="absolute top-1 right-1">
									<Badge variant="default" className="text-xs animate-pulse">
										{isRTL ? "تسجيل..." : "Rec..."}
									</Badge>
								</div>
							</div>
						)}
					</div>
				))
			)}

			{/* Add/Remove controls not available in current context */}
		</div>
	);
}

export const VacationPeriods = React.memo(VacationPeriodsComponent);
