import { sortWaIdsByChatOrder } from "@processes/customers/customer-list.process";
import { useSpinnerVisibility } from "@shared/libs/hooks/use-spinner-visibility";
import { i18n } from "@shared/libs/i18n";
import { getLocalizedCountryOptions } from "@shared/libs/phone/countries";
import { useConversations } from "@shared/libs/query/conversations.hooks";
import { useReservations } from "@shared/libs/query/reservations.hooks";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { Button, Button as UIButton } from "@ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@ui/toggle-group";
import { CheckCircle2, ChevronDown, Clock, Loader2, Plus } from "lucide-react";
import React from "react";
import type { DateRange } from "react-day-picker";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import { isUnknownName } from "@/services/phone/phone-options.service";
import { Calendar } from "@/shared/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/shared/ui/command";
import { type CountryCode, Flag as FlagComponent } from "@/shared/ui/flag";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

// Using shared Flag component

type PhoneNumberSelectorBaseProps = {
	search: string;
	setSearch: (s: string) => void;
	visiblePhones: IndexedPhoneOption[];
	allIndexedPhones?: IndexedPhoneOption[];
	selectedPhone: string;
	onSelect: (phoneNumber: string) => void;
	canCreateNew: boolean;
	onCreateNew: (raw: string) => void;
	addPreviewDisplay: string;
	isLocalized: boolean;
	selectedRef?: React.RefObject<HTMLDivElement | null>;
	allowCreateNew?: boolean;
	/** Optional async search/loading flags */
	isSearching?: boolean;
	/** Optional error + retry for async search */
	hasError?: boolean;
	retry?: () => void;
	/** Optional current number to show under a "Current" section when not searching */
	currentCandidate?: string | undefined;
};

// Constants for pagination and filtering
const PHONE_LIST_PAGE_SIZE = 50;
const LAST_SEVEN_DAYS_OFFSET = 6;
const LAST_THIRTY_DAYS_OFFSET = 29;

