import { useCustomerData } from "@shared/libs/data/customer-data-context";
import React from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";
import GridPhoneCombobox from "@/shared/libs/data-grid/components/ui/grid-phone-combobox";

// Format phone number for display
const formatPhoneForDisplay = (phoneNumber: string): string => {
	if (!phoneNumber) {
		return "";
	}

	// Ensure it starts with +
	let formattedNumber = phoneNumber;
	if (!phoneNumber.startsWith("+")) {
		formattedNumber = `+${phoneNumber}`;
	}

	try {
		const parsed = parsePhoneNumber(formattedNumber);
		if (parsed) {
			// Return formatted international number
			return parsed.formatInternational();
		}
	} catch {
		// Return as-is if parsing fails
		return formattedNumber;
	}

	return formattedNumber;
};

type PhoneCellEditorProps = {
	value: string;
	onChange: (value: string) => void;
	onFinishedEditing: (save: boolean) => void;
};

const PhoneCellEditor: React.FC<PhoneCellEditorProps> = ({
	value,
	onChange,
	onFinishedEditing: _onFinishedEditing,
}) => {
	// Ensure a sensible default when starting to edit a new/empty cell: '+966 '
	const hasInitializedRef = React.useRef(false);
	React.useEffect(() => {
		if (hasInitializedRef.current) {
			return;
		}
		const initial = String(value || "");
		if (initial.trim() === "") {
			onChange("+966 ");
		}
		hasInitializedRef.current = true;
	}, [value, onChange]);
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

			return {
				number: formattedPhone,
				name: customer.name || "Unknown Customer",
				country,
				label: country,
				id: customer.id,
			};
		});
	}, [customers]);

	// Prevent hydration mismatch and show loading state
	if (loading) {
		return (
			<div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
				<span className="text-muted-foreground">Loading customers...</span>
			</div>
		);
	}

	return (
		<div
			className="glide-data-grid-overlay-editor flex flex-col"
			dir="ltr"
			style={{ direction: "ltr" }}
		>
			<GridPhoneCombobox
				allowCreateNew={true}
				onChange={onChange}
				phoneOptions={phoneOptions}
				value={value}
			/>
		</div>
	);
};

export { PhoneCellEditor };
