/**
 * Dual Calendar Component
 *
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

"use client";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
// Custom hooks
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendarState } from "@/hooks/useCalendarState";
import { modifyReservation, undoModifyReservation } from "@/lib/api";
// Services and utilities
import {
	type CalendarCallbackHandlers,
	createCalendarCallbacks,
	type VacationDateChecker,
} from "@/lib/calendar-callbacks";
import { getTimezone } from "@/lib/calendar-config";
import { useLanguage } from "@/lib/language-context";
import { useVacation } from "@/lib/vacation-context";
import { VacationEventsService } from "@/lib/vacation-events-service";
import type { CalendarEvent, VacationPeriod } from "@/types/calendar";
// Components
import { CalendarCore, type CalendarCoreRef } from "./calendar-core";
import { CalendarSkeleton } from "./calendar-skeleton";
import { CalendarErrorFallback, ErrorBoundary } from "./error-boundary";

interface DualCalendarComponentProps {
	freeRoam?: boolean;
	initialView?: string;
	initialDate?: string;
	initialLeftView?: string;
	initialRightView?: string;
	onViewChange?: (view: string) => void;
	onLeftViewChange?: (view: string) => void;
	onRightViewChange?: (view: string) => void;
	// Add events props to avoid duplicate API calls
	events?: CalendarEvent[];
	loading?: boolean;
	onRefreshData?: () => Promise<void>;
}

export const DualCalendarComponent = React.forwardRef<
	{
		leftCalendarRef: React.RefObject<CalendarCoreRef>;
		rightCalendarRef: React.RefObject<CalendarCoreRef>;
		leftView: string;
		rightView: string;
	},
	DualCalendarComponentProps
>(
	(
		{
			freeRoam = false,
			initialView = "multiMonthYear",
			initialDate,
			initialLeftView,
			initialRightView,
			onViewChange,
			onLeftViewChange,
			onRightViewChange,
			events: externalEvents,
			loading: externalLoading,
			onRefreshData: externalRefreshData,
		},
		ref,
	) => {
		const { isRTL } = useLanguage();
		const {
			handleDateClick: handleVacationDateClick,
			recordingState,
			setOnVacationUpdated,
			vacationPeriods,
		} = useVacation();
		const { state: sidebarState, open: sidebarOpen } = useSidebar();

		// Refs for both calendars
		const leftCalendarRef = useRef<CalendarCoreRef>(null);
		const rightCalendarRef = useRef<CalendarCoreRef>(null);

		// Calendar state management for both calendars
		// For dual calendars, we use the specific initial views passed in
		// and don't rely on the shared localStorage 'calendar-view' key
		const leftCalendarState = useCalendarState({
			freeRoam,
			initialView: initialLeftView || "multiMonthYear",
			initialDate,
		});

		const rightCalendarState = useCalendarState({
			freeRoam,
			initialView: initialRightView || "multiMonthYear",
			initialDate,
		});

		// Expose refs to parent - must be after state declaration but before any conditional returns
		React.useImperativeHandle(
			ref,
			() => ({
				leftCalendarRef,
				rightCalendarRef,
				leftView: leftCalendarState.currentView,
				rightView: rightCalendarState.currentView,
			}),
			[leftCalendarState.currentView, rightCalendarState.currentView],
		);

		// Calendar events management - fix conditional hook usage
		const localEventsState = useCalendarEvents({
			freeRoam,
			isRTL,
			autoRefresh: false,
		});

		// Use external events if provided, otherwise use local state
		const effectiveEventsState = !externalEvents
			? localEventsState
			: {
					events: [],
					loading: false,
					error: null,
					refreshData: async () => {},
					refetchEvents: async () => {},
					invalidateCache: () => {},
				};

		// Use external events if provided, otherwise use local state
		const allEvents = externalEvents ?? effectiveEventsState.events;
		const loading = externalLoading ?? effectiveEventsState.loading;
		const _error = effectiveEventsState.error;
		const refreshData = externalRefreshData ?? effectiveEventsState.refreshData;

		// Process events to mark past reservations as non-editable in free roam mode
		const processedAllEvents = useMemo(() => {
			if (freeRoam) {
				const today = new Date();
				today.setHours(0, 0, 0, 0); // Compare date part only
				return allEvents.map((event) => {
					const eventStartDate = new Date(event.start);
					// Check if it's a reservation (not type 2) and is in the past
					if (event.extendedProps?.type !== 2 && eventStartDate < today) {
						return {
							...event,
							editable: false,
							eventStartEditable: false,
							eventDurationEditable: false,
							className: event.className
								? [...event.className, "past-reservation-freeroam"]
								: ["past-reservation-freeroam"],
						};
					}
					return event;
				});
			}
			return allEvents;
		}, [allEvents, freeRoam]);

		// Use processed events for both calendars
		const processedLeftEvents = processedAllEvents;
		const processedRightEvents = processedAllEvents;

		// Vacation period checker (for drag/drop validation only, styling handled by background events)
		const isVacationDate: VacationDateChecker = useMemo(() => {
			return (dateStr: string) => {
				if (vacationPeriods.length === 0) {
					return false;
				}

				for (const period of vacationPeriods) {
					// Create date strings from vacation period dates using same format as dateStr
					const vacationStart = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, "0")}-${String(period.start.getDate()).padStart(2, "0")}`;
					const vacationEnd = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, "0")}-${String(period.end.getDate()).padStart(2, "0")}`;

					if (dateStr >= vacationStart && dateStr <= vacationEnd) {
						return true;
					}
				}
				return false;
			};
		}, [vacationPeriods]);

		// Calculate calendar height based on viewport for each calendar individually
		const calculateLeftHeight = useCallback(() => {
			const viewportHeight = window.innerHeight;
			const headerHeight = 64; // Header with sidebar trigger and dock nav
			const containerPadding = 8; // p-1 on both top and bottom (4px * 2)
			const footerSpace = 4; // Minimal buffer

			const availableHeight =
				viewportHeight - headerHeight - containerPadding - footerSpace;

			// For list view and multiMonth view, use auto to let content determine height
			if (
				leftCalendarState.currentView === "listMonth" ||
				leftCalendarState.currentView === "multiMonthYear"
			) {
				return "auto";
			}

			// For all other views, use calculated height
			return Math.max(availableHeight, 600);
		}, [leftCalendarState.currentView]);

		const calculateRightHeight = useCallback(() => {
			const viewportHeight = window.innerHeight;
			const headerHeight = 64; // Header with sidebar trigger and dock nav
			const containerPadding = 8; // p-1 on both top and bottom (4px * 2)
			const footerSpace = 4; // Minimal buffer

			const availableHeight =
				viewportHeight - headerHeight - containerPadding - footerSpace;

			// For list view and multiMonth view, use auto to let content determine height
			if (
				rightCalendarState.currentView === "listMonth" ||
				rightCalendarState.currentView === "multiMonthYear"
			) {
				return "auto";
			}

			// For all other views, use calculated height
			return Math.max(availableHeight, 600);
		}, [rightCalendarState.currentView]);

		// Set initial heights and update on resize
		const [leftCalendarHeight, setLeftCalendarHeight] = useState<
			number | "auto"
		>(800);
		const [rightCalendarHeight, setRightCalendarHeight] = useState<
			number | "auto"
		>(800);

		useEffect(() => {
			setLeftCalendarHeight(calculateLeftHeight());
			setRightCalendarHeight(calculateRightHeight());

			const handleResize = () => {
				setLeftCalendarHeight(calculateLeftHeight());
				setRightCalendarHeight(calculateRightHeight());
			};

			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}, [calculateLeftHeight, calculateRightHeight]);

		// Update calendar size when sidebar state changes
		useEffect(() => {
			// Small delay to allow CSS transition to start
			const timer = setTimeout(() => {
				setLeftCalendarHeight(calculateLeftHeight());
				setRightCalendarHeight(calculateRightHeight());
				// Update both calendars
				leftCalendarRef.current?.updateSize();
				rightCalendarRef.current?.updateSize();
			}, 50);

			return () => clearTimeout(timer);
		}, [calculateLeftHeight, calculateRightHeight]);

		// Wrapper for refreshData that shows blur animation
		const [isRefreshing, setIsRefreshing] = useState(false);
		const handleRefreshWithBlur = useCallback(async () => {
			setIsRefreshing(true);
			try {
				await refreshData();
			} finally {
				// Small delay to ensure smooth transition
				setTimeout(() => setIsRefreshing(false), 300);
			}
		}, [refreshData]);

		// Handle event change (drag and drop) - Same logic as original calendar
		const handleEventChange = useCallback(
			async (info: any) => {
				const event = info.event;
				const oldEvent = info.oldEvent;

				// Check if the new date falls within a vacation period
				const newDate = event.start;
				const newDateString =
					newDate.getFullYear() +
					"-" +
					String(newDate.getMonth() + 1).padStart(2, "0") +
					"-" +
					String(newDate.getDate()).padStart(2, "0");

				if (isVacationDate(newDateString)) {
					info.revert();
					return;
				}

				// 🔍 DEBUGGING: FullCalendar is configured with timeZone='Asia/Riyadh' so event.start should be correct
				console.log(`🔍 DUAL CALENDAR Drop Debug (timeZone='Asia/Riyadh'):`);
				console.log(`   event.start: ${event.start}`);
				console.log(`   event.start toString(): ${event.start.toString()}`);
				console.log(
					`   Browser timezone offset: ${event.start.getTimezoneOffset()} minutes from UTC`,
				);

				// 🚨 CRITICAL FIX: FullCalendar timezone bug correction (same fix as main calendar)
				// FullCalendar with timeZone='Asia/Riyadh' displays times correctly but interprets drags in UTC
				// When user drags to 1 PM visual, FullCalendar returns 4 PM local (which is 1 PM UTC)

				console.log(`🔧 DUAL CALENDAR Debug:`);
				console.log(`   Original event.start: ${event.start}`);
				console.log(
					`   event.start.toISOString(): ${event.start.toISOString()}`,
				);

				const isTimegridView =
					leftCalendarState.currentView.toLowerCase().includes("timegrid") ||
					rightCalendarState.currentView.toLowerCase().includes("timegrid");

				// Extract date normally
				const extractedDate =
					event.start.getFullYear() +
					"-" +
					String(event.start.getMonth() + 1).padStart(2, "0") +
					"-" +
					String(event.start.getDate()).padStart(2, "0");

				// Extract UTC time (which represents the visual time user dragged to)
				const utcDate = new Date(event.start.toISOString());
				let visualHour = utcDate.getUTCHours();
				let visualMinute = utcDate.getUTCMinutes();

				// For timegrid views: Round to nearest valid slot (11 AM, 1 PM, 3 PM)
				// For other views: Keep exact time for backend approximation
				if (isTimegridView) {
					const validSlotHours = [11, 13, 15]; // 11 AM, 1 PM, 3 PM in 24-hour format
					const draggedHour24 = visualHour + (visualMinute >= 30 ? 1 : 0); // Round up if >= 30 minutes

					// Find nearest valid slot hour
					let nearestSlotHour = validSlotHours[0];
					let minDiff = Math.abs(draggedHour24 - validSlotHours[0]);

					for (const slotHour of validSlotHours) {
						const diff = Math.abs(draggedHour24 - slotHour);
						if (diff < minDiff) {
							minDiff = diff;
							nearestSlotHour = slotHour;
						}
					}

					// Update visual time to nearest slot
					visualHour = nearestSlotHour;
					visualMinute = 0;

					console.log(
						`🎯 Dual calendar timegrid slot rounding: ${draggedHour24}:${utcDate.getUTCMinutes().toString().padStart(2, "0")} → ${visualHour}:00`,
					);
				}

				// Create proper 12-hour format time string from visual time
				const isPM = visualHour >= 12;
				const displayHour =
					visualHour === 0
						? 12
						: visualHour > 12
							? visualHour - 12
							: visualHour;
				const newTime = `${displayHour}:${visualMinute.toString().padStart(2, "0")} ${isPM ? "PM" : "AM"}`;

				console.log(
					`   Visual time corrected: ${newTime} (${isTimegridView ? "timegrid" : "other"} view)`,
				);

				// Debug timezone info for drag and drop
				console.log(`🔄 DUAL CALENDAR DRAG & DROP DEBUG:`);
				console.log(`   Event ID: ${event.id}`);
				console.log(`   Original event.start: ${event.start}`);
				console.log(
					`   Original timezone offset: ${event.start.getTimezoneOffset()} minutes`,
				);
				console.log(`   Extracted date (LOCAL): ${extractedDate}`);
				console.log(`   Extracted time (LOCAL): ${newTime}`);
				console.log(`   UTC ISO (for reference): ${event.start.toISOString()}`);

				const eventType = event.extendedProps.type || 0;
				const customerName = event.title;

				// Store original data for undo functionality - use same timezone extraction method for consistency
				const originalData = {
					wa_id: event.id,
					date: oldEvent?.start
						? oldEvent.start.getFullYear() +
							"-" +
							String(oldEvent.start.getMonth() + 1).padStart(2, "0") +
							"-" +
							String(oldEvent.start.getDate()).padStart(2, "0")
						: extractedDate,
					time_slot: oldEvent?.start
						? (() => {
								// 🚨 FIX: Apply same timezone extraction to original event
								const oldUtcDate = new Date(oldEvent.start.toISOString());
								const oldVisualHour = oldUtcDate.getUTCHours();
								const oldVisualMinute = oldUtcDate.getUTCMinutes();
								const oldIsPM = oldVisualHour >= 12;
								const oldDisplayHour =
									oldVisualHour === 0
										? 12
										: oldVisualHour > 12
											? oldVisualHour - 12
											: oldVisualHour;
								return `${oldDisplayHour}:${oldVisualMinute.toString().padStart(2, "0")} ${oldIsPM ? "PM" : "AM"}`;
							})()
						: newTime,
					customer_name: customerName,
					type: eventType,
				};

				const generateChangeDescription = () => {
					if (!oldEvent?.start)
						return isRTL ? "تم تحديث الحجز" : "Reservation updated";

					const oldDate =
						oldEvent.start.getFullYear() +
						"-" +
						String(oldEvent.start.getMonth() + 1).padStart(2, "0") +
						"-" +
						String(oldEvent.start.getDate()).padStart(2, "0");
					// 🚨 FIX: Apply same timezone extraction to old time for display
					const oldUtcDate = new Date(oldEvent.start.toISOString());
					const oldVisualHour = oldUtcDate.getUTCHours();
					const oldVisualMinute = oldUtcDate.getUTCMinutes();
					const oldIsPM = oldVisualHour >= 12;
					const oldDisplayHour =
						oldVisualHour === 0
							? 12
							: oldVisualHour > 12
								? oldVisualHour - 12
								: oldVisualHour;
					const oldTime = `${oldDisplayHour}:${oldVisualMinute.toString().padStart(2, "0")} ${oldIsPM ? "PM" : "AM"}`;

					const formatDate = (dateStr: string) => {
						const date = new Date(dateStr);
						return date.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
							weekday: "short",
							month: "short",
							day: "numeric",
						});
					};

					const oldDateFormatted = formatDate(oldDate);
					const newDateFormatted = formatDate(extractedDate);
					const dateChanged = oldDate !== extractedDate;
					const timeChanged = oldTime !== newTime;
					const isWeekView =
						leftCalendarState.currentView.includes("timeGrid") ||
						rightCalendarState.currentView.includes("timeGrid");

					if (isRTL) {
						if (dateChanged && timeChanged) {
							return `تم نقل ${customerName} من ${oldDateFormatted} ${oldTime} إلى ${newDateFormatted} ${newTime}`;
						} else if (dateChanged) {
							return isWeekView && timeChanged
								? `تم نقل ${customerName} من ${oldDateFormatted} ${oldTime} إلى ${newDateFormatted} ${newTime}`
								: `تم نقل ${customerName} من ${oldDateFormatted} إلى ${newDateFormatted}`;
						} else if (timeChanged) {
							return `تم نقل ${customerName} من ${oldTime} إلى ${newTime}`;
						} else {
							return `تم تحديث حجز ${customerName}`;
						}
					} else {
						if (dateChanged && timeChanged) {
							return `Moved ${customerName} from ${oldDateFormatted} ${oldTime} to ${newDateFormatted} ${newTime}`;
						} else if (dateChanged) {
							return isWeekView && timeChanged
								? `Moved ${customerName} from ${oldDateFormatted} ${oldTime} to ${newDateFormatted} ${newTime}`
								: `Moved ${customerName} from ${oldDateFormatted} to ${newDateFormatted}`;
						} else if (timeChanged) {
							return `Moved ${customerName} from ${oldTime} to ${newTime}`;
						} else {
							return `Updated ${customerName}'s reservation`;
						}
					}
				};

				try {
					// Different behavior for timegrid vs other views:
					// - Timegrid views: approximate=false (snap to exact hour, don't jump to different slots)
					// - Other views: approximate=true (find nearest available slot)
					const useApproximate = !isTimegridView;

					const requestData = {
						id: event.id,
						date: extractedDate,
						time: newTime,
						title: event.title, // Include customer name
						type: eventType, // Preserve the original type
						approximate: useApproximate,
					};
					console.log(
						`   Old data: ${originalData.date} ${originalData.time_slot}`,
					);
					console.log(`   New data: ${extractedDate} ${newTime}`);
					console.log(`   Sending to backend:`, requestData);

					const result = await modifyReservation(event.id, {
						date: extractedDate,
						time: newTime,
						title: event.title,
						type: eventType,
						approximate: useApproximate,
					});

					if (result.success) {
						toast.success(isRTL ? "تم تحديث الحجز" : "Reservation Updated", {
							description: generateChangeDescription(),
							duration: 8000, // Longer duration to give time for undo
							action: {
								label: isRTL ? "تراجع" : "Undo",
								onClick: async () => {
									try {
										const undoResult = await undoModifyReservation({
											reservationId: event.extendedProps.reservationId,
											originalData,
											ar: isRTL,
										});

										if (undoResult.success) {
											toast.success(isRTL ? "تم التراجع" : "Undone", {
												description: isRTL
													? "تم إرجاع الحجز إلى موضعه الأصلي"
													: "Reservation reverted to original position",
												duration: 4000,
											});
											// Refresh data to show the reverted state
											await handleRefreshWithBlur();
										} else {
											toast.error(isRTL ? "فشل التراجع" : "Undo Failed", {
												description:
													undoResult.message ||
													(isRTL
														? "نظام خطأ حاول مرة أخرى لاحقاً"
														: "System error, try again later"),
												duration: 5000,
											});
										}
									} catch (_error) {
										toast.error(isRTL ? "خطأ في التراجع" : "Undo Error", {
											description: isRTL
												? "نظام خطأ حاول مرة أخرى لاحقاً"
												: "System error, try again later",
											duration: 5000,
										});
									}
								},
							},
						});
						// Refresh data to show the updated event
						await handleRefreshWithBlur();
					} else {
						// Revert the event if the API call failed
						info.revert();
						toast.error(isRTL ? "فشل في التحديث" : "Update Failed", {
							description:
								result.message ||
								(isRTL
									? "حدث خطأ أثناء تحديث الحدث"
									: "Failed to update event"),
							duration: 5000,
						});
					}
				} catch (_error) {
					info.revert();
					toast.error(isRTL ? "خطأ في الشبكة" : "Network Error", {
						description: isRTL
							? "حدث خطأ في الشبكة، يرجى التحقق من اتصالك"
							: "A network error occurred, please check your connection",
						duration: 5000,
					});
				}

				// After correcting visualHour/visualMinute and computing newTime, sync event.start for timegrid views
				if (isTimegridView) {
					const newStartLocal = new Date(
						`${extractedDate}T${visualHour.toString().padStart(2, "0")}:${visualMinute.toString().padStart(2, "0")}:00`,
					);
					event.setStart(newStartLocal); // Ensure FullCalendar uses exact rounded slot
				}
			},
			[
				isVacationDate,
				isRTL,
				handleRefreshWithBlur,
				leftCalendarState.currentView.includes,
				leftCalendarState.currentView.toLowerCase,
				rightCalendarState.currentView.includes,
				rightCalendarState.currentView.toLowerCase,
			],
		);

		// Update size handlers for smooth resizing
		const handleLeftUpdateSize = useCallback(() => {
			leftCalendarRef.current?.updateSize();
		}, []);

		const handleRightUpdateSize = useCallback(() => {
			rightCalendarRef.current?.updateSize();
		}, []);

		// Calendar callback handlers for both calendars (provide required fields)
		const leftCallbackHandlers: CalendarCallbackHandlers = useMemo(
			() => ({
				isChangingHours: false,
				setIsChangingHours: () => {},
				isRTL,
				currentView: leftCalendarState.currentView,
				isVacationDate,
				openEditor: (_opts: { start: string; end?: string }) => {},
				handleOpenConversation: (_id: string) => {},
				handleEventChange: (_eventId: string, _updates: any) => {},
			}),
			[isRTL, leftCalendarState.currentView, isVacationDate],
		);

		const rightCallbackHandlers: CalendarCallbackHandlers = useMemo(
			() => ({
				isChangingHours: false,
				setIsChangingHours: () => {},
				isRTL,
				currentView: rightCalendarState.currentView,
				isVacationDate,
				openEditor: (_opts: { start: string; end?: string }) => {},
				handleOpenConversation: (_id: string) => {},
				handleEventChange: (_eventId: string, _updates: any) => {},
			}),
			[isRTL, rightCalendarState.currentView, isVacationDate],
		);

		const leftCallbacks = useMemo(
			() =>
				createCalendarCallbacks(
					leftCallbackHandlers,
					freeRoam,
					getTimezone(),
					leftCalendarState.currentDate,
					// Only pass vacation click handler when actively recording
					recordingState.periodIndex !== null && recordingState.field !== null
						? handleVacationDateClick
						: undefined,
					leftCalendarState.setCurrentDate,
					leftCalendarState.updateSlotTimes,
					leftCalendarState.currentView,
				),
			[
				leftCallbackHandlers,
				freeRoam,
				leftCalendarState.currentDate,
				recordingState.periodIndex,
				recordingState.field,
				handleVacationDateClick,
				leftCalendarState.setCurrentDate,
				leftCalendarState.updateSlotTimes,
				leftCalendarState.currentView,
			],
		);

		const rightCallbacks = useMemo(
			() =>
				createCalendarCallbacks(
					rightCallbackHandlers,
					freeRoam,
					getTimezone(),
					rightCalendarState.currentDate,
					// Only pass vacation click handler when actively recording
					recordingState.periodIndex !== null && recordingState.field !== null
						? handleVacationDateClick
						: undefined,
					rightCalendarState.setCurrentDate,
					rightCalendarState.updateSlotTimes,
					rightCalendarState.currentView,
				),
			[
				rightCallbackHandlers,
				freeRoam,
				rightCalendarState.currentDate,
				recordingState.periodIndex,
				recordingState.field,
				handleVacationDateClick,
				rightCalendarState.setCurrentDate,
				rightCalendarState.updateSlotTimes,
				rightCalendarState.currentView,
			],
		);

		// Register vacation events update callback using FullCalendar's native event management
		useEffect(() => {
			const updateVacationEvents = async (
				vacationPeriods: VacationPeriod[],
			) => {
				console.log(
					"🔄 [DUAL-CALENDAR] Updating vacation events using FullCalendar API...",
				);
				// Update vacation events in both calendars using FullCalendar's native event management
				const leftApi = leftCalendarRef.current?.getApi();
				const rightApi = rightCalendarRef.current?.getApi();

				if (leftApi) {
					VacationEventsService.updateVacationEvents(leftApi, vacationPeriods);
					console.log(
						"🔄 [DUAL-CALENDAR] Left calendar vacation events updated",
					);
				}
				if (rightApi) {
					VacationEventsService.updateVacationEvents(rightApi, vacationPeriods);
					console.log(
						"🔄 [DUAL-CALENDAR] Right calendar vacation events updated",
					);
				}
			};

			setOnVacationUpdated?.(updateVacationEvents);
		}, [setOnVacationUpdated]);

		// Show loading state
		if (
			loading ||
			!leftCalendarState.isHydrated ||
			!rightCalendarState.isHydrated
		) {
			return <CalendarSkeleton />;
		}

		return (
			<ErrorBoundary fallback={CalendarErrorFallback}>
				<div
					className={`flex h-full gap-4 ${isRefreshing ? "opacity-75 pointer-events-none" : ""}`}
				>
					{/* Left Calendar */}
					<div className="flex-1 border rounded-lg p-2 overflow-hidden">
						<CalendarCore
							ref={leftCalendarRef}
							events={processedLeftEvents}
							currentView={leftCalendarState.currentView}
							currentDate={leftCalendarState.currentDate}
							isRTL={isRTL}
							freeRoam={freeRoam}
							slotTimes={leftCalendarState.slotTimes}
							slotTimesKey={leftCalendarState.slotTimesKey}
							calendarHeight={leftCalendarHeight}
							isVacationDate={isVacationDate}
							droppable={true}
							onDateClick={leftCallbacks.dateClick}
							onSelect={leftCallbacks.select}
							onEventClick={leftCallbacks.eventClick}
							onEventChange={handleEventChange}
							onEventReceive={handleEventChange}
							onViewChange={onLeftViewChange}
							onViewDidMount={(info) => {
								if (leftCalendarState.isHydrated) {
									const newHeight = calculateLeftHeight();
									setLeftCalendarHeight(newHeight);
									leftCalendarState.setCurrentView(info.view.type);
									onLeftViewChange?.(info.view.type);
								}
							}}
							onDatesSet={(info) => {
								if (leftCalendarState.isHydrated) {
									leftCalendarState.setCurrentView(info.view.type);
									onLeftViewChange?.(info.view.type);
								}
							}}
							onUpdateSize={handleLeftUpdateSize}
							onNavDate={leftCalendarState.setCurrentDate}
						/>
					</div>

					{/* Right Calendar */}
					<div className="flex-1 border rounded-lg p-2 overflow-hidden">
						<CalendarCore
							ref={rightCalendarRef}
							events={processedRightEvents}
							currentView={rightCalendarState.currentView}
							currentDate={rightCalendarState.currentDate}
							isRTL={isRTL}
							freeRoam={freeRoam}
							slotTimes={rightCalendarState.slotTimes}
							slotTimesKey={rightCalendarState.slotTimesKey}
							calendarHeight={rightCalendarHeight}
							isVacationDate={isVacationDate}
							droppable={true}
							onDateClick={rightCallbacks.dateClick}
							onSelect={rightCallbacks.select}
							onEventClick={rightCallbacks.eventClick}
							onEventChange={handleEventChange}
							onEventReceive={handleEventChange}
							onViewChange={onRightViewChange}
							onViewDidMount={(info) => {
								if (rightCalendarState.isHydrated) {
									const newHeight = calculateRightHeight();
									setRightCalendarHeight(newHeight);
									rightCalendarState.setCurrentView(info.view.type);
									onRightViewChange?.(info.view.type);
								}
							}}
							onDatesSet={(info) => {
								if (rightCalendarState.isHydrated) {
									rightCalendarState.setCurrentView(info.view.type);
									onRightViewChange?.(info.view.type);
								}
							}}
							onUpdateSize={handleRightUpdateSize}
							onNavDate={rightCalendarState.setCurrentDate}
						/>
					</div>
				</div>
			</ErrorBoundary>
		);
	},
);

DualCalendarComponent.displayName = "DualCalendarComponent";