// Helper function to set up all state and memos for phone selector
const usePhoneNumberSelectorState = (props: PhoneNumberSelectorBaseProps) => {
	const {
		search,
		setSearch,
		visiblePhones,
		allIndexedPhones,
		isLocalized,
		isSearching,
		hasError,
		retry,
		currentCandidate,
	} = props;

	// Normalize phone strings for comparison (ignore spaces, hyphens, and '+')
	const normalizePhone = React.useCallback(
		(s: string) =>
			String(s || "")
				.replace(/[\s\-+]/g, "")
				.toLowerCase(),
		[]
	);

	// Quick filter state: all | registered | unknown
	const [filter, setFilter] = React.useState<"all" | "registered" | "unknown">(
		"all"
	);

	// Country filter state (single selection)
	const [countryFilter, setCountryFilter] = React.useState<CountryCode | "">(
		""
	);

	// Country selector popover state for the badge + searches
	const [isCountryBadgeOpen, setIsCountryBadgeOpen] = React.useState(false);
	const [countryBadgeSearch, setCountryBadgeSearch] = React.useState("");
	const [countrySubmenuSearch, setCountrySubmenuSearch] = React.useState("");

	// Control dropdown open state to prevent closing parent popover
	const [dropdownOpen, setDropdownOpen] = React.useState(false);
	const preventMenuCloseRef = React.useRef(false);
	const markNestedInteraction = React.useCallback((reason?: string) => {
		if (reason) {
			try {
				// Silently ignore any errors
			} catch {
				// Error handling not needed
			}
		}
		preventMenuCloseRef.current = true;
	}, []);
	const handleDropdownOpenChange = React.useCallback((nextOpen: boolean) => {
		if (!nextOpen && preventMenuCloseRef.current) {
			preventMenuCloseRef.current = false;
			return;
		}
		preventMenuCloseRef.current = false;
		setDropdownOpen(nextOpen);
	}, []);

	// Date range filter state and mode: "message" | "reservation" | "none"
	const [dateFilterMode, setDateFilterMode] = React.useState<
		"none" | "message" | "reservation"
	>("none");
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
		undefined
	);
	const _datePresets = React.useMemo(
		() => [
			{
				key: "today",
				label: isLocalized ? "اليوم" : "Today",
				compute: () => {
					const now = new Date();
					const start = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate()
					);
					return { from: start, to: start } satisfies DateRange;
				},
			},
			{
				key: "yesterday",
				label: isLocalized ? "أمس" : "Yesterday",
				compute: () => {
					const now = new Date();
					now.setDate(now.getDate() - 1);
					const start = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate()
					);
					return { from: start, to: start } satisfies DateRange;
				},
			},
			{
				key: "last7",
				label: isLocalized ? "آخر 7 أيام" : "Last 7 days",
				compute: () => {
					const now = new Date();
					const end = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate()
					);
					const start = new Date(end);
					start.setDate(start.getDate() - LAST_SEVEN_DAYS_OFFSET);
					return { from: start, to: end } satisfies DateRange;
				},
			},
			{
				key: "last30",
				label: isLocalized ? "آخر 30 يوم" : "Last 30 days",
				compute: () => {
					const now = new Date();
					const end = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate()
					);
					const start = new Date(end);
					start.setDate(start.getDate() - LAST_THIRTY_DAYS_OFFSET);
					return { from: start, to: end } satisfies DateRange;
				},
			},
			{
				key: "thisMonth",
				label: isLocalized ? "هذا الشهر" : "This month",
				compute: () => {
					const now = new Date();
					const start = new Date(now.getFullYear(), now.getMonth(), 1);
					const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
					return { from: start, to: end } satisfies DateRange;
				},
			},
			{
				key: "prevMonth",
				label: isLocalized ? "الشهر الماضي" : "Previous month",
				compute: () => {
					const now = new Date();
					const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
					const end = new Date(now.getFullYear(), now.getMonth(), 0);
					return { from: start, to: end } satisfies DateRange;
				},
			},
		],
		[isLocalized]
	);

	// Load conversations/reservations via TanStack Query
	// Limit to last 50 recents for performance and UX
	const conversationsQuery = useConversations({ recent: "month", limit: 50 });
	const reservationsQuery = useReservations();
	const conversations = (conversationsQuery.data?.data || {}) as Record<
		string,
		Array<{ date?: string; ts?: string; time?: string; datetime?: string }>
	>;
	const reservations = (reservationsQuery.data?.data || {}) as Record<
		string,
		Array<{ date?: string }>
	>;

	const matchesCountry = React.useCallback(
		(option: IndexedPhoneOption) => {
			if (!countryFilter) {
				return true;
			}
			const raw = String(
				(option as unknown as { __country?: string })?.__country || ""
			);
			const codeUpper = raw.trim().toUpperCase();
			return codeUpper === countryFilter;
		},
		[countryFilter]
	);

	const isWithinRange = React.useCallback(
		(dateStr?: string): boolean => {
			try {
				if (!dateFilterMode || dateFilterMode === "none") {
					return true;
				}
				if (!(dateRange?.from && dateRange?.to)) {
					return true;
				}
				if (!dateStr) {
					return false;
				}
				const d = new Date(dateStr);
				return d >= (dateRange.from as Date) && d <= (dateRange.to as Date);
			} catch {
				return true;
			}
		},
		[dateFilterMode, dateRange]
	);

	const matchesDateFilter = React.useCallback(
		(option: IndexedPhoneOption) => {
			if (!dateFilterMode || dateFilterMode === "none") {
				return true;
			}
			const wa = option.number;
			if (dateFilterMode === "message") {
				const msgs = (
					conversations as Record<string, Array<{ date?: string }>>
				)?.[wa];
				if (!Array.isArray(msgs) || msgs.length === 0) {
					return false;
				}
				return msgs.some((m) => isWithinRange(m?.date));
			}
			if (dateFilterMode === "reservation") {
				const list = (
					reservations as Record<string, Array<{ date?: string }>>
				)?.[wa];
				if (!Array.isArray(list) || list.length === 0) {
					return false;
				}
				return list.some((r) => isWithinRange(r?.date));
			}
			return true;
		},
		[
			dateFilterMode,
			isWithinRange /* defer conversations/reservations below */,
			conversations,
			reservations,
		]
	);

	const quickFilteredPhones = React.useMemo(() => {
		const base =
			filter === "all"
				? visiblePhones
				: visiblePhones.filter((option) => {
						const isUnknown =
							isUnknownName(option.name, isLocalized) ||
							option.name ===
								i18n.getMessage("phone_new_number_label", isLocalized);
						return filter === "registered" ? !isUnknown : isUnknown;
					});
		return base.filter(matchesCountry).filter(matchesDateFilter);
	}, [filter, visiblePhones, isLocalized, matchesCountry, matchesDateFilter]);

	// Sort helper: entries with a phone number first, then by label/name/number alphabetically
	const compareHasPhoneThenAlpha = React.useCallback(
		(a: IndexedPhoneOption, b: IndexedPhoneOption) => {
			const hasA = Boolean(String(a.number || "").trim());
			const hasB = Boolean(String(b.number || "").trim());
			if (hasA !== hasB) {
				return hasA ? -1 : 1;
			}
			const an = (a.name || a.label || a.number || "").toString();
			const bn = (b.name || b.label || b.number || "").toString();
			return an.localeCompare(bn, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		},
		[]
	);

	/* no-op: search-mode list uses quickFilteredPhones directly for now */

	// Smooth spinner only during active text search
	const showSpinner = useSpinnerVisibility(
		!!isSearching && !!(search || "").trim(),
		{
			showDelayMs: 150,
			minVisibleMs: 350,
		}
	);

	// Sectioned rendering when not searching: Current / Recent / All (paginated)
	const isSearchMode = (search || "").trim().length > 0;
	// conversations already loaded above

	const normalizedAll: IndexedPhoneOption[] = React.useMemo(
		() =>
			allIndexedPhones && allIndexedPhones.length > 0
				? allIndexedPhones
				: visiblePhones,
		[allIndexedPhones, visiblePhones]
	);

	// Apply top filter (All/Registered/Unknown) only to section lists (Recent/All), not Current
	const matchesTopFilter = React.useCallback(
		(option: IndexedPhoneOption) => {
			if (filter === "all") {
				return true;
			}
			const unknown =
				isUnknownName(option.name, isLocalized) ||
				option.name === i18n.getMessage("phone_new_number_label", isLocalized);
			return filter === "registered" ? !unknown : unknown;
		},
		[filter, isLocalized]
	);

	// Exclude current candidate (if present) from Recent and All sections
	const normalizedCurrent = React.useMemo(
		() => normalizePhone(String(currentCandidate || "")),
		[currentCandidate, normalizePhone]
	);

	const sectionPool: IndexedPhoneOption[] = React.useMemo(
		() =>
			normalizedAll
				.filter(matchesTopFilter)
				.filter(matchesCountry)
				.filter((p) => normalizePhone(p.number) !== normalizedCurrent),
		[
			normalizedAll,
			matchesTopFilter,
			matchesCountry,
			normalizedCurrent,
			normalizePhone,
		]
	);

	const recentPhones: IndexedPhoneOption[] = React.useMemo(() => {
		try {
			const waIds = sectionPool.map((p) => p.number);
			const nameMap = new Map(
				waIds.map((wa) => [
					wa,
					(sectionPool.find((p) => p.number === wa)?.name || "").trim(),
				])
			);
			const ordered = sortWaIdsByChatOrder(
				waIds,
				conversations as Record<
					string,
					Array<{
						ts?: string;
						date?: string;
						time?: string;
						datetime?: string;
					}>
				>,
				(wa) => nameMap.get(wa)
			);
			const byId = new Map(sectionPool.map((p) => [p.number, p] as const));
			return ordered
				.slice(0, PHONE_LIST_PAGE_SIZE)
				.map((wa) => byId.get(wa))
				.filter(Boolean) as IndexedPhoneOption[];
		} catch {
			return [];
		}
	}, [sectionPool, conversations]);

	// Available countries from current dataset (apply search + other filters, but ignore country filter)
	const availableCountries = React.useMemo(() => {
		const options = getLocalizedCountryOptions(isLocalized);
		const labelByCode = new Map<string, string>(
			options.map((o) => [String(o.value).toUpperCase(), o.label] as const)
		);
		// Choose pool:
		// - If searching: use visiblePhones (search-limited)
		// - Else prefer recentPhones if available, otherwise fallback to all
		let basePool: IndexedPhoneOption[];
		if (isSearchMode) {
			basePool = visiblePhones;
		} else if (recentPhones.length > 0) {
			basePool = recentPhones;
		} else {
			basePool = normalizedAll;
		}
		// Apply top filter and date filter only (ignore country filter to show all available choices)
		const filteredPool = basePool
			.filter((p) => matchesTopFilter(p))
			.filter((p) => matchesDateFilter(p));
		const counts = new Map<string, number>();
		for (const p of filteredPool) {
			const raw = String(
				(p as unknown as { __country?: string })?.__country || ""
			);
			const codeUpper = raw.trim().toUpperCase();
			if (!codeUpper) {
				continue;
			}
			counts.set(codeUpper, (counts.get(codeUpper) || 0) + 1);
		}
		return Array.from(counts.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([code, count]) => ({
				code: code as CountryCode,
				count,
				label: labelByCode.get(code) || code,
			}));
	}, [
		isLocalized,
		isSearchMode,
		visiblePhones,
		recentPhones,
		normalizedAll,
		matchesTopFilter,
		matchesDateFilter,
	]);

	const [allPageCount, setAllPageCount] = React.useState(PHONE_LIST_PAGE_SIZE);

	// Base alphabetical list excluding recent
	const allAlphaList: IndexedPhoneOption[] = React.useMemo(() => {
		const recentSet = new Set(recentPhones.map((r) => r.number));
		const list = sectionPool.filter((p) => !recentSet.has(p.number));
		list.sort(compareHasPhoneThenAlpha);
		return list;
	}, [sectionPool, recentPhones, compareHasPhoneThenAlpha]);

	const allAlphaPaged: IndexedPhoneOption[] = React.useMemo(
		() => allAlphaList.slice(0, allPageCount),
		[allAlphaList, allPageCount]
	);

	// Determine if more items remain beyond the current page
	const canLoadMoreAll = React.useMemo(
		() => allAlphaList.length > allPageCount,
		[allAlphaList, allPageCount]
	);

	const loadMoreAll = React.useCallback(
		() => setAllPageCount((n) => n + PHONE_LIST_PAGE_SIZE),
		[]
	);

	const hasAnyContacts = normalizedAll.length > 0;

	return {
		normalizePhone,
		filter,
		setFilter,
		countryFilter,
		setCountryFilter,
		isCountryBadgeOpen,
		setIsCountryBadgeOpen,
		countryBadgeSearch,
		setCountryBadgeSearch,
		countrySubmenuSearch,
		setCountrySubmenuSearch,
		dropdownOpen,
		setDropdownOpen,
		markNestedInteraction,
		handleDropdownOpenChange,
		dateFilterMode,
		setDateFilterMode,
		dateRange,
		setDateRange,
		_datePresets,
		quickFilteredPhones,
		showSpinner,
		isSearchMode,
		availableCountries,
		recentPhones,
		allAlphaPaged,
		canLoadMoreAll,
		loadMoreAll,
		hasAnyContacts,
		setSearch,
		hasError,
		retry,
		normalizedAll,
	};
};

