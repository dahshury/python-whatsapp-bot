import * as React from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import {
	PhoneCombobox,
	type PhoneOption,
} from "@/components/ui/phone-combobox";
import { useCustomerData } from "@/lib/customer-data-context";
import { DEFAULT_DOCUMENT_WA_ID } from "@/lib/default-document";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";

// Format phone number for display
const formatPhoneForDisplay = (phoneNumber: string): string => {
	if (!phoneNumber) return "";

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

interface PhoneCellEditorProps {
	value: string;
	onChange: (value: string) => void;
	onFinishedEditing: (save: boolean) => void;
	onCustomerSelect?: (phone: string, customerName: string) => void;
}

const PhoneCellEditor: React.FC<PhoneCellEditorProps> = ({
	value,
	onChange,
	onFinishedEditing: _onFinishedEditing,
	onCustomerSelect,
}) => {
	// Ensure a sensible default when starting to edit a new/empty cell: '+966 '
	const hasInitializedRef = React.useRef(false);
	React.useEffect(() => {
		if (hasInitializedRef.current) return;
		const initial = String(value || "");
		if (initial.trim() === "") {
			onChange("+966 ");
		}
		hasInitializedRef.current = true;
	}, [value, onChange]);
	// Get real customer data
	const { customers, loading } = useCustomerData();
	const { isLocalized } = useLanguage();

	// Create phone options from real customer data
	const phoneOptions: PhoneOption[] = React.useMemo(() => {
		const base = customers.map((customer) => {
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
				country: country,
				label: country,
				id: customer.id,
			};
		});

		// Only show synthetic Default option on the documents page grid
		const onDocumentsPage =
			typeof window !== "undefined" &&
			String(window?.location?.pathname || "").startsWith("/documents");
		if (onDocumentsPage) {
			const defaultOption: PhoneOption = {
				number: `+${DEFAULT_DOCUMENT_WA_ID}`,
				name: i18n.getMessage("default_contact", isLocalized),
				country: "US",
				label: i18n.getMessage("default_contact", isLocalized),
				id: DEFAULT_DOCUMENT_WA_ID,
			};
			return [defaultOption, ...base];
		}
		return base;
	}, [customers, isLocalized]);

	// Prevent hydration mismatch and show loading state
	if (loading) {
		return (
			<div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
				<span className="text-muted-foreground">Loading customers...</span>
			</div>
		);
	}

	const handleCustomerSelect = (phone: string, customerName: string) => {
		if (onCustomerSelect) {
			onCustomerSelect(phone, customerName);
		}
	};

	return (
		<div className="flex flex-col glide-data-grid-overlay-editor">
			<PhoneCombobox
				value={value}
				onChange={onChange}
				onCustomerSelect={handleCustomerSelect}
				placeholder="Select a phone number"
				phoneOptions={phoneOptions}
				allowCreateNew={true}
			/>
		</div>
	);
};

export { PhoneCellEditor };
