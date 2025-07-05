import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import { parsePhoneNumber } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
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
import { StablePopoverButton } from "@/components/ui/stable-popover-button";
import { cn } from "@/lib/utils";
import { PhoneConversationCombobox } from "../PhoneConversationCombobox";

type PhoneInputProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"onChange" | "value"
> &
	Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
		onChange?: (value: RPNInput.Value) => void;
		onCustomerSelect?: (phone: string, customerName?: string) => void;
	};

// Define props for the internal InputComponent to improve type safety and clarity
type InputComponentProps = React.ComponentProps<"input"> & {
	onCustomerSelect?: (phone: string, customerName?: string) => void;
	mainOnChange?: (value: RPNInput.Value) => void;
};

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
	React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
		({ className, onChange, onCustomerSelect, value, ...props }, ref) => {
			const parsedValue = (value as string) || "";

			return (
				<RPNInput.default
					ref={ref}
					className={cn("flex h-full items-center", className)}
					flagComponent={FlagComponent}
					countrySelectComponent={CountrySelect}
					// Pass the main onChange handler down to the custom input component
					inputComponent={(inputProps) => (
						<InputComponent
							{...inputProps}
							onCustomerSelect={onCustomerSelect}
							mainOnChange={onChange}
						/>
					)}
					smartCaret
					value={parsedValue as RPNInput.Value}
					onChange={(value) => {
						// This handles changes from the library itself (e.g., country select)
						console.log("PhoneInput (library) onChange called with:", value);
						onChange?.(value || ("" as RPNInput.Value));
					}}
					{...props}
				/>
			);
		},
	);
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<HTMLButtonElement, InputComponentProps>(
	(
		{
			className,
			onCustomerSelect,
			onChange,
			onBlur,
			onKeyDown,
			value,
			placeholder,
			disabled,
			mainOnChange,
			...props
		},
		ref,
	) => {
		const handleCustomerChange = (phone: string, customerName?: string) => {
			console.log("handleCustomerChange called with:", phone, customerName);

			// If an existing customer is selected, fire the onCustomerSelect event for name autofill
			if (onCustomerSelect && customerName !== undefined) {
				console.log(
					"Calling onCustomerSelect for existing customer:",
					phone,
					customerName,
				);
				onCustomerSelect(phone, customerName);
			}
			// If a new number is added (no customer name), fire the main component's onChange directly
			else if (mainOnChange) {
				console.log("Calling mainOnChange for new number:", phone);

				// Parse phone to E.164 format before passing to react-phone-number-input
				try {
					const parsedPhone = parsePhoneNumber(phone, "SA"); // Default to Saudi Arabia
					const e164Phone = parsedPhone?.number || phone;
					console.log("Parsed phone to E.164:", e164Phone);
					mainOnChange(e164Phone as RPNInput.Value);
				} catch (_error) {
					console.log("Failed to parse phone, using raw value:", phone);
					mainOnChange(phone as RPNInput.Value);
				}
			}
		};

		// These handlers are still needed to pass blurring and keydown events to the grid
		const handleBlur = () => {
			if (onBlur) {
				const mockEvent = {
					target: { value: value || "" },
					currentTarget: { value: value || "" },
				} as any;
				onBlur(mockEvent);
			}
		};

		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (onKeyDown) {
				const mockEvent = {
					...e,
					target: { value: value || "" },
					currentTarget: { value: value || "" },
				} as any;
				onKeyDown(mockEvent);
			}
		};

		return (
			<PhoneConversationCombobox
				ref={ref}
				value={(value as string) || ""}
				onChange={handleCustomerChange}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled}
				className={cn(
					"rounded-e-lg rounded-s-none h-full py-0 px-2 text-sm",
					className,
				)}
			/>
		);
	},
);
InputComponent.displayName = "InputComponent";

type CountrySelectOption = {
	label: string;
	value: RPNInput.Country;
};

type CountrySelectProps = {
	disabled?: boolean;
	value: RPNInput.Country;
	onChange: (value: RPNInput.Country) => void;
	options: CountrySelectOption[];
};

const CountrySelect = ({
	disabled,
	value: selectedCountry,
	options: countryList,
	onChange,
}: CountrySelectProps) => {
	const [open, setOpen] = React.useState(false);

	const handleCountryChange = (country: RPNInput.Country) => {
		onChange(country);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<StablePopoverButton
					type="button"
					variant="ghost"
					size="sm"
					className="flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-1 h-full py-0 focus:z-10 items-center justify-center"
					style={{
						height: "100%",
						minHeight: "28px",
						minWidth: "50px",
						lineHeight: "28px",
						fontSize: "13px",
					}}
					disabled={disabled}
				>
					<FlagComponent
						country={selectedCountry}
						countryName={selectedCountry}
					/>
					<ChevronsUpDown
						className={cn(
							"-mr-2 size-4 opacity-50",
							disabled ? "hidden" : "opacity-100",
						)}
					/>
				</StablePopoverButton>
			</PopoverTrigger>
			<PopoverContent
				className="w-[210px] p-0 overflow-hidden"
				align="start"
				side="bottom"
				sideOffset={4}
				collisionPadding={10}
				avoidCollisions={true}
				style={{
					borderRadius: "0.5rem",
					boxShadow:
						"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
					maxHeight: "300px",
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
				onInteractOutside={(e) => {
					// Check if the interaction is with the scrollbar
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
				<Command>
					<CommandInput placeholder="Search country..." />
					<CommandList>
						<ThemedScrollbar
							className="h-72 scrollbar-thin phone-dropdown-scrollbar"
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
							>
								<CommandEmpty>No country found.</CommandEmpty>
								<CommandGroup>
									{countryList.map(({ value, label }) =>
										value ? (
											<CountrySelectOption
												key={value}
												country={value}
												countryName={label}
												selectedCountry={selectedCountry}
												onChange={handleCountryChange}
											/>
										) : null,
									)}
								</CommandGroup>
							</div>
						</ThemedScrollbar>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

type CountrySelectOptionProps = {
	country: RPNInput.Country;
	countryName: string;
	selectedCountry: RPNInput.Country;
	onChange: (value: RPNInput.Country) => void;
};

const CountrySelectOption = ({
	country,
	countryName,
	selectedCountry,
	onChange,
}: CountrySelectOptionProps) => {
	return (
		<CommandItem
			// cmdk will use this value for filtering
			value={countryName}
			onSelect={() => onChange(country)}
			onPointerDown={(e) => {
				// Ensure selection works on mouse down before cmdk closes popover
				e.preventDefault();
				onChange(country);
			}}
			className="flex items-center gap-2 w-full cursor-pointer px-2 py-1.5 text-sm"
		>
			<FlagComponent country={country} countryName={countryName} />
			<span className="flex-1 text-sm">{countryName}</span>
			<span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
			<CheckIcon
				className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
			/>
		</CommandItem>
	);
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
	const Flag = flags[country];

	return (
		<span className="flex h-3.5 w-5 overflow-hidden rounded-sm bg-foreground/20 [&_svg]:size-full">
			{Flag && <Flag title={countryName} />}
		</span>
	);
};

export { PhoneInput };