// Helper function to handle Enter key press in input
const handleEnterKeyInInput = (
	e: React.KeyboardEvent<HTMLInputElement>,
	{
		search,
		canCreateNew,
		onCreateNew,
		visiblePhones,
		allowCreateNew,
		onSelect,
	}: {
		search: string;
		canCreateNew: boolean;
		onCreateNew: (raw: string) => void;
		visiblePhones: IndexedPhoneOption[];
		allowCreateNew?: boolean;
		onSelect: (phoneNumber: string) => void;
	}
) => {
	// Create-new when allowed and meaningful
	if (canCreateNew) {
		e.preventDefault();
		e.stopPropagation();
		onCreateNew(search);
		return;
	}

	// Fallback: no matches but input exists and allowCreateNew is enabled
	if (search.trim() && visiblePhones.length === 0 && allowCreateNew) {
		e.preventDefault();
		e.stopPropagation();
		onCreateNew(search);
		return;
	}

	// Otherwise select the currently highlighted item
	try {
		const root = (e.currentTarget.closest("[cmdk-root]") ||
			e.currentTarget.parentElement) as HTMLElement | null;
		const active = root?.querySelector(
			"[cmdk-item][data-selected='true']"
		) as HTMLElement | null;
		const selectedNumber = active?.getAttribute("data-option-number");
		if (selectedNumber) {
			e.preventDefault();
			e.stopPropagation();
			onSelect(selectedNumber);
		}
	} catch {
		// Silently ignore DOM access errors
	}
};

