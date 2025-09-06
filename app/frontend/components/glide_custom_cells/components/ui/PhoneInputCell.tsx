import * as React from "react";
import type { Country } from "react-phone-number-input";
import {
	getCountryCallingCode,
	parsePhoneNumber,
} from "react-phone-number-input";
import {
	PhoneCombobox,
	type PhoneOption,
} from "@/components/ui/phone-combobox";
import { useCustomerData } from "@/lib/customer-data-context";
import { cn } from "@/lib/utils";

// Format phone number for display
const formatPhoneForDisplay = (phoneNumber: string): string => {
	if (!phoneNumber) return "";

	// Ensure it starts with +
	if (!phoneNumber.startsWith("+")) {
		phoneNumber = `+${phoneNumber}`;
	}

	try {
		const parsed = parsePhoneNumber(phoneNumber);
		if (parsed) {
			// Return formatted international number
			return parsed.formatInternational();
		}
	} catch {
		// Return as-is if parsing fails
		return phoneNumber;
	}

	return phoneNumber;
};

type PhoneInputCellProps = {
	value?: string;
	onChange?: (value: string) => void;
	className?: string;
	placeholder?: string;
	// New prop to control behavior
	uncontrolled?: boolean;
	onCustomerSelect?: (phone: string, customerName: string) => void;
};

const PhoneInputCell: React.ForwardRefExoticComponent<PhoneInputCellProps> =
	React.forwardRef<HTMLDivElement, PhoneInputCellProps>(
		(
			{
				className,
				onChange,
				value,
				placeholder = "Select a phone number",
				uncontrolled = false,
				onCustomerSelect,
				...props
			}: PhoneInputCellProps,
			ref,
		) => {
			// Get real customer data
			const { customers, loading } = useCustomerData();

			// Create phone options from real customer data
			const phoneOptions: PhoneOption[] = React.useMemo(() => {
				return customers.map((customer) => {
					const phoneNumber = customer.phone || customer.id;
					const formattedPhone = formatPhoneForDisplay(phoneNumber);

					// Extract country from the formatted phone number (with + prefix)
					let country = "US"; // default
					try {
						const parsed = parsePhoneNumber(formattedPhone);
						country = parsed?.country || "US";
					} catch {
						// Keep default
					}

					const callingCode = getCountryCallingCode(country as Country) || "1";
					return {
						number: formattedPhone,
						name: customer.name || "Unknown Customer",
						country: country,
						label: `${country} (+${callingCode})`,
						id: customer.id,
					};
				});
			}, [customers]);

			// Prevent hydration mismatch and show loading state
			if (loading) {
				return (
					<div
						ref={ref}
						className={cn(
							"flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
							className,
						)}
						{...props}
					>
						<span className="text-muted-foreground">Loading customers...</span>
					</div>
				);
			}

			return (
				<div ref={ref} className={cn("", className)} {...props}>
					<PhoneCombobox
						value={value}
						onChange={onChange}
						onCustomerSelect={onCustomerSelect}
						placeholder={placeholder}
						phoneOptions={phoneOptions}
						allowCreateNew={true}
						uncontrolled={uncontrolled}
					/>
				</div>
			);
		},
	);
PhoneInputCell.displayName = "PhoneInputCell";

export { PhoneInputCell };
