"use client";

import {
	Calendar,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CircleAlert,
	CircleDashed,
	Clock,
	MessageSquare,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { CalendarCore, type CalendarCoreRef } from "@/components/calendar-core";
import { ChatSidebarContent } from "@/components/chat-sidebar-content";
import { CustomerStatsCard } from "@/components/customer-stats-card";
import { PrayerTimesWidget } from "@/components/prayer-times-widget";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { PhoneCombobox } from "@/components/ui/phone-combobox";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	useSidebar,
} from "@/components/ui/sidebar";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { getSlotTimes } from "@/lib/calendar-config";
import { useCustomerData } from "@/lib/customer-data-context";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import {
	useConversationsData,
	useReservationsData,
} from "@/lib/websocket-data-provider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const titleId = useId();
	const { isLocalized } = useLanguage();
	const { setOpenMobile, setOpen, open, openMobile } = useSidebar();
	const pathname = usePathname();
	const search = useSearchParams();
	const router = useRouter();
	const isDocumentsPage = pathname?.startsWith("/documents") ?? false;
	const { customers: docCustomers } = useCustomerData();
	const docWaId = search.get("waId") || "";

	// Hover card state for Documents page combobox
	const [docShowHoverCard, setDocShowHoverCard] = useState(false);
	const [docHoverTimer, setDocHoverTimer] = useState<NodeJS.Timeout | null>(
		null,
	);
	const [docCloseTimer, setDocCloseTimer] = useState<NodeJS.Timeout | null>(
		null,
	);
	const docHoverCardRef = useRef<HTMLDivElement | null>(null);

	const handleDocMouseEnter = useCallback(() => {
		if (!docWaId) return;
		if (docCloseTimer) {
			clearTimeout(docCloseTimer);
			setDocCloseTimer(null);
		}
		if (docHoverTimer) {
			clearTimeout(docHoverTimer);
		}
		const t = setTimeout(() => setDocShowHoverCard(true), 1500);
		setDocHoverTimer(t);
	}, [docWaId, docCloseTimer, docHoverTimer]);

	const handleDocMouseLeave = useCallback(
		(e: React.MouseEvent) => {
			const relatedTarget = e.relatedTarget as EventTarget | null;
			const hoverEl = docHoverCardRef.current;
			if (
				relatedTarget &&
				hoverEl &&
				relatedTarget instanceof Node &&
				hoverEl.contains(relatedTarget)
			) {
				return;
			}
			if (docHoverTimer) {
				clearTimeout(docHoverTimer);
				setDocHoverTimer(null);
			}
			if (docCloseTimer) {
				clearTimeout(docCloseTimer);
			}
			const timer = setTimeout(() => setDocShowHoverCard(false), 100);
			setDocCloseTimer(timer);
		},
		[docHoverTimer, docCloseTimer],
	);

	useEffect(() => {
		return () => {
			if (docHoverTimer) clearTimeout(docHoverTimer);
			if (docCloseTimer) clearTimeout(docCloseTimer);
		};
	}, [docHoverTimer, docCloseTimer]);

	// Mount guard to avoid hydration mismatches for client-only state
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	// Bridge for Documents save state (read from window when available)
	const [docSaveState, setDocSaveState] = useState<{
		loading: boolean;
		saving: boolean;
		isDirty: boolean;
	}>({
		loading: false,
		saving: false,
		isDirty: false,
	});
	useEffect(() => {
		if (!mounted) return;
		const read = () => {
			try {
				// internal bridge populated by /documents page
				const s = (
					window as unknown as {
						__docSaveState?: {
							loading?: boolean;
							saving?: boolean;
							isDirty?: boolean;
						};
					}
				).__docSaveState;
				setDocSaveState({
					loading: !!s?.loading,
					saving: !!s?.saving,
					isDirty: !!s?.isDirty,
				});
			} catch {}
		};
		read();
		const id = window.setInterval(read, 500);
		return () => window.clearInterval(id);
	}, [mounted]);

	// Mini list-view calendar state (used on Documents page)
	const miniCalendarRef = useRef<CalendarCoreRef | null>(null);
	const [miniCalDate, setMiniCalDate] = useState<Date>(new Date());
	const miniSlotTimes = useMemo(
		() => getSlotTimes(miniCalDate, false, "listMonth"),
		[miniCalDate],
	);
	const miniSlotTimesKey = useMemo(() => miniCalDate.getTime(), [miniCalDate]);

	// Measure available space for the mini calendar to fill the sidebar
	const miniCalendarContainerRef = useRef<HTMLDivElement | null>(null);
	const [miniCalendarHeight, setMiniCalendarHeight] = useState<number>(280);
	const [miniIsTodayDisabled, setMiniIsTodayDisabled] =
		useState<boolean>(false);
	const recomputeMiniCalendarHeight = useCallback(() => {
		const el = miniCalendarContainerRef.current;
		if (!el) return;
		try {
			const rect = el.getBoundingClientRect?.();
			const h = rect?.height ?? 280;
			setMiniCalendarHeight(Math.max(Math.floor(h), 240));
			requestAnimationFrame(() => {
				try {
					miniCalendarRef.current?.updateSize?.();
				} catch {}
			});
		} catch {}
	}, []);
	useEffect(() => {
		const el = miniCalendarContainerRef.current;
		if (!el) return;
		recomputeMiniCalendarHeight();
		const ro = new ResizeObserver(() => recomputeMiniCalendarHeight());
		ro.observe(el);
		window.addEventListener("resize", recomputeMiniCalendarHeight);
		return () => {
			try {
				ro.disconnect();
			} catch {}
			window.removeEventListener("resize", recomputeMiniCalendarHeight);
		};
	}, [recomputeMiniCalendarHeight]);

	// Recompute on page enter/exit and when sidebar toggles to avoid squashed height
	useEffect(() => {
		if (!isDocumentsPage) return;
		const t1 = setTimeout(recomputeMiniCalendarHeight, 50);
		const t2 = setTimeout(recomputeMiniCalendarHeight, 200);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, [isDocumentsPage, recomputeMiniCalendarHeight]);

	useEffect(() => {
		if (!isDocumentsPage) return;
		const t = setTimeout(recomputeMiniCalendarHeight, 200);
		return () => clearTimeout(t);
	}, [isDocumentsPage, recomputeMiniCalendarHeight]);

	// Use unified calendar events (read-only) for the mini list view
	const { events: allEvents } = useCalendarEvents({
		freeRoam: false,
		isLocalized,
	});
	const miniEvents = useMemo(() => {
		try {
			const filtered = (allEvents || []).filter(
				(ev) =>
					(ev as { extendedProps?: { cancelled?: boolean } })?.extendedProps
						?.cancelled !== true,
			);
			return filtered.map((ev) => ({
				...ev,
				editable: false,
				durationEditable: false,
				overlap: false,
			}));
		} catch {
			return (allEvents || []).filter(
				(ev) =>
					(ev as { extendedProps?: { cancelled?: boolean } })?.extendedProps
						?.cancelled !== true,
			);
		}
	}, [allEvents]);

	const handleMiniEventClick = useCallback(
		(info: { event: { extendedProps?: Record<string, unknown> } }) => {
			try {
				const waIdFromEvent = String(
					(info?.event?.extendedProps as Record<string, unknown> | undefined)
						?.waId || "",
				);
				if (waIdFromEvent) {
					router.push(`/documents?waId=${encodeURIComponent(waIdFromEvent)}`);
				}
			} catch {}
		},
		[router],
	);

	// Guard to prevent infinite update loops from datesSet emitting identical dates
	const handleMiniNavDate = useCallback((d: Date) => {
		try {
			setMiniCalDate((prev) => {
				const prevTime = prev instanceof Date ? prev.getTime() : Number.NaN;
				const nextTime = d instanceof Date ? d.getTime() : Number.NaN;
				return prevTime === nextTime ? prev : d;
			});
		} catch {}
	}, []);

	// Use unified data provider
	const { conversations, isLoading: conversationsLoading } =
		useConversationsData();
	const { reservations, isLoading: reservationsLoading } =
		useReservationsData();
	const chatLoading = conversationsLoading || reservationsLoading;

	// Use enhanced persistent chat store
	const {
		shouldOpenChat,
		conversationIdToOpen,
		clearOpenRequest,
		setLoadingConversation,
		selectedConversationId,
		activeTab,
		_hasHydrated,
		setSelectedConversation,
		setActiveTab,
		setChatSidebarOpen,
	} = useSidebarChatStore();

	const selectConversation = useCallback(
		(conversationId: string) => {
			setSelectedConversation(conversationId);
			setActiveTab("chat");
			setChatSidebarOpen(true);
			setLoadingConversation(false);
		},
		[
			setSelectedConversation,
			setActiveTab,
			setChatSidebarOpen,
			setLoadingConversation,
		],
	);

	const setOpenState = useCallback(
		(isOpen: boolean) => {
			setChatSidebarOpen(isOpen);
		},
		[setChatSidebarOpen],
	);

	const refreshData = async () => {
		// This will be handled by the unified provider
	};

	const isInitialized = !chatLoading && _hasHydrated;

	// Build customers list from unified data
	const customers = useMemo(() => {
		const customerMap = new Map();

		// Add customers from conversations
		for (const waId of Object.keys(conversations)) {
			if (!customerMap.has(waId)) {
				customerMap.set(waId, {
					phone: waId,
					formattedPhone: waId.startsWith("+") ? waId : `+${waId}`,
				});
			}
		}

		// Add customer names from reservations
		for (const [waId, customerReservations] of Object.entries(reservations)) {
			if (
				Array.isArray(customerReservations) &&
				customerReservations.length > 0
			) {
				const customerName = customerReservations.find(
					(r) => !!r?.customer_name,
				)?.customer_name;
				if (customerName) {
					const existing = customerMap.get(waId);
					if (existing) {
						existing.name = customerName;
					} else {
						customerMap.set(waId, {
							phone: waId,
							name: customerName,
							formattedPhone: waId.startsWith("+") ? waId : `+${waId}`,
						});
					}
				}
			}
		}

		return Array.from(customerMap.values());
	}, [conversations, reservations]);

	const conversationOptions = useMemo(() => {
		return customers.map((customer) => {
			const customerConversations = conversations[customer.phone];
			return {
				waId: customer.phone,
				customerName: customer.name,
				messageCount: customerConversations?.length || 0,
				lastMessage: customerConversations?.[customerConversations.length - 1],
			};
		});
	}, [customers, conversations]);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Only handle arrow keys when chat tab is active and no input is focused
			if (activeTab !== "chat" || conversationOptions.length === 0) return;

			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					activeElement.getAttribute("contenteditable") === "true")
			) {
				return; // Don't interfere with input fields
			}

			const currentIndex = conversationOptions.findIndex(
				(option) => option.waId === selectedConversationId,
			);

			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();

				let newIndex: number;
				if (event.key === "ArrowLeft") {
					// Previous conversation
					newIndex = Math.max(0, currentIndex - 1);
				} else {
					// Next conversation
					newIndex = Math.min(conversationOptions.length - 1, currentIndex + 1);
				}

				const selectedConversation = conversationOptions[newIndex];
				if (selectedConversation?.waId) {
					setLoadingConversation(true);
					selectConversation(selectedConversation.waId);
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [
		activeTab,
		conversationOptions,
		selectedConversationId,
		selectConversation,
		setLoadingConversation,
	]);

	// Auto-open sidebar when switching to chat tab or when hydrated with chat tab active
	useEffect(() => {
		if (isInitialized) {
			if (activeTab === "chat") {
				// Set the chat sidebar as open
				setOpenState(true);
			} else {
				// Set as closed when not on chat tab
				setOpenState(false);
			}
		}
	}, [activeTab, isInitialized, setOpenState]);

	// Listen for chat open requests from calendar
	useEffect(() => {
		if (shouldOpenChat && conversationIdToOpen) {
			// Only open sidebar if it's currently closed, respect user's current state
			if (!open) setOpen(true);
			if (!openMobile) setOpenMobile(true);

			// Set the conversation as selected and switch to chat tab
			setSelectedConversation(conversationIdToOpen);
			setActiveTab("chat");
			setChatSidebarOpen(true);

			// Reset loading state since conversation is now selected
			setLoadingConversation(false);

			// Clear the request
			clearOpenRequest();
		}
	}, [
		shouldOpenChat,
		conversationIdToOpen,
		setSelectedConversation,
		setActiveTab,
		setChatSidebarOpen,
		setLoadingConversation,
		clearOpenRequest,
		setOpen,
		setOpenMobile,
		open,
		openMobile,
	]);

	// Handle tab clicks
	const handleTabChange = useCallback(
		(tab: "calendar" | "chat") => {
			setActiveTab(tab);
			if (tab === "chat") {
				setChatSidebarOpen(true);
			}
		},
		[setActiveTab, setChatSidebarOpen],
	);

	// Documents page: render minimal sidebar with only contact selector
	if (isDocumentsPage) {
		const phoneOptions = docCustomers.map((c) => ({
			number: String(c.phone || ""),
			name: c.name || "",
			country: "US",
			label: c.name || String(c.phone || ""),
			id: String(c.phone || ""),
		}));

		return (
			<Sidebar {...props} className="bg-sidebar">
				<SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
					<div className="flex items-center gap-2 mb-0">
						<Calendar className="h-6 w-6" />
						<span className="font-semibold">
							{i18n.getMessage("documents", isLocalized)}
						</span>
					</div>
				</SidebarHeader>
				<SidebarContent className="p-4 bg-sidebar">
					<HoverCard open={docShowHoverCard}>
						<HoverCardTrigger asChild>
							<div className="w-full">
								<PhoneCombobox
									value={docWaId}
									onChange={(v) => {
										router.push(`/documents?waId=${encodeURIComponent(v)}`);
									}}
									placeholder={i18n.getMessage(
										"documents_select_customer",
										isLocalized,
									)}
									phoneOptions={phoneOptions}
									uncontrolled={false}
									showCountrySelector={false}
									showNameAndPhoneWhenClosed={true}
									size="sm"
									className="w-full"
									shrinkTextToFit={true}
									preferPlaceholderWhenEmpty
									onMouseEnter={handleDocMouseEnter}
									onMouseLeave={handleDocMouseLeave}
								/>
							</div>
						</HoverCardTrigger>
						{docWaId && (
							<HoverCardContent
								ref={docHoverCardRef}
								className="w-[300px] p-0 z-50"
								align="center"
								sideOffset={5}
								onMouseEnter={() => {
									if (docCloseTimer) {
										clearTimeout(docCloseTimer);
										setDocCloseTimer(null);
									}
									if (docHoverTimer) {
										clearTimeout(docHoverTimer);
										setDocHoverTimer(null);
									}
								}}
								onMouseLeave={(e: React.MouseEvent) => {
									const relatedTarget = e.relatedTarget as HTMLElement;
									if (
										relatedTarget &&
										(e.currentTarget as HTMLElement).contains(relatedTarget)
									) {
										return;
									}
									const timer = setTimeout(() => {
										setDocShowHoverCard(false);
									}, 100);
									setDocCloseTimer(timer);
								}}
							>
								<CustomerStatsCard
									selectedConversationId={docWaId}
									conversations={conversations}
									reservations={reservations}
									isLocalized={isLocalized}
									isHoverCard={true}
								/>
							</HoverCardContent>
						)}
					</HoverCard>
					{/* Mini list-view calendar with simple dock navigation */}
					<div className="mt-3 flex-1 min-h-0 flex flex-col">
						{/* Minimal navigation: Prev | Title (Today) | Next */}
						<div className="mb-2 flex items-center justify-between gap-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									try {
										miniCalendarRef.current?.getApi?.()?.prev?.();
									} catch {}
								}}
								aria-label={isLocalized ? "السابق" : "Previous"}
								className="size-9 rounded-full"
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									try {
										miniCalendarRef.current?.getApi?.()?.today?.();
									} catch {}
								}}
								disabled={miniIsTodayDisabled}
								className="h-9 w-[200px] rounded-full"
								aria-label={isLocalized ? "الذهاب إلى اليوم" : "Go to today"}
							>
								<CalendarDays className="h-4 w-4 mr-2" />
								<span
									className="text-sm font-medium truncate max-w-[150px]"
									id={titleId}
								/>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									try {
										miniCalendarRef.current?.getApi?.()?.next?.();
									} catch {}
								}}
								aria-label={isLocalized ? "التالي" : "Next"}
								className="size-9 rounded-full"
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
						<div
							ref={miniCalendarContainerRef}
							className="border rounded-md overflow-hidden bg-card flex-1 min-h-0"
						>
							<CalendarCore
								ref={miniCalendarRef}
								events={miniEvents}
								currentView="listMonth"
								currentDate={miniCalDate}
								isLocalized={isLocalized}
								freeRoam={true}
								slotTimes={miniSlotTimes}
								slotTimesKey={miniSlotTimesKey}
								calendarHeight={miniCalendarHeight}
								onEventClick={handleMiniEventClick}
								onNavDate={handleMiniNavDate}
								// Disable validRange constraints for sidebar mini calendar to allow past navigation
								overrideValidRange={true}
								onDatesSet={(info) => {
									try {
										const el = document.getElementById(titleId);
										if (el) el.textContent = String(info?.view?.title || "");
										const cs = info?.view?.currentStart as Date | undefined;
										const ce = info?.view?.currentEnd as Date | undefined;
										const today = new Date();
										today.setHours(0, 0, 0, 0);
										if (cs && ce) {
											setMiniIsTodayDisabled(today >= cs && today < ce);
										}
									} catch {}
								}}
								onViewDidMount={(info) => {
									try {
										const el = document.getElementById(titleId);
										if (el) el.textContent = String(info?.view?.title || "");
										// Fallback compute via API on first mount
										const api = miniCalendarRef.current?.getApi?.();
										const cs = api?.view?.currentStart as Date | undefined;
										const ce = api?.view?.currentEnd as Date | undefined;
										if (cs && ce) {
											const today = new Date();
											today.setHours(0, 0, 0, 0);
											setMiniIsTodayDisabled(today >= cs && today < ce);
										}
									} catch {}
								}}
								droppable={false}
							/>
						</div>
					</div>
					{/* Save status row (reads from window vars set by the Documents page) */}
					<div className="pt-3 border-t border-sidebar-border text-sm text-muted-foreground flex items-center gap-2">
						{!mounted ? null : docSaveState.loading ? (
							<>
								<CircleDashed className="h-4 w-4 animate-spin" />
								<span>{i18n.getMessage("loading", isLocalized)}</span>
							</>
						) : docSaveState.saving ? (
							<>
								<CircleDashed className="h-4 w-4 animate-spin" />
								<span>{i18n.getMessage("saving", isLocalized)}</span>
							</>
						) : docSaveState.isDirty ? (
							<>
								<CircleAlert className="h-4 w-4 text-amber-500" />
								<span>{i18n.getMessage("unsaved_changes", isLocalized)}</span>
							</>
						) : (
							<>
								<CheckCircle2 className="h-4 w-4 text-emerald-600" />
								<span>{i18n.getMessage("saved", isLocalized)}</span>
							</>
						)}
					</div>
				</SidebarContent>
			</Sidebar>
		);
	}

	return (
		<Sidebar {...props} className="bg-sidebar">
			<SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
				<div className="flex items-center gap-2 mb-4">
					<Calendar className="h-6 w-6" />
					<span className="font-semibold">
						{isLocalized ? "مدير الحجوزات" : "Reservation Manager"}
					</span>
				</div>

				{/* Tab Navigation */}
				<div className="flex space-x-0.5 bg-muted p-0.5 rounded-md border border-border">
					<button
						type="button"
						onClick={() => handleTabChange("calendar")}
						className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
							activeTab === "calendar"
								? "bg-background text-foreground shadow-sm border border-border"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Calendar className="h-3.5 w-3.5" />
						{isLocalized ? "التقويم" : "Calendar"}
					</button>
					<button
						type="button"
						onClick={() => handleTabChange("chat")}
						className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
							activeTab === "chat"
								? "bg-background text-foreground shadow-sm border border-border"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<MessageSquare className="h-3.5 w-3.5" />
						{isLocalized ? "الدردشة" : "Chat"}
					</button>
				</div>
			</SidebarHeader>

			<SidebarContent className="p-0 bg-sidebar">
				{activeTab === "calendar" ? (
					<div className="space-y-4">
						{/* Prayer Times */}
						<SidebarGroup className="p-4">
							<SidebarGroupLabel className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								{isLocalized ? "مواقيت الصلاة" : "Prayer Times"}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<PrayerTimesWidget />
							</SidebarGroupContent>
						</SidebarGroup>
					</div>
				) : (
					<ChatSidebarContent
						selectedConversationId={selectedConversationId ?? null}
						onConversationSelect={selectConversation}
						onRefresh={refreshData}
						className="flex-1"
					/>
				)}
			</SidebarContent>
		</Sidebar>
	);
}
