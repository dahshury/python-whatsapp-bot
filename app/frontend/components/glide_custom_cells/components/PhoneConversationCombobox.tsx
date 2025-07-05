"use client";

import { ChevronsUpDown, Plus, User } from "lucide-react";
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

interface PhoneConversationComboboxProps {
	value?: string;
	onChange?: (phone: string, customerName?: string) => void;
	onBlur?: () => void;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
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

		// Normalize phone number for comparison
		const normalizePhone = (phone: string) => {
			const digits = phone.replace(/\D/g, "");

			// Handle Saudi numbers that start with 0 (remove leading 0)
			if (digits.startsWith("0") && digits.length === 10) {
				const withoutZero = digits.substring(1); // Remove leading 0 to get 9 digits
				if (withoutZero.startsWith("5")) {
					return `966${withoutZero}`; // 966 + 9 digits = 12 total
				}
			}

			// Handle invalid 11-digit numbers starting with 0 (common typo)
			if (digits.startsWith("0") && digits.length === 11) {
				const withoutZero = digits.substring(1); // Remove leading 0 to get 10 digits
				if (withoutZero.startsWith("5") && withoutZero.length === 10) {
					// Take only first 9 digits after removing 0
					const validNineDigits = withoutZero.substring(0, 9);
					return `966${validNineDigits}`; // 966 + 9 digits = 12 total
				}
			}

			// Handle old format 010 numbers
			if (digits.startsWith("010")) {
				return `96655${digits.substring(3)}`;
			}

			// Already has country code
			else if (digits.startsWith("966")) {
				return digits;
			}

			// 9-digit number starting with 5 (modern Saudi mobile)
			else if (digits.startsWith("5") && digits.length === 9) {
				return `966${digits}`;
			}

			// 9-digit number not starting with 5 (assume mobile, add 55 prefix)
			else if (digits.length === 9) {
				return `96655${digits}`;
			}

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

		// Get selected option - EXACT SAME logic as ConversationCombobox
		const selectedOption = conversationOptions.find(
			(option) => option.value === value || option.formattedPhone === value,
		);

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
						// Only allow opening, not closing through this handler
						if (open) {
							setIsOpen(true);
						}
					}}
				>
					<PopoverTrigger asChild>
						<Button
							ref={combinedRef}
							variant="outline"
							role="combobox"
							disabled={disabled}
							onClick={() => setIsOpen(!isOpen)}
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
						onOpenAutoFocus={(_e) => {
							// Allow auto-focus but prevent it from closing the popover
							console.log("🔍 PopoverContent onOpenAutoFocus");
						}}
						onCloseAutoFocus={(e) => e.preventDefault()}
						onEscapeKeyDown={(_e) => {
							console.log("🔍 Escape key pressed");
							setSearchValue("");
							closePopover();
						}}
						onPointerDownOutside={(e: any) => {
							// Completely prevent closing from outside pointer events
							e.preventDefault();
						}}
						onInteractOutside={(e: any) => {
							// Completely prevent closing from outside interactions
							e.preventDefault();
						}}
					>
						<Command
							shouldFilter={false}
							onMouseEnter={(e) => {
								// Prevent hover events from closing popover
								e.preventDefault();
								e.stopPropagation();
							}}
							onMouseMove={(e) => {
								// Prevent mouse move events from closing popover
								e.preventDefault();
								e.stopPropagation();
							}}
						>
							<CommandInput
								placeholder="Search by name or phone..."
								className="text-sm"
								value={searchValue}
								onValueChange={(value) => {
									console.log("🔍 CommandInput onValueChange:", value);
									setSearchValue(value);
								}}
								onFocus={(_e) => {
									console.log("🔍 CommandInput focused");
								}}
								onKeyDown={(e) => {
									console.log("🔍 CommandInput keyDown:", e.key);
									// Don't prevent default - allow normal typing
								}}
								onMouseEnter={(e) => {
									// Prevent hover from closing popover but allow focus
									e.stopPropagation();
								}}
								onMouseMove={(e) => {
									// Prevent mouse move from closing popover
									e.stopPropagation();
								}}
							/>
							<CommandList
								onMouseDown={(e) => {
									// Only prevent if not clicking on a CommandItem
									if (!(e.target as HTMLElement).closest("[data-value]")) {
										e.preventDefault();
										e.stopPropagation();
									}
								}}
								onPointerDown={(e) => {
									// Only prevent if not clicking on a CommandItem
									if (!(e.target as HTMLElement).closest("[data-value]")) {
										e.preventDefault();
										e.stopPropagation();
									}
								}}
							>
								<ThemedScrollbar
									className="h-72 scrollbar-thin chat-scrollbar"
								>
									<div
										onPointerDown={(e: React.PointerEvent) => {
											// Prevent popover from closing when interacting with scrollbar
											e.stopPropagation();
											e.preventDefault();
										}}
										onMouseDown={(e: React.MouseEvent) => {
											// Also handle mouse events for better compatibility
											e.stopPropagation();
											e.preventDefault();
										}}
										className="h-full"
									>
										<CommandEmpty
										className="text-xs py-2 text-center"
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
									>
										No customers found
									</CommandEmpty>
									<CommandGroup>
										{filteredOptions.map((option) => (
											<CommandItem
												key={option.value}
												value={option.value}
												data-value={option.value}
												onSelect={handleCustomerSelectByValue}
												onPointerDown={(e) => {
													e.preventDefault();
													handleCustomerSelectDirect(option);
												}}
												onMouseEnter={(e) => {
													// Prevent hover from closing popover
													e.preventDefault();
													e.stopPropagation();
												}}
												onMouseMove={(e) => {
													// Prevent mouse move from closing popover
													e.preventDefault();
													e.stopPropagation();
												}}
												className={cn(
													"text-sm py-1.5 cursor-pointer",
													selectedOption?.value === option.value &&
														"ring-1 ring-primary ring-offset-1",
												)}
											>
												<div className="flex items-center justify-between w-full">
													<div className="flex items-center gap-2 flex-1 min-w-0">
														<span className="truncate">{option.label}</span>
													</div>
												</div>
											</CommandItem>
										))}

										{canAddNewCustomer && (
											<CommandItem
												key="add-new-customer"
												value={`add-new-${searchValue}`}
												data-value={`add-new-${searchValue}`}
												onSelect={() => {
													console.log("🔍 New customer onSelect triggered");
													handleAddNewCustomer();
												}}
												onPointerDown={(e) => {
													console.log(
														"🔍 New customer onPointerDown triggered",
													);
													e.preventDefault();
													handleAddNewCustomer();
												}}
												onClick={(e) => {
													console.log("🔍 New customer onClick triggered");
													e.preventDefault();
													e.stopPropagation();
													handleAddNewCustomer();
												}}
												onMouseEnter={(e) => {
													// Prevent hover from closing popover
													e.preventDefault();
													e.stopPropagation();
												}}
												onMouseMove={(e) => {
													// Prevent mouse move from closing popover
													e.preventDefault();
													e.stopPropagation();
												}}
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