// Helper component for filter controls
const FilterControls: React.FC<{
	filter: "all" | "registered" | "unknown";
	setFilter: (f: "all" | "registered" | "unknown") => void;
	countryFilter: string;
	setCountryFilter: (c: string) => void;
	isCountryBadgeOpen: boolean;
	setIsCountryBadgeOpen: (open: boolean) => void;
	countryBadgeSearch: string;
	setCountryBadgeSearch: (s: string) => void;
	dropdownOpen: boolean;
	handleDropdownOpenChange: (open: boolean) => void;
	markNestedInteraction: (reason?: string) => void;
	countrySubmenuSearch: string;
	setCountrySubmenuSearch: (s: string) => void;
	setDateFilterMode: (mode: "none" | "message" | "reservation") => void;
	dateFilterMode: "none" | "message" | "reservation";
	dateRange: DateRange | undefined;
	setDateRange: (range: DateRange | undefined) => void;
	availableCountries: Array<{ code: string; count: number; label: string }>;
	isLocalized: boolean;
	setDropdownOpen: (open: boolean) => void;
}> = ({
	filter,
	setFilter,
	countryFilter,
	setCountryFilter,
	isCountryBadgeOpen,
	setIsCountryBadgeOpen,
	countryBadgeSearch,
	setCountryBadgeSearch,
	dropdownOpen,
	handleDropdownOpenChange,
	markNestedInteraction,
	countrySubmenuSearch,
	setCountrySubmenuSearch,
	setDateFilterMode,
	dateFilterMode,
	dateRange,
	setDateRange,
	availableCountries,
	isLocalized,
	setDropdownOpen,
}) => {
	return (
		<div className="border-b p-2">
			<div className="flex items-center gap-1">
				<ToggleGroup
					className="gap-0"
					onValueChange={(val: "registered" | "unknown" | "") =>
						setFilter(val || "all")
					}
					type="single"
					value={filter === "all" ? "" : filter}
					variant="outline"
				>
					<ToggleGroupItem
						aria-label={i18n.getMessage("phone_filter_registered", isLocalized)}
						className="-ml-px h-5 min-w-5 rounded-none px-1 text-[10px] first:ml-0 first:rounded-l-md last:rounded-r-md"
						value="registered"
					>
						{i18n.getMessage("phone_filter_registered", isLocalized)}
					</ToggleGroupItem>
					<ToggleGroupItem
						aria-label={i18n.getMessage("phone_filter_unknown", isLocalized)}
						className="-ml-px h-5 min-w-5 rounded-none px-1 text-[10px] first:ml-0 first:rounded-l-md last:rounded-r-md"
						value="unknown"
					>
						{i18n.getMessage("phone_filter_unknown", isLocalized)}
					</ToggleGroupItem>
				</ToggleGroup>

				{/* Country flag chip (single selection) - clickable popover with search */}
				{countryFilter ? (
					<Popover
						modal={false}
						onOpenChange={setIsCountryBadgeOpen}
						open={isCountryBadgeOpen}
					>
						<PopoverTrigger asChild>
							<button
								className="ml-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 transition-colors hover:bg-muted"
								onClick={() => {
									setIsCountryBadgeOpen(true);
									setCountryBadgeSearch("");
								}}
								type="button"
							>
								<FlagComponent
									className="size-3.5"
									country={countryFilter as CountryCode}
								/>
							</button>
						</PopoverTrigger>
						<PopoverContent
							align="start"
							className="w-[18.75rem] p-0"
							dir="ltr"
							onInteractOutside={(e) => {
								const target = e.target as HTMLElement | null;
								if (!target) {
									return;
								}
								if (target.closest("[data-phone-selector-menu]")) {
									e.preventDefault();
								}
							}}
							sideOffset={4}
							style={{ zIndex: Z_INDEX.ENHANCED_OVERLAY }}
						>
							<Command dir="ltr" shouldFilter={false}>
								<CommandInput
									dir="ltr"
									onValueChange={setCountryBadgeSearch}
									placeholder={i18n.getMessage(
										"phone_country_search_placeholder",
										isLocalized
									)}
									value={countryBadgeSearch}
								/>
								<CommandList dir="ltr">
									<ThemedScrollbar className="h-72" native={true} rtl={false}>
										<CommandEmpty>
											{i18n.getMessage("phone_no_country_found", isLocalized)}
										</CommandEmpty>
										<CommandGroup dir="ltr">
											{availableCountries
												.filter((c) =>
													c.label
														.toLowerCase()
														.includes(countryBadgeSearch.toLowerCase())
												)
												.map((c) => (
													<CommandItem
														className="gap-2"
														key={c.code as string}
														onSelect={() => {
															setCountryFilter(c.code);
															setIsCountryBadgeOpen(false);
															setCountryBadgeSearch("");
														}}
														value={c.code as string}
													>
														<FlagComponent
															className="size-4"
															country={c.code as CountryCode}
														/>
														<span className="flex-1 text-sm">
															{c.label}{" "}
															<span className="text-muted-foreground">
																({c.count})
															</span>
														</span>
														{countryFilter === c.code && (
															<CheckCircle2 className="ms-auto size-4 text-primary" />
														)}
													</CommandItem>
												))}
										</CommandGroup>
									</ThemedScrollbar>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				) : null}

				{/* Add filter (+) nested dropdown */}
				<DropdownMenu
					modal={false}
					onOpenChange={handleDropdownOpenChange}
					open={dropdownOpen}
				>
					<DropdownMenuTrigger asChild>
						<Button
							className="ml-1 h-6 px-1.5"
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									markNestedInteraction();
								}
							}}
							onPointerDown={() => markNestedInteraction()}
							size="sm"
							variant="outline"
						>
							<Plus className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-56"
						data-phone-selector-menu
						onInteractOutside={(e) => {
							const target = e.target as HTMLElement | null;
							if (!target) {
								return;
							}
							if (
								target.closest('[role="menuitem"]') ||
								target.closest('[role="menu"]')
							) {
								markNestedInteraction();
								e.preventDefault();
							}
						}}
						onPointerDown={() => markNestedInteraction()}
						sideOffset={4}
					>
						<CountryFilterMenu
							availableCountries={availableCountries}
							countrySubmenuSearch={countrySubmenuSearch}
							isLocalized={isLocalized}
							markNestedInteraction={markNestedInteraction}
							setCountryFilter={setCountryFilter}
							setCountrySubmenuSearch={setCountrySubmenuSearch}
							setDropdownOpen={setDropdownOpen}
						/>
						<DateFilterMenu
							dateFilterMode={dateFilterMode}
							dateRange={dateRange}
							isLocalized={isLocalized}
							markNestedInteraction={markNestedInteraction}
							setDateFilterMode={setDateFilterMode}
							setDateRange={setDateRange}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
};

