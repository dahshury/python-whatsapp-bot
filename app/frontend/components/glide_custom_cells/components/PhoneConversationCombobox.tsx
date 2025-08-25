"use client";

import { ChevronsUpDown, Plus, User, Check as CheckIcon } from "lucide-react";
import React, { useRef, useState } from "react";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useCustomerData } from "@/lib/customer-data-context";
import { cn } from "@/lib/utils";
import { parsePhoneNumber } from "react-phone-number-input";

interface PhoneConversationComboboxProps {
	value?: string;
	onChange?: (phone: string, customerName?: string) => void;
	onBlur?: () => void;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	onOpenChange?: (open: boolean) => void;
}

interface CustomerOption {
	value: string;
	label: string;
	customerName?: string;
	formattedPhone: string;
	hasConversation: boolean;
}

const PhoneConversationComboboxBase = React.forwardRef<
	HTMLButtonElement,
	PhoneConversationComboboxProps
>(
	(
		{
			value = "",
			onChange,
			onBlur,
			onKeyDown,
			placeholder = "Enter phone number",
			className,
			disabled = false,
			onOpenChange,
		},
		ref,
	) => {
			const [searchValue, setSearchValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const _popoverRef = useRef<HTMLDivElement>(null);
	const searchValueRef = useRef("");

	// Combine external ref with internal ref
	const combinedRef = React.useCallback(
		(node: HTMLButtonElement | null) => {
			// Set internal ref
			(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
			// Set external ref if provided
			if (typeof ref === "function") {
				ref(node);
			} else if (ref) {
				(ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
			}
		},
		[ref],
	);

		// Use centralized customer data - EXACT SAME as ConversationCombobox
		const { customers } = useCustomerData();

		// Normalize phone number for comparison (country-agnostic with light KSA fallbacks)
		const normalizePhone = (phone: string) => {
			const raw = (phone || "").toString().trim();
			if (!raw) return "";
			// Prefer robust parse to E.164 when possible
			try {
				const parsed = parsePhoneNumber(raw as any);
				if (parsed?.number) {
					return parsed.number.replace(/^\+/, "");
				}
			} catch {}

			const digits = raw.replace(/\D/g, "");
			// Handle international 00 prefix
			if (digits.startsWith("00")) {
				return digits.substring(2);
			}
			// Light KSA-specific fallbacks for common local-entry variants
			if (digits.startsWith("966")) return digits;
			if (digits.startsWith("0") && digits.length === 10) {
				const withoutZero = digits.substring(1);
				if (withoutZero.startsWith("5")) return `966${withoutZero}`;
			}
			if (digits.startsWith("0") && digits.length === 11) {
				const withoutZero = digits.substring(1);
				if (withoutZero.startsWith("5") && withoutZero.length === 10) {
					return `966${withoutZero.substring(0, 9)}`;
				}
			}
			if (digits.startsWith("010")) {
				return `96655${digits.substring(3)}`;
			}
			// Default: digits only (works cross-country)
			return digits;
		};

		// Create conversation options from centralized customer data - EXACT SAME structure as ConversationCombobox
		const conversationOptions = React.useMemo(() => {
			return customers
				.map((customer: any): CustomerOption => {
					return {
						value: customer.phone,
						label: customer.name
							? `${customer.name} (${customer.formattedPhone || customer.phone})`
							: customer.formattedPhone || customer.phone,
						customerName: customer.name,
						formattedPhone: customer.formattedPhone || customer.phone,
						hasConversation: true,
					};
				})
				.sort((a: CustomerOption, b: CustomerOption) => {
					// Sort by whether they have names first, then alphabetically
					if (a.customerName && !b.customerName) return -1;
					if (!a.customerName && b.customerName) return 1;
					if (a.customerName && b.customerName) {
						return a.customerName.localeCompare(b.customerName);
					}
					return a.value.localeCompare(b.value);
				});
		}, [customers]);

		// Keep search value in sync with ref to prevent resets during re-renders
		React.useEffect(() => {
			searchValueRef.current = searchValue;
		}, [searchValue]);

		// Enhanced filter for both names and phone numbers (like cmdk but with custom logic)
		const filteredOptions = React.useMemo(() => {
			if (!searchValue) {
				console.log(
					"🔍 No search value, returning all options:",
					conversationOptions.length,
				);
				return conversationOptions;
			}

			const searchLower = searchValue.toLowerCase().trim();
			const normalizedSearch = normalizePhone(searchValue);
			console.log(
				"🔍 Filtering with searchValue:",
				searchValue,
				"normalized:",
				normalizedSearch,
			);

			const filtered = conversationOptions.filter((option: CustomerOption) => {
				const normalizedOptionPhone = normalizePhone(option.value);
				const normalizedFormattedPhone = normalizePhone(option.formattedPhone);

				// Search by customer name (most important)
				if (option.customerName?.toLowerCase().includes(searchLower)) {
					return true;
				}

				// Search by formatted phone (visible phone)
				if (option.formattedPhone.toLowerCase().includes(searchLower)) {
					return true;
				}

				// Search by raw phone value
				if (option.value.toLowerCase().includes(searchLower)) {
					return true;
				}

				// Search by normalized phone numbers
				if (
					normalizedSearch.length >= 3 &&
					(normalizedOptionPhone.includes(normalizedSearch) ||
						normalizedFormattedPhone.includes(normalizedSearch))
				) {
					return true;
				}

				return false;
			});

			console.log(
				"🔍 Filtered results:",
				filtered.length,
				"from",
				conversationOptions.length,
				"total options",
			);
			return filtered;
		}, [conversationOptions, searchValue, normalizePhone]);

		// Get selected option - include normalized equality for robustness
		const selectedOption = conversationOptions.find((option) => {
			if (option.value === value || option.formattedPhone === value) return true;
			const nv = normalizePhone(value || "");
			if (!nv) return false;
			return (
				normalizePhone(option.value) === nv ||
				normalizePhone(option.formattedPhone) === nv
			);
		});

		// Check if we can add new customer (typed phone number that doesn't match any existing customer)
		const searchedOption = conversationOptions.find(
			(option) =>
				option.value === searchValue ||
				option.formattedPhone === searchValue ||
				normalizePhone(option.value) === normalizePhone(searchValue) ||
				normalizePhone(option.formattedPhone) === normalizePhone(searchValue),
		);

		const canAddNewCustomer =
			searchValue.trim() &&
			!searchedOption &&
			normalizePhone(searchValue).length >= 10;

		// Close popover manually
		const closePopover = () => {
			setIsOpen(false);
		};

		// Handle adding new customer name
		const handleAddNewCustomer = () => {
			const phoneToUse = searchValue.trim();
			console.log("🔍 handleAddNewCustomer called with:", phoneToUse);
			if (onChange) {
				console.log("🔍 Calling onChange for new customer");
				onChange(phoneToUse, undefined);
				setSearchValue("");
				closePopover();
			} else {
				console.log("🔍 onChange not available for new customer");
			}
		};

		// Fixed: Handle customer selection by phone value (works for both mouse and keyboard)
		const handleCustomerSelectByValue = (phoneValue: string) => {
			const option = conversationOptions.find(
				(opt: CustomerOption) =>
					opt.value === phoneValue || opt.formattedPhone === phoneValue,
			);
			if (option && onChange) {
				onChange(option.formattedPhone, option.customerName);
				setSearchValue("");
				closePopover();
			} else if (onChange) {
				onChange(phoneValue);
				setSearchValue("");
				closePopover();
			}
		};

		// Direct customer selection (for mouse clicks)
		const handleCustomerSelectDirect = (option: CustomerOption) => {
			if (onChange) {
				onChange(option.formattedPhone, option.customerName);
				setSearchValue("");
				closePopover();
			}
		};

		// Note: Scroll effect removed since popover is now uncontrolled

		return (
			<div className={cn("flex h-full", className)}>
				<Popover
					open={isOpen}
					onOpenChange={(open) => {
						setIsOpen(open);
						try { (typeof onOpenChange === 'function') && onOpenChange(open); } catch {}
						if (open) {
							setTimeout(() => {
								try {
									const scroller = document.querySelector(
										".chat-scrollbar .ScrollbarsCustom-Scroller",
									) as HTMLElement | null;
									const targetRaw = (selectedOption?.value || value || "") as string;
									const targetDigits = normalizePhone(targetRaw);
									if (scroller && targetDigits) {
										const byPhone = scroller.querySelector(
											`[data-phone="${targetDigits}"]`
										) as HTMLElement | null;
										const byFormatted = scroller.querySelector(
											`[data-formatted-phone="${targetDigits}"]`
										) as HTMLElement | null;
										let match: HTMLElement | null = byPhone || byFormatted;
										if (!match && selectedOption?.value) {
											match = scroller.querySelector(
												`[data-value="${selectedOption.value}"]`
											) as HTMLElement | null;
										}
										if (!match && targetDigits) {
											const last7 = targetDigits.slice(-7);
											const items = Array.from(
												scroller.querySelectorAll('[data-value]'),
											) as HTMLElement[];
											for (const el of items) {
												const txt = (el.textContent || '').replace(/\D/g, "");
												if (last7 && txt.includes(last7)) { match = el; break; }
											}
										}
										if (match) {
											const offsetTop = match.offsetTop;
											const target = Math.max(0, offsetTop - scroller.clientHeight / 2 + match.clientHeight / 2);
											scroller.scrollTop = target;
										}
									}
								} catch {}
							}, 0);
						}
					}}
				>
					<PopoverTrigger asChild>
						<Button
							ref={combinedRef}
							variant="outline"
							role="combobox"
							disabled={disabled}
							className="w-full justify-between text-sm h-full px-2 border-none bg-transparent focus:ring-0 focus:outline-none"
							style={{
								minHeight: "28px",
								lineHeight: "28px",
								fontSize: "13px",
							}}
						>
							<div className="flex items-center gap-1.5 truncate">
								<User className="h-3 w-3 flex-shrink-0 opacity-50" />
								<span className="truncate">
									{selectedOption ? selectedOption.label : value || placeholder}
								</span>
							</div>
							<ChevronsUpDown className="h-3 w-3 opacity-50 flex-shrink-0" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[300px] p-0"
						align="start"
						onCloseAutoFocus={(e) => e.preventDefault()}
						onEscapeKeyDown={(_e) => {
							setSearchValue("");
							closePopover();
						}}
						onPointerDownOutside={(e) => {
							const target = e.target as HTMLElement;
							if (
								target.closest(".ScrollbarsCustom-Track") ||
								target.closest(".ScrollbarsCustom-Thumb") ||
								target.closest(".ScrollbarsCustom-themed")
							) {
								e.preventDefault();
							}
						}}
						onInteractOutside={(e: any) => {
							const oe = e?.detail?.originalEvent || e?.originalEvent;
							const type = oe?.type;
							// Prevent closing on focus/hover interactions; allow real outside clicks
							if (!type || type === "focusin" || type === "pointermove" || type === "mousemove") {
								e.preventDefault();
								return;
							}
							const target = e.target as HTMLElement;
							if (
								target.closest(".ScrollbarsCustom-Track") ||
								target.closest(".ScrollbarsCustom-Thumb") ||
								target.closest(".ScrollbarsCustom-themed")
							) {
								e.preventDefault();
							}
						}}
					>
						<Command
							shouldFilter={false}
						>
							<CommandInput
								placeholder="Search by name or phone..."
								className="text-sm"
								value={searchValue}
								onValueChange={setSearchValue}
							/>
							<CommandList>
								<ThemedScrollbar
									className="h-72 scrollbar-thin chat-scrollbar"
								>
									<div
										className="h-full"
									>
										<CommandEmpty className="text-xs py-2 text-center">
											No customers found
										</CommandEmpty>
										<CommandGroup>
											{filteredOptions.map((option) => {
												const isSelected = normalizePhone(option.value) === normalizePhone(value) || normalizePhone(option.formattedPhone) === normalizePhone(value);
												return (
													<CommandItem
														key={option.value}
														value={option.value}
														data-value={option.value}
														data-selected={isSelected ? 'true' : 'false'}
														data-phone={normalizePhone(option.value)}
														data-formatted-phone={normalizePhone(option.formattedPhone)}
														onSelect={handleCustomerSelectByValue}
														className={cn(
															"text-sm py-1.5 cursor-pointer flex items-center gap-2 rounded-sm w-full px-2",
															isSelected ? "bg-accent/60 text-foreground" : "",
														)}
													>
														<span className="truncate flex-1 min-w-0">{option.label}</span>
														<CheckIcon className={cn("ml-auto size-4", isSelected ? "opacity-100" : "opacity-0")} />
													</CommandItem>
												);
											})}

											{canAddNewCustomer && (
												<CommandItem
													key="add-new-customer"
													value={`add-new-${searchValue}`}
													data-value={`add-new-${searchValue}`}
													onSelect={handleAddNewCustomer}
													className="text-sm py-1.5 cursor-pointer border-t border-border"
												>
													<div className="flex items-center gap-2 w-full">
														<Plus className="h-3 w-3 text-muted-foreground" />
														<span>Use "{searchValue}"</span>
													</div>
												</CommandItem>
											)}
										</CommandGroup>
									</div>
								</ThemedScrollbar>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		);
	},
);

// Wrap the component with React.memo for enhanced render optimization
export const PhoneConversationCombobox = React.memo(
	PhoneConversationComboboxBase,
	(prevProps, nextProps) => {
		return (
			prevProps.value === nextProps.value &&
			prevProps.disabled === nextProps.disabled &&
			prevProps.placeholder === nextProps.placeholder
		);
	},
);