// Helper component for country filter menu
const CountryFilterMenu: React.FC<{
	availableCountries: Array<{ code: string; count: number; label: string }>;
	countrySubmenuSearch: string;
	isLocalized: boolean;
	markNestedInteraction: (reason?: string) => void;
	setCountryFilter: (c: string) => void;
	setCountrySubmenuSearch: (s: string) => void;
	setDropdownOpen: (open: boolean) => void;
}> = ({
	availableCountries,
	countrySubmenuSearch,
	isLocalized,
	markNestedInteraction,
	setCountryFilter,
	setCountrySubmenuSearch,
	setDropdownOpen,
}) => (
	<DropdownMenuSub
		onOpenChange={(open) => {
			if (open) {
				markNestedInteraction("country submenu open");
			}
		}}
	>
		<DropdownMenuSubTrigger
			className="px-2 py-1.5"
			data-disabled={availableCountries.length === 0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					markNestedInteraction("country sub trigger key");
				}
			}}
			onPointerDown={(e) => {
				markNestedInteraction("country sub trigger pointer down");
				e.preventDefault();
			}}
		>
			{isLocalized ? "الدولة" : "Country"}
		</DropdownMenuSubTrigger>
		<DropdownMenuSubContent
			className="w-[18.75rem] p-0"
			{...(availableCountries.length === 0 ? { hidden: true } : {})}
			data-phone-selector-menu
			onPointerDown={() => {
				markNestedInteraction("country sub content pointer");
			}}
			onPointerDownCapture={() => {
				markNestedInteraction("country sub content capture");
			}}
		>
			<Command dir="ltr" shouldFilter={false}>
				<CommandInput
					dir="ltr"
					onValueChange={setCountrySubmenuSearch}
					placeholder={i18n.getMessage(
						"phone_country_search_placeholder",
						isLocalized
					)}
					value={countrySubmenuSearch}
				/>
				<CommandList dir="ltr">
					<ThemedScrollbar className="h-72" native={true} rtl={false}>
						<CommandEmpty>
							{i18n.getMessage("phone_no_country_found", isLocalized)}
						</CommandEmpty>
						<CommandGroup dir="ltr">
							{availableCountries
								.filter((c) =>
									c.label
										.toLowerCase()
										.includes(countrySubmenuSearch.toLowerCase())
								)
								.map((c) => (
									<CommandItem
										className="gap-2"
										key={c.code as string}
										onSelect={() => {
											setCountryFilter(c.code);
											setDropdownOpen(false);
											setCountrySubmenuSearch("");
										}}
										value={c.code as string}
									>
										<FlagComponent
											className="size-4"
											country={c.code as CountryCode}
										/>
										<span className="flex-1 text-sm">
											{c.label}{" "}
											<span className="text-muted-foreground">({c.count})</span>
										</span>
									</CommandItem>
								))}
						</CommandGroup>
					</ThemedScrollbar>
				</CommandList>
			</Command>
		</DropdownMenuSubContent>
	</DropdownMenuSub>
);

// Helper component for date filter menu
const DateFilterMenu: React.FC<{
	dateFilterMode: "none" | "message" | "reservation";
	dateRange: DateRange | undefined;
	isLocalized: boolean;
	markNestedInteraction: (reason?: string) => void;
	setDateFilterMode: (mode: "none" | "message" | "reservation") => void;
	setDateRange: (range: DateRange | undefined) => void;
}> = ({
	dateFilterMode,
	dateRange,
	isLocalized,
	markNestedInteraction,
	setDateFilterMode,
	setDateRange,
}) => (
	<DropdownMenuSub>
		<DropdownMenuSubTrigger
			className="px-2 py-1.5"
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					markNestedInteraction("date sub trigger key");
				}
			}}
			onPointerDown={(e) => {
				markNestedInteraction("date sub trigger pointer");
				e.preventDefault();
			}}
			onPointerDownCapture={() =>
				markNestedInteraction("date sub trigger capture")
			}
		>
			{isLocalized ? "تاريخ" : "Date Range"}
		</DropdownMenuSubTrigger>
		<DropdownMenuSubContent
			className="p-0"
			data-phone-selector-menu
			onInteractOutside={(e) => {
				const target = e.target as HTMLElement | null;
				if (!target) {
					return;
				}
				if (
					target.closest('[role="menuitem"]') ||
					target.closest('[role="menu"]')
				) {
					markNestedInteraction("date sub content interact");
					e.preventDefault();
				}
			}}
			onPointerDown={() => markNestedInteraction("date sub content pointer")}
			onPointerDownCapture={() =>
				markNestedInteraction("date sub content capture")
			}
		>
			<div className="w-[18.75rem] p-2">
				<div className="mb-2 flex items-center gap-2">
					<UIButton
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setDateFilterMode("message");
						}}
						size="sm"
						variant={dateFilterMode === "message" ? "secondary" : "outline"}
					>
						{isLocalized ? "رسائل" : "Message"}
					</UIButton>
					<UIButton
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setDateFilterMode("reservation");
						}}
						size="sm"
						variant={dateFilterMode === "reservation" ? "secondary" : "outline"}
					>
						{isLocalized ? "حجوزات" : "Reservation"}
					</UIButton>

					{/* Clear */}
					<UIButton
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setDateFilterMode("none");
							setDateRange(undefined);
						}}
						size="sm"
						variant="ghost"
					>
						{isLocalized ? "مسح" : "Clear"}
					</UIButton>
				</div>

				<Calendar
					mode="range"
					{...(dateRange ? { selected: dateRange } : {})}
					className="p-2"
					onSelect={(range) => setDateRange(range as DateRange)}
				/>
			</div>
		</DropdownMenuSubContent>
	</DropdownMenuSub>
);

export const PhoneNumberSelectorContent: React.FC<
	PhoneNumberSelectorBaseProps
> = (props) => {
	const state = usePhoneNumberSelectorState(props);
	const {
		search,
		visiblePhones,
		canCreateNew,
		onCreateNew,
		isLocalized,
		selectedRef,
		allowCreateNew,
		currentCandidate,
		onSelect,
		selectedPhone,
		addPreviewDisplay,
	} = props;

	const {
		normalizePhone,
		filter,
		setFilter,
		countryFilter,
		setCountryFilter: _setCountryFilter,
		isCountryBadgeOpen,
		setIsCountryBadgeOpen,
		countryBadgeSearch,
		setCountryBadgeSearch,
		countrySubmenuSearch,
		setCountrySubmenuSearch,
		dropdownOpen,
		setDropdownOpen,
		markNestedInteraction,
		handleDropdownOpenChange,
		dateFilterMode,
		setDateFilterMode,
		dateRange,
		setDateRange,
		quickFilteredPhones,
		showSpinner,
		isSearchMode,
		availableCountries,
		recentPhones,
		allAlphaPaged,
		canLoadMoreAll,
		loadMoreAll,
		hasAnyContacts,
		setSearch,
		hasError,
		retry,
		normalizedAll,
	} = state;

	// Wrapper for setCountryFilter to match expected function signature
	const setCountryFilter = (c: string) => {
		_setCountryFilter(c as CountryCode | "");
	};

	return (
		<Command
			className={hasAnyContacts ? undefined : "min-w-80"}
			shouldFilter={false}
		>
			<CommandInput
				dir="ltr"
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						handleEnterKeyInInput(e, {
							search,
							canCreateNew,
							onCreateNew,
							visiblePhones,
							...(allowCreateNew !== undefined ? { allowCreateNew } : {}),
							onSelect,
						});
					}
				}}
				onValueChange={setSearch}
				placeholder={i18n.getMessage("phone_search_placeholder", isLocalized)}
				value={search}
			/>
			<FilterControls
				availableCountries={availableCountries}
				countryBadgeSearch={countryBadgeSearch}
				countryFilter={countryFilter}
				countrySubmenuSearch={countrySubmenuSearch}
				dateFilterMode={dateFilterMode}
				dateRange={dateRange}
				dropdownOpen={dropdownOpen}
				filter={filter}
				handleDropdownOpenChange={handleDropdownOpenChange}
				isCountryBadgeOpen={isCountryBadgeOpen}
				isLocalized={isLocalized}
				markNestedInteraction={markNestedInteraction}
				setCountryBadgeSearch={setCountryBadgeSearch}
				setCountryFilter={setCountryFilter}
				setCountrySubmenuSearch={setCountrySubmenuSearch}
				setDateFilterMode={setDateFilterMode}
				setDateRange={setDateRange}
				setDropdownOpen={setDropdownOpen}
				setFilter={setFilter}
				setIsCountryBadgeOpen={setIsCountryBadgeOpen}
			/>

			<CommandList dir="ltr">
				<ThemedScrollbar className="h-72" native={true} rtl={false}>
					{showSpinner ? (
						<div className="flex items-center justify-center p-4">
							<Loader2 className="size-4 animate-spin" />
							<span className="ml-2 text-muted-foreground text-sm">
								{i18n.getMessage("loading", isLocalized)}
							</span>
						</div>
					) : null}
					{!showSpinner && hasError ? (
						<div className="flex flex-col items-center gap-3 p-4 text-center">
							{/* Reuse CommandEmpty styling context but custom UI */}
							<span className="font-medium text-destructive text-sm">
								{i18n.getMessage("save_failed", isLocalized)}
							</span>
							<span className="text-muted-foreground text-xs">
								{i18n.getMessage(
									"backend_connection_error_description",
									isLocalized
								)}
							</span>
							<button
								className="inline-flex h-7 items-center justify-center rounded-md border px-2 text-xs"
								onClick={() => retry?.()}
								type="button"
							>
								{i18n.getMessage("backend_connection_error_retry", isLocalized)}
							</button>
						</div>
					) : null}
					{isSearchMode && canCreateNew && (
						<div className="p-2">
							<CommandItem
								className="gap-2 text-blue-600 hover:text-blue-700"
								onSelect={() => onCreateNew(search)}
								value="create-new"
							>
								<Plus className="size-4" />
								<span>
									{i18n
										.getMessage("phone_add_number_label", isLocalized)
										.replace("{value}", addPreviewDisplay)}
								</span>
							</CommandItem>
						</div>
					)}
					{isSearchMode ? (
						<>
							<CommandEmpty>
								{i18n.getMessage("phone_no_phone_found", isLocalized)}
							</CommandEmpty>
							<CommandGroup dir="ltr">
								{quickFilteredPhones.map((option) => {
									const isSelected =
										normalizePhone(selectedPhone) ===
										normalizePhone(option.number);
									return (
										<CommandItem
											className="gap-3 px-3 py-2.5"
											data-option-number={option.number}
											key={option.number}
											onSelect={() => onSelect(option.number)}
											{...(isSelected
												? {
														ref: selectedRef as React.RefObject<HTMLDivElement | null>,
													}
												: {})}
											value={option.number}
										>
											<div className="flex min-w-0 flex-1 flex-col space-y-2">
												<span className="truncate font-medium text-foreground text-sm leading-tight">
													{option.name || option.displayNumber || option.number}
												</span>
												<div className="flex items-center gap-1.5">
													<FlagComponent
														className="max-w-full scale-75 overflow-hidden opacity-60"
														country={option.__country as unknown as string}
													/>
													<span className="truncate text-muted-foreground text-sm leading-tight">
														{option.displayNumber || option.number}
													</span>
												</div>
											</div>
											{isSelected && (
												<CheckCircle2 className="ms-auto size-4 text-primary" />
											)}
										</CommandItem>
									);
								})}
							</CommandGroup>
						</>
					) : (
						<>
							{Boolean((currentCandidate || "").trim()) && (
								<CommandGroup
									heading={i18n.getMessage("current_contact", isLocalized)}
								>
									<CommandItem
										className="gap-3 px-3 py-2.5"
										data-option-number={(currentCandidate || "").trim()}
										onSelect={() => onSelect((currentCandidate || "").trim())}
										value={(currentCandidate || "").trim()}
									>
										<div className="flex min-w-0 flex-1 flex-col space-y-1">
											<span className="truncate font-medium text-foreground text-sm leading-tight">
												{/* Show name if available, otherwise display number */}
												{(() => {
													const n = (currentCandidate || "").trim();
													const m = normalizedAll.find(
														(p) =>
															normalizePhone(p.number) === normalizePhone(n)
													);
													return m?.name || m?.displayNumber || n;
												})()}
											</span>
											<span className="truncate text-muted-foreground text-xs leading-tight">
												{(currentCandidate || "").trim()}
											</span>
										</div>
									</CommandItem>
								</CommandGroup>
							)}

							{recentPhones.length > 0 && (
								<CommandGroup
									heading={i18n.getMessage("more_recent", isLocalized)}
								>
									{recentPhones.map((option) => {
										const isSelected =
											normalizePhone(selectedPhone) ===
											normalizePhone(option.number);
										return (
											<CommandItem
												className="gap-3 px-3 py-2.5"
												data-option-number={option.number}
												key={`recent-${option.number}`}
												onSelect={() => onSelect(option.number)}
												{...(isSelected
													? {
															ref: selectedRef as React.RefObject<HTMLDivElement | null>,
														}
													: {})}
												value={option.number}
											>
												<Clock className="size-3 opacity-50" />
												<div className="flex min-w-0 flex-1 flex-col space-y-1">
													<span className="truncate font-medium text-foreground text-sm leading-tight">
														{option.name ||
															option.displayNumber ||
															option.number}
													</span>
													<span className="truncate text-muted-foreground text-xs leading-tight">
														{option.displayNumber || option.number}
													</span>
												</div>
												{isSelected && (
													<CheckCircle2 className="ms-auto size-4 text-primary" />
												)}
											</CommandItem>
										);
									})}
								</CommandGroup>
							)}

							<CommandGroup heading={i18n.getMessage("all", isLocalized)}>
								{allAlphaPaged.map((option) => {
									const isSelected =
										normalizePhone(selectedPhone) ===
										normalizePhone(option.number);
									return (
										<CommandItem
											className="gap-3 px-3 py-2.5"
											data-option-number={option.number}
											key={`all-${option.number}`}
											onSelect={() => onSelect(option.number)}
											{...(isSelected
												? {
														ref: selectedRef as React.RefObject<HTMLDivElement | null>,
													}
												: {})}
											value={option.number}
										>
											<div className="flex min-w-0 flex-1 flex-col space-y-1">
												<span className="truncate font-medium text-foreground text-sm leading-tight">
													{option.name || option.displayNumber || option.number}
												</span>
												<span className="truncate text-muted-foreground text-xs leading-tight">
													{option.displayNumber || option.number}
												</span>
											</div>
											{isSelected && (
												<CheckCircle2 className="ms-auto size-4 text-primary" />
											)}
										</CommandItem>
									);
								})}
							</CommandGroup>

							{canLoadMoreAll ? (
								<div className="p-1">
									<button
										className="inline-flex w-full items-center justify-start rounded-md px-2 py-1 text-xs hover:bg-muted"
										onClick={loadMoreAll}
										type="button"
									>
										<ChevronDown className="mr-2 size-3" />
										{i18n.getMessage("load_more", isLocalized)}
									</button>
								</div>
							) : null}
						</>
					)}
				</ThemedScrollbar>
			</CommandList>
		</Command>
	);
};
